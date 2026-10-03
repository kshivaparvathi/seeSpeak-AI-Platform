import sqlite3
import os
import uuid
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List

from backend.utils.logging import logger

DB_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "see_speak.db")

class UserRepository:
    def __init__(self, db_path: str = DB_FILE):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def _init_db(self):
        """Initializes SQLite tables for users, email verifications, password resets, and sessions."""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        with self._get_connection() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    full_name TEXT NOT NULL,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    email_verified INTEGER DEFAULT 0,
                    account_status TEXT DEFAULT 'active',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    last_login_at TEXT
                );

                CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
                CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

                CREATE TABLE IF NOT EXISTS email_verifications (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    email TEXT NOT NULL,
                    otp_hash TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    attempts INTEGER DEFAULT 0,
                    is_used INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_email_verif_user ON email_verifications(user_id);
                CREATE INDEX IF NOT EXISTS idx_email_verif_email ON email_verifications(email);

                CREATE TABLE IF NOT EXISTS password_resets (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    email TEXT NOT NULL,
                    token_hash TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    is_used INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_pwd_resets_user ON password_resets(user_id);
                CREATE INDEX IF NOT EXISTS idx_pwd_resets_token ON password_resets(token_hash);

                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    ip_address TEXT DEFAULT '',
                    user_agent TEXT DEFAULT '',
                    expires_at TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    last_active_at TEXT NOT NULL,
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
            """)

            # Ensure user_id column exists on existing data tables for user isolation
            self._ensure_user_id_column(conn, "conversations")
            self._ensure_user_id_column(conn, "conversation_files")
            self._ensure_user_id_column(conn, "interview_sessions")
            self._ensure_user_id_column(conn, "resume_projects")
            self._ensure_user_id_column(conn, "presentation_projects")

    def _ensure_user_id_column(self, conn: sqlite3.Connection, table_name: str):
        try:
            cursor = conn.cursor()
            cursor.execute(f"PRAGMA table_info({table_name});")
            cols = [row["name"] for row in cursor.fetchall()]
            if cols and "user_id" not in cols:
                cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN user_id TEXT DEFAULT '';")
                cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_user_id ON {table_name}(user_id);")
                logger.info(f"Added user_id column to {table_name} table for user isolation")
        except Exception as e:
            logger.warning(f"Could not verify user_id column for {table_name}: {e}")

    # ========================================================
    # USER CRUD & LOOKUPS
    # ========================================================
    def create_user(
        self,
        full_name: str,
        username: str,
        email: str,
        password_hash: str,
        email_verified: bool = True
    ) -> Dict[str, Any]:
        user_id = f"usr_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()
        clean_email = email.strip().lower()
        clean_username = username.strip().lower()

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO users (
                    id, full_name, username, email, password_hash,
                    email_verified, account_status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
            """, (
                user_id,
                full_name.strip(),
                clean_username,
                clean_email,
                password_hash,
                1 if email_verified else 0,
                now,
                now
            ))
            conn.commit()

        return self.get_user_by_id(user_id) # type: ignore

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            if not row:
                return None
            res = dict(row)
            res["email_verified"] = bool(res.get("email_verified", 0))
            return res

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        clean_email = email.strip().lower()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (clean_email,))
            row = cursor.fetchone()
            if not row:
                return None
            res = dict(row)
            res["email_verified"] = bool(res.get("email_verified", 0))
            return res

    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        clean_username = username.strip().lower()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE LOWER(username) = LOWER(?)", (clean_username,))
            row = cursor.fetchone()
            if not row:
                return None
            res = dict(row)
            res["email_verified"] = bool(res.get("email_verified", 0))
            return res

    def mark_email_verified(self, user_id: str) -> bool:
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?",
                (now, user_id)
            )
            conn.commit()
            return cursor.rowcount > 0

    def update_password(self, user_id: str, new_password_hash: str) -> bool:
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
                (new_password_hash, now, user_id)
            )
            conn.commit()
            return cursor.rowcount > 0

    def record_login(self, user_id: str) -> bool:
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?",
                (now, now, user_id)
            )
            conn.commit()
            return cursor.rowcount > 0

    def delete_user(self, user_id: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
            conn.commit()
            return cursor.rowcount > 0

    # ========================================================
    # EMAIL VERIFICATION OTP STORAGE
    # ========================================================
    def create_email_verification_otp(
        self,
        user_id: str,
        email: str,
        otp_hash: str,
        expires_at: str
    ) -> Dict[str, Any]:
        verif_id = f"v_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()

        with self._get_connection() as conn:
            cursor = conn.cursor()
            # Invalidate older pending OTPs for this user
            cursor.execute(
                "UPDATE email_verifications SET is_used = 1 WHERE user_id = ? AND is_used = 0",
                (user_id,)
            )
            cursor.execute("""
                INSERT INTO email_verifications (
                    id, user_id, email, otp_hash, expires_at, attempts, is_used, created_at
                ) VALUES (?, ?, ?, ?, ?, 0, 0, ?)
            """, (
                verif_id,
                user_id,
                email.strip().lower(),
                otp_hash,
                expires_at,
                now
            ))
            conn.commit()

        return {
            "id": verif_id,
            "user_id": user_id,
            "email": email,
            "expires_at": expires_at,
            "created_at": now
        }

    def get_latest_email_verification(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM email_verifications
                WHERE user_id = ? AND is_used = 0
                ORDER BY created_at DESC LIMIT 1
            """, (user_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def increment_otp_attempts(self, verif_id: str) -> int:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE email_verifications SET attempts = attempts + 1 WHERE id = ?",
                (verif_id,)
            )
            conn.commit()
            cursor.execute("SELECT attempts FROM email_verifications WHERE id = ?", (verif_id,))
            row = cursor.fetchone()
            return row["attempts"] if row else 0

    def mark_otp_used(self, verif_id: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE email_verifications SET is_used = 1 WHERE id = ?", (verif_id,))
            conn.commit()
            return cursor.rowcount > 0

    # ========================================================
    # PASSWORD RESET TOKEN STORAGE
    # ========================================================
    def create_password_reset_token(
        self,
        user_id: str,
        email: str,
        token_hash: str,
        expires_at: str
    ) -> Dict[str, Any]:
        reset_id = f"rst_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE password_resets SET is_used = 1 WHERE user_id = ? AND is_used = 0",
                (user_id,)
            )
            cursor.execute("""
                INSERT INTO password_resets (
                    id, user_id, email, token_hash, expires_at, is_used, created_at
                ) VALUES (?, ?, ?, ?, ?, 0, ?)
            """, (
                reset_id,
                user_id,
                email.strip().lower(),
                token_hash,
                expires_at,
                now
            ))
            conn.commit()

        return {
            "id": reset_id,
            "user_id": user_id,
            "email": email,
            "expires_at": expires_at,
            "created_at": now
        }

    def get_password_reset_by_hash(self, token_hash: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM password_resets
                WHERE token_hash = ? AND is_used = 0
                ORDER BY created_at DESC LIMIT 1
            """, (token_hash,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def mark_reset_token_used(self, reset_id: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE password_resets SET is_used = 1 WHERE id = ?", (reset_id,))
            conn.commit()
            return cursor.rowcount > 0

    def create_email_verification(
        self,
        user_id: str,
        otp_hash: str,
        expires_minutes: int = 10,
        email: str = ""
    ) -> Dict[str, Any]:
        if not email:
            u = self.get_user_by_id(user_id)
            email = u["email"] if u else ""
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)).isoformat()
        return self.create_email_verification_otp(user_id, email, otp_hash, expires_at)

    def increment_email_verification_attempts(self, verif_id: str) -> int:
        return self.increment_otp_attempts(verif_id)

    def mark_email_verification_used(self, verif_id: str) -> bool:
        return self.mark_otp_used(verif_id)

    def invalidate_previous_verifications(self, user_id: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE email_verifications SET is_used = 1 WHERE user_id = ? AND is_used = 0",
                (user_id,)
            )
            conn.commit()
            return cursor.rowcount > 0

    def create_password_reset(
        self,
        user_id: str,
        token_hash: str,
        expires_minutes: int = 15,
        email: str = ""
    ) -> Dict[str, Any]:
        if not email:
            u = self.get_user_by_id(user_id)
            email = u["email"] if u else ""
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)).isoformat()
        return self.create_password_reset_token(user_id, email, token_hash, expires_at)

    def get_valid_password_reset(self, token_hash: str) -> Optional[Dict[str, Any]]:
        record = self.get_password_reset_by_hash(token_hash)
        if not record:
            return None
        # Check expiration
        try:
            exp_dt = datetime.fromisoformat(record["expires_at"].replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > exp_dt:
                return None
        except Exception:
            pass
        return record

    def mark_password_reset_used(self, reset_id: str) -> bool:
        return self.mark_reset_token_used(reset_id)

    def update_account_status(self, user_id: str, status: str) -> bool:
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE users SET account_status = ?, updated_at = ? WHERE id = ?",
                (status, now, user_id)
            )
            conn.commit()
            return cursor.rowcount > 0

    def update_user_profile(self, user_id: str, updates: Dict[str, Any]) -> bool:
        allowed = {"full_name", "avatar_url"}
        filtered = {k: v for k, v in updates.items() if k in allowed}
        if not filtered:
            return False
        now = datetime.now(timezone.utc).isoformat()
        set_clauses = [f"{k} = ?" for k in filtered.keys()]
        set_clauses.append("updated_at = ?")
        params = list(filtered.values()) + [now, user_id]

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                f"UPDATE users SET {', '.join(set_clauses)} WHERE id = ?",
                params
            )
            conn.commit()
            return cursor.rowcount > 0

    # ========================================================
    # SESSIONS STORAGE (SERVER-SIDE SESSIONS & JWT TRACKING)
    # ========================================================
    def create_session(
        self,
        user_id: str,
        session_id: Optional[str] = None,
        expires_at: Optional[str] = None,
        ip_address: str = "",
        user_agent: str = ""
    ) -> Dict[str, Any]:
        sid = session_id or f"sess_{uuid.uuid4().hex}"
        now = datetime.now(timezone.utc)
        exp = expires_at or (now + timedelta(days=7)).isoformat()
        now_iso = now.isoformat()

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO sessions (
                    id, user_id, ip_address, user_agent, expires_at, created_at, last_active_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                sid,
                user_id,
                ip_address,
                user_agent,
                exp,
                now_iso,
                now_iso
            ))
            conn.commit()

        return {
            "id": sid,
            "user_id": user_id,
            "expires_at": exp,
            "created_at": now_iso
        }

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def touch_session(self, session_id: str) -> bool:
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE sessions SET last_active_at = ? WHERE id = ?",
                (now, session_id)
            )
            conn.commit()
            return cursor.rowcount > 0

    def revoke_session(self, session_id: str) -> bool:
        return self.delete_session(session_id)

    def revoke_all_user_sessions(self, user_id: str) -> bool:
        return self.delete_all_user_sessions(user_id)

    def delete_session(self, session_id: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
            conn.commit()
            return cursor.rowcount > 0

    def delete_all_user_sessions(self, user_id: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
            conn.commit()
            return cursor.rowcount > 0

user_repository = UserRepository()

