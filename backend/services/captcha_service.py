import io
import os
import time
import uuid
import random
import hashlib
import sqlite3
from typing import Dict, Tuple, Optional
from PIL import Image, ImageDraw, ImageFont
from backend.utils.logging import logger

# Unambiguous characters (avoiding easily confused pairs: 0/O, 1/I/L)
CAPTCHA_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
CAPTCHA_SALT = os.environ.get("CAPTCHA_SALT", "seespeak-captcha-secure-salt-2026")
EXPIRY_SECONDS = 300  # 5 minutes
MAX_ATTEMPTS = 3

DB_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "see_speak.db")

# Find a suitable TTF font
FONT_CANDIDATES = [
    "C:/Windows/Fonts/arial.ttf",
    "C:/Windows/Fonts/calibri.ttf",
    "C:/Windows/Fonts/segoeui.ttf",
    "C:/Windows/Fonts/tahoma.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
]

CHOSEN_FONT_PATH = None
for path in FONT_CANDIDATES:
    if os.path.exists(path):
        CHOSEN_FONT_PATH = path
        break


class CaptchaStore:
    """Persistent SQLite-backed store for CAPTCHA challenges with TTL expiration."""
    def __init__(self, db_path: str = DB_FILE):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS captchas (
                    id TEXT PRIMARY KEY,
                    hash TEXT NOT NULL,
                    expires_at REAL NOT NULL,
                    attempts INTEGER DEFAULT 0
                );
            """)

    def _purge_expired(self):
        try:
            with self._get_connection() as conn:
                conn.execute("DELETE FROM captchas WHERE expires_at < ?;", (time.time(),))
        except Exception:
            pass

    def save(self, captcha_id: str, hashed_code: str):
        self._purge_expired()
        with self._get_connection() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO captchas (id, hash, expires_at, attempts) VALUES (?, ?, ?, 0);",
                (captcha_id, hashed_code, time.time() + EXPIRY_SECONDS)
            )

    def verify(self, captcha_id: str, user_code: str) -> Tuple[bool, str]:
        self._purge_expired()
        with self._get_connection() as conn:
            row = conn.execute("SELECT * FROM captchas WHERE id = ?;", (captcha_id,)).fetchone()
            if not row:
                return False, "CAPTCHA challenge has expired or is invalid. Please refresh the code."

            if row["expires_at"] < time.time():
                conn.execute("DELETE FROM captchas WHERE id = ?;", (captcha_id,))
                return False, "CAPTCHA code has expired. Please click refresh to generate a new code."

            attempts = row["attempts"] + 1
            if attempts > MAX_ATTEMPTS:
                conn.execute("DELETE FROM captchas WHERE id = ?;", (captcha_id,))
                return False, "Too many failed attempts. Please click refresh to generate a new code."

            expected_hash = hashlib.sha256((user_code.strip().upper() + CAPTCHA_SALT).encode("utf-8")).hexdigest()
            if expected_hash == row["hash"]:
                # Single-use: immediately delete on success
                conn.execute("DELETE FROM captchas WHERE id = ?;", (captcha_id,))
                return True, "Valid"

            conn.execute("UPDATE captchas SET attempts = ? WHERE id = ?;", (attempts, captcha_id))
            remaining = MAX_ATTEMPTS - attempts
            return False, f"Incorrect CAPTCHA code. {remaining} attempt(s) remaining."

    def invalidate(self, captcha_id: str):
        with self._get_connection() as conn:
            conn.execute("DELETE FROM captchas WHERE id = ?;", (captcha_id,))


class CaptchaService:
    def __init__(self):
        self.store = CaptchaStore()

    def _hash_code(self, code: str) -> str:
        return hashlib.sha256((code.strip().upper() + CAPTCHA_SALT).encode("utf-8")).hexdigest()

    def generate_challenge(self) -> Dict[str, str]:
        """
        Generates a new visual CAPTCHA challenge.
        Returns a dict with 'captcha_id' and 'captcha_image' (data URL).
        The plain text code is NEVER exposed to the client.
        """
        # 1. Pick 5 clean characters
        code = "".join(random.choice(CAPTCHA_CHARS) for _ in range(5))
        captcha_id = str(uuid.uuid4())

        # 2. Store hashed code in SQLite
        self.store.save(captcha_id, self._hash_code(code))

        # 3. Render distorted image
        width, height = 150, 40
        # Light pastel background matching UI theme
        bg_r = random.randint(240, 248)
        bg_g = random.randint(244, 250)
        bg_b = random.randint(248, 255)
        image = Image.new("RGB", (width, height), color=(bg_r, bg_g, bg_b))
        draw = ImageDraw.Draw(image)

        # Draw background noise dots
        for _ in range(90):
            x = random.randint(0, width - 1)
            y = random.randint(0, height - 1)
            dot_color = (
                random.randint(180, 220),
                random.randint(180, 220),
                random.randint(190, 230),
            )
            draw.point((x, y), fill=dot_color)

        # Draw subtle curved noise lines
        for _ in range(2):
            x1 = random.randint(0, width // 4)
            y1 = random.randint(4, height - 4)
            x2 = random.randint(width * 3 // 4, width)
            y2 = random.randint(4, height - 4)
            line_color = (
                random.randint(160, 205),
                random.randint(165, 210),
                random.randint(185, 225),
            )
            draw.line([(x1, y1), (x2, y2)], fill=line_color, width=1)

        # Load font
        try:
            if CHOSEN_FONT_PATH:
                font = ImageFont.truetype(CHOSEN_FONT_PATH, 22)
            else:
                font = ImageFont.load_default()
        except Exception:
            font = ImageFont.load_default()

        # Render characters with individual rotation and color jitter
        char_spacing = width / (len(code) + 0.8)
        for i, ch in enumerate(code):
            # Create transparent tile for character rotation
            tile_size = 36
            char_tile = Image.new("RGBA", (tile_size, tile_size), (255, 255, 255, 0))
            tile_draw = ImageDraw.Draw(char_tile)

            # High-contrast slate/indigo colors for readability and aesthetics
            char_color = (
                random.randint(25, 60),
                random.randint(35, 75),
                random.randint(55, 110),
            )
            tile_draw.text((6, 2), ch, font=font, fill=char_color)

            # Slight rotation between -16 and +16 degrees
            angle = random.randint(-16, 16)
            rotated_tile = char_tile.rotate(angle, resample=Image.BICUBIC, expand=False)

            # Calculate position
            pos_x = int(8 + i * char_spacing)
            pos_y = random.randint(1, 5)
            image.paste(rotated_tile, (pos_x, pos_y), rotated_tile)

        # Draw subtle bounding border
        draw.rectangle([(0, 0), (width - 1, height - 1)], outline=(226, 232, 240), width=1)

        # 4. Convert to Base64 PNG data URL
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        buffer.seek(0)
        import base64
        b64_str = base64.b64encode(buffer.read()).decode("utf-8")
        data_url = f"data:image/png;base64,{b64_str}"

        return {
            "captcha_id": captcha_id,
            "captcha_image": data_url,
        }

    def verify_captcha(self, captcha_id: Optional[str], user_code: Optional[str]) -> Tuple[bool, str]:
        """Validates the user's typed CAPTCHA code against the challenge ID."""
        if not captcha_id or not user_code or not user_code.strip():
            return False, "Please enter the CAPTCHA security code shown."
        return self.store.verify(captcha_id, user_code.strip())


# Global singleton instance
captcha_service = CaptchaService()
