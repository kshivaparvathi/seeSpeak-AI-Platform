import os
import re
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Request, Response, status, Query
from pydantic import BaseModel, Field

from backend.repositories.user_repository import user_repository
from backend.services.auth_service import auth_service
from backend.services.captcha_service import captcha_service
from backend.middleware.auth_middleware import get_current_user, get_current_user_optional
from backend.utils.logging import logger

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_NAME = "seespeak_session"
COOKIE_MAX_AGE = 7 * 24 * 3600  # 7 days

USERNAME_REGEX = re.compile(r"^[a-zA-Z0-9_]{3,20}$")
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


# ========================================================
# Pydantic Schemas
# ========================================================

class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    username: str = Field(..., min_length=3, max_length=20)
    email: str = Field(..., min_length=5, max_length=120)
    password: str = Field(..., min_length=8, max_length=128)
    captcha_id: str
    captcha_code: str
    terms_accepted: bool = True

class VerifyEmailRequest(BaseModel):
    email: str
    otp: str = Field(..., min_length=6, max_length=6)

class ResendOtpRequest(BaseModel):
    email: str

class LoginRequest(BaseModel):
    identifier: str  # email or username
    password: str
    captcha_id: str
    captcha_code: str

class ForgotPasswordRequest(BaseModel):
    email: str
    captcha_id: str
    captcha_code: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


# ========================================================
# Endpoints
# ========================================================

@router.get("/captcha")
def get_captcha():
    """
    Generates a dynamic visual CAPTCHA challenge.
    Returns { captcha_id, captcha_image }. Plaintext is NEVER returned.
    """
    return captcha_service.generate_challenge()


@router.get("/config")
def get_auth_config():
    """Returns public authentication configuration."""
    return {
        "is_dev_mode": auth_service.is_dev_mode
    }


@router.get("/smtp-status")
def get_smtp_status():
    """
    Returns diagnostics on current SMTP configuration state.
    Does NOT expose password or secret credentials.
    """
    from backend.services.auth_service import get_smtp_config
    cfg = get_smtp_config()
    return {
        "configured": cfg["is_configured"],
        "host": cfg["host"],
        "port": cfg["port"],
        "username_set": bool(cfg["username"]),
        "from_address": cfg["email_from"],
        "use_ssl": cfg["use_ssl"],
        "status_message": (
            "SMTP is fully configured for real email delivery."
            if cfg["is_configured"]
            else "SMTP is NOT configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USERNAME, and SMTP_PASSWORD in .env.local"
        )
    }


@router.get("/check-username")
def check_username(username: str = Query(..., min_length=1, max_length=50)):
    """Live validation of username availability and formatting."""
    cleaned = username.strip()
    if not USERNAME_REGEX.match(cleaned):
        return {
            "valid": False,
            "available": False,
            "message": "Username must be 3-20 characters long and contain only letters, numbers, and underscores."
        }
    existing = user_repository.get_user_by_username(cleaned)
    if existing:
        return {
            "valid": True,
            "available": False,
            "message": "This username is already taken."
        }
    return {
        "valid": True,
        "available": True,
        "message": "Username is available."
    }


@router.post("/register")
async def register(req: RegisterRequest, request: Request, response: Response):
    """
    Registers a new user account with real backend visual CAPTCHA verification,
    bcrypt password hashing, immediate account activation, and auto-login session creation.
    No email verification / OTP required.
    """
    if not req.terms_accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must accept the Terms of Service and Privacy Policy to proceed."
        )

    # 1. Verify Real Visual CAPTCHA
    captcha_ok, err_msg = captcha_service.verify_captcha(req.captcha_id, req.captcha_code)
    if not captcha_ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg
        )

    # 2. Validate fields
    full_name = req.full_name.strip()
    username = req.username.strip()
    email = req.email.strip().lower()

    if not USERNAME_REGEX.match(username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be 3-20 characters and contain only letters, numbers, and underscores."
        )

    if not EMAIL_REGEX.match(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid email address."
        )

    if len(req.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )

    # 3. Uniqueness checks
    if user_repository.get_user_by_username(username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This username is already taken. Please choose another."
        )

    if user_repository.get_user_by_email(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please sign in instead."
        )

    # 4. Hash password with bcrypt (12 rounds)
    password_hash = auth_service.hash_password(req.password)

    # 5. Create user account immediately (verified and active)
    user = user_repository.create_user(
        full_name=full_name,
        username=username,
        email=email,
        password_hash=password_hash,
        email_verified=True
    )

    # 6. Establish authenticated session immediately (Auto-login)
    user_agent = request.headers.get("user-agent", "")
    ip = request.client.host if request.client else ""
    session = user_repository.create_session(user["id"], user_agent=user_agent, ip_address=ip)
    token = auth_service.create_session_token(user["id"], session["id"])
    user_repository.record_login(user["id"])

    # Set HTTP-only secure cookie
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/"
    )

    clean_user = user_repository.get_user_by_id(user["id"])
    logger.info(f"New user registered and authenticated: {username} ({email})")

    return {
        "status": "success",
        "message": "Account created successfully.",
        "user": clean_user
    }


@router.post("/verify-email")
async def verify_email(req: VerifyEmailRequest, request: Request, response: Response):
    """
    Verifies the 6-digit OTP sent to the user's email, marks the user verified,
    and establishes an active authenticated session.
    """
    email = req.email.strip().lower()
    otp = req.otp.strip()

    user = user_repository.get_user_by_email(email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found with the provided email."
        )

    if user.get("email_verified") == 1:
        # User already verified, issue session if not already logged in
        pass

    latest_verif = user_repository.get_latest_email_verification(user["id"])
    if not latest_verif:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verification request found. Please request a new code."
        )

    if latest_verif.get("attempts", 0) >= 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum verification attempts exceeded. Please request a new code."
        )

    # Increment attempts
    user_repository.increment_email_verification_attempts(latest_verif["id"])

    # Verify OTP against stored hash
    is_valid = auth_service.verify_otp(otp, latest_verif["otp_hash"])
    if not is_valid:
        remaining = 5 - (latest_verif.get("attempts", 0) + 1)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid verification code. {remaining} attempt(s) remaining."
        )

    # Mark OTP used and user verified
    user_repository.mark_email_verification_used(latest_verif["id"])
    user_repository.mark_email_verified(user["id"])
    user_repository.update_account_status(user["id"], "active")

    # Create session
    user_agent = request.headers.get("user-agent", "")
    ip = request.client.host if request.client else ""
    session = user_repository.create_session(user["id"], user_agent=user_agent, ip_address=ip)
    token = auth_service.create_session_token(user["id"], session["id"])

    # Set HTTP-only cookie
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=False,  # Set to True in HTTPS production; lax allows localhost dev
        path="/"
    )

    clean_user = user_repository.get_user_by_id(user["id"])
    logger.info(f"User email verified and session created: {user['username']}")

    return {
        "status": "success",
        "message": "Email verified successfully. Welcome to seeSpeak AI!",
        "user": clean_user
    }


@router.post("/resend-otp")
async def resend_otp(req: ResendOtpRequest):
    """
    Resends an email verification OTP with a 60-second rate-limiting cooldown.
    """
    email = req.email.strip().lower()
    user = user_repository.get_user_by_email(email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found with the provided email."
        )

    if user.get("email_verified") == 1:
        return {
            "status": "info",
            "message": "Email is already verified. You can sign in directly."
        }

    # Cooldown check: prevent spamming
    latest = user_repository.get_latest_email_verification(user["id"])
    if latest:
        from datetime import datetime, timezone
        created_str = latest.get("created_at")
        try:
            created_dt = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
            elapsed = (datetime.now(timezone.utc) - created_dt).total_seconds()
            if elapsed < 60:
                wait_sec = int(60 - elapsed)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Please wait {wait_sec} seconds before requesting another code."
                )
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e

    # Invalidate prior OTPs
    user_repository.invalidate_previous_verifications(user["id"])

    # Generate new OTP
    otp = auth_service.generate_otp()
    otp_hash = auth_service.hash_otp(otp)
    user_repository.create_email_verification(user["id"], otp_hash, expires_minutes=10)

    # Dispatch email (Real delivery check)
    email_ok, email_msg = await auth_service.send_verification_email(email, user.get("full_name", "User"), otp)
    if not email_ok:
        logger.error(f"[RESEND OTP FAILED] Could not send to {email}: {email_msg}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to deliver verification code to {email}. Reason: {email_msg}"
        )

    logger.info(f"Resent OTP delivered to {email}")

    return {
        "status": "success",
        "message": f"A new verification code has been sent to {email}."
    }


@router.post("/login")
async def login(req: LoginRequest, request: Request, response: Response):
    """
    Authenticates an existing user via email or username + password + visual CAPTCHA.
    Sets a secure HTTP-only session cookie.
    """
    # 1. Verify Real Visual CAPTCHA
    captcha_ok, err_msg = captcha_service.verify_captcha(req.captcha_id, req.captcha_code)
    if not captcha_ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg
        )

    identifier = req.identifier.strip()
    if "@" in identifier:
        user = user_repository.get_user_by_email(identifier)
    else:
        user = user_repository.get_user_by_username(identifier)

    if not user or not user.get("password_hash"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password."
        )

    # Verify password hash
    if not auth_service.verify_password(req.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password."
        )

    # Auto-verify any legacy unverified accounts on successful password authentication
    if not user.get("email_verified", 0):
        user_repository.mark_email_verified(user["id"])

    # Check account status
    if user.get("account_status") == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended. Please contact support."
        )

    # Create session
    user_agent = request.headers.get("user-agent", "")
    ip = request.client.host if request.client else ""
    session = user_repository.create_session(user["id"], user_agent=user_agent, ip_address=ip)
    token = auth_service.create_session_token(user["id"], session["id"])

    # Update last login
    user_repository.record_login(user["id"])

    # Set HTTP-only cookie
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/"
    )

    clean_user = user_repository.get_user_by_id(user["id"])
    logger.info(f"User signed in successfully: {clean_user['username']}")

    return {
        "status": "success",
        "message": "Signed in successfully.",
        "user": clean_user
    }


@router.get("/me")
def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Returns the authenticated user's profile. Fails with 401 if not authenticated."""
    return {
        "authenticated": True,
        "user": current_user
    }


@router.post("/logout")
def logout(
    response: Response,
    request: Request,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """
    Revokes the active session in DB, deletes the HTTP-only session cookie,
    and returns a success response.
    """
    token = request.cookies.get(COOKIE_NAME)
    if token:
        payload = auth_service.verify_session_token(token)
        if payload and "sid" in payload:
            user_repository.revoke_session(payload["sid"])

    response.delete_cookie(key=COOKIE_NAME, path="/")
    logger.info("User session revoked and cookie cleared")

    return {
        "status": "success",
        "message": "Signed out successfully."
    }


@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, request: Request):
    """
    Requests a password reset link/token. Verifies visual CAPTCHA.
    Prevents account enumeration by always returning a generic success message.
    """
    captcha_ok, err_msg = captcha_service.verify_captcha(req.captcha_id, req.captcha_code)
    if not captcha_ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg
        )

    email = req.email.strip().lower()
    user = user_repository.get_user_by_email(email)

    if user and user.get("email_verified"):
        token = auth_service.generate_reset_token()
        token_hash = auth_service.hash_token(token)
        user_repository.create_password_reset(user["id"], token_hash, expires_minutes=15)
        email_ok, email_msg = await auth_service.send_password_reset_email(email, user.get("full_name", "User"), token)
        if not email_ok:
            logger.error(f"[FORGOT PASSWORD FAILED] Could not send to {email}: {email_msg}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Could not deliver password reset email. Reason: {email_msg}"
            )
        logger.info(f"Password reset token generated and sent to {email}")

    return {
        "status": "success",
        "message": "If an active account exists with that email address, a password reset instructions link has been sent."
    }


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest):
    """
    Resets the user's password using a valid, unexpired reset token.
    Revokes all active sessions upon successful password reset.
    """
    if len(req.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )

    token_hash = auth_service.hash_token(req.token.strip())
    reset_record = user_repository.get_valid_password_reset(token_hash)
    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset link. Please request a new one."
        )

    user_id = reset_record["user_id"]
    new_hash = auth_service.hash_password(req.new_password)

    user_repository.update_password(user_id, new_hash)
    user_repository.mark_password_reset_used(reset_record["id"])
    user_repository.revoke_all_user_sessions(user_id)

    logger.info(f"Password reset successfully completed for user {user_id}")

    return {
        "status": "success",
        "message": "Your password has been reset successfully. Please sign in with your new password."
    }


@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Allows an authenticated user to change their password."""
    # Fetch user with password_hash
    full_user = user_repository.get_user_by_id(current_user["id"])
    # We need password_hash to verify
    with user_repository._get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT password_hash FROM users WHERE id = ?", (current_user["id"],))
        row = cursor.fetchone()
        stored_hash = row["password_hash"] if row else ""

    if not auth_service.verify_password(req.current_password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password does not match."
        )

    if len(req.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long."
        )

    new_hash = auth_service.hash_password(req.new_password)
    user_repository.update_password(current_user["id"], new_hash)

    return {
        "status": "success",
        "message": "Password updated successfully."
    }


@router.patch("/profile")
def update_profile(
    req: UpdateProfileRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Updates full name or avatar URL of the authenticated user."""
    updates = {}
    if req.full_name is not None and req.full_name.strip():
        updates["full_name"] = req.full_name.strip()
    if req.avatar_url is not None:
        updates["avatar_url"] = req.avatar_url.strip()

    if updates:
        user_repository.update_user_profile(current_user["id"], updates)

    updated_user = user_repository.get_user_by_id(current_user["id"])
    return {
        "status": "success",
        "user": updated_user
    }


# ========================================================
# Development Helper: Retrieve Last OTP for Automated Verification
# ========================================================

@router.get("/dev-last-otp")
def dev_get_last_otp(email: str = Query(...)):
    """
    Local testing endpoint to retrieve the OTP from local mailbox
    for automated test execution without hardcoding OTPs in code.
    Only available in development mode.
    """
    if not auth_service.is_dev_mode:
        raise HTTPException(status_code=404, detail="Not available")

    import json
    mailbox_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dev_mailbox.json")
    if os.path.exists(mailbox_path):
        try:
            with open(mailbox_path, "r", encoding="utf-8") as f:
                emails = json.load(f)
            for item in reversed(emails):
                if item.get("to") == email.strip().lower():
                    return {
                        "to": email,
                        "otp": item.get("otp") or item.get("code"),
                        "subject": item.get("subject"),
                        "timestamp": item.get("sent_at") or item.get("timestamp")
                    }
        except Exception:
            pass

    raise HTTPException(status_code=404, detail="No email found in dev mailbox")
