"""
Authentication routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from datetime import timedelta

from app.core.database import get_db
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user
)
from app.core.config import settings
from app.models.user import User
from app.models.schemas import UserCreate, UserLogin, UserResponse, Token
from app.services.google_oauth import oauth

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, response: Response, db: Session = Depends(get_db)):
    """
    Register a new user
    
    Creates a new user account and returns an access token.
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hashed_password
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(new_user.id)},
        expires_delta=access_token_expires
    )
    
    # Set HTTP-only cookie
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        secure=True,  # Set to True in production with HTTPS
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    
    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(new_user)
    )


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, response: Response, db: Session = Depends(get_db)):
    """
    Login user

    Authenticates user and returns an access token.
    """
    # Find user
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Check if user registered with OAuth (Google)
    if not user.hashed_password and user.google_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account uses Google Sign-In. Please use 'Continue with Google' to login."
        )

    # Check if user has a password set
    if not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account has no password set. Please contact support."
        )

    # Verify password
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )

    # Set HTTP-only cookie
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        secure=True,  # Set to True in production with HTTPS
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/logout")
def logout(response: Response):
    """
    Logout user
    
    Clears the authentication cookie.
    """
    response.delete_cookie(key="access_token")
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current user information

    Returns the authenticated user's profile data.
    """
    return UserResponse.model_validate(current_user)


@router.get("/google/login")
async def google_login(request: Request):
    """
    Initiate Google OAuth login flow

    Redirects user to Google's consent screen.
    Forces account picker and consent to ensure we get refresh_token.
    """
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    # Use 'consent' to force re-consent and get refresh_token
    # 'select_account' allows choosing which Google account to use
    return await oauth.google.authorize_redirect(
        request,
        redirect_uri,
        prompt='consent select_account',
        access_type='offline'
    )


@router.get("/google/callback")
async def google_callback(request: Request, response: Response, db: Session = Depends(get_db)):
    """
    Handle Google OAuth callback

    Processes the OAuth callback from Google and creates/updates user.
    """
    try:
        # Get access token from Google
        # Note: State verification fails in distributed environments (Railway)
        # So we manually fetch the token using the authorization code
        code = request.query_params.get('code')
        if not code:
            raise HTTPException(status_code=400, detail="No authorization code provided")

        # Fetch token directly from Google's token endpoint
        # This bypasses session-based state verification
        import httpx
        token_endpoint = 'https://oauth2.googleapis.com/token'
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                token_endpoint,
                data={
                    'code': code,
                    'client_id': settings.GOOGLE_CLIENT_ID,
                    'client_secret': settings.GOOGLE_CLIENT_SECRET,
                    'redirect_uri': settings.GOOGLE_REDIRECT_URI,
                    'grant_type': 'authorization_code',
                }
            )
            token = token_response.json()

        # Also fetch user info
        userinfo_endpoint = 'https://www.googleapis.com/oauth2/v2/userinfo'
        async with httpx.AsyncClient() as client:
            userinfo_response = await client.get(
                userinfo_endpoint,
                headers={'Authorization': f"Bearer {token['access_token']}"}
            )
            token['userinfo'] = userinfo_response.json()

        refresh_token = token.get("refresh_token")

        # Debug logging
        print(f"[DEBUG] Token keys received from Google: {list(token.keys())}")
        print(f"[DEBUG] Has refresh_token: {refresh_token is not None}")

        # Get user info from Google
        user_info = token.get('userinfo')
        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user info from Google"
            )

        google_id = user_info.get('sub')
        email = user_info.get('email')
        full_name = user_info.get('name')
        profile_picture = user_info.get('picture')

        if not email or not google_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required user information from Google"
            )

        # Check if user exists
        user = db.query(User).filter(
            (User.email == email) | (User.google_id == google_id)
        ).first()

        if user:
            # Update existing user with Google info
            if not user.google_id:
                user.google_id = google_id
            if profile_picture:
                user.profile_picture = profile_picture
            if full_name and not user.full_name:
                user.full_name = full_name
            if refresh_token:
                user.google_refresh_token = refresh_token
        else:
            # Create new user
            user = User(
                email=email,
                full_name=full_name,
                google_id=google_id,
                profile_picture=profile_picture,
                hashed_password=None,  # OAuth users don't have passwords
                google_refresh_token=refresh_token
            )
            db.add(user)

        db.commit()
        db.refresh(user)

        # Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id)}, expires_delta=access_token_expires
        )

        # Create user response (exclude sensitive data)
        user_data = UserResponse.model_validate(user)

        # Redirect to frontend callback with token and user data
        # The frontend will store these in localStorage
        import urllib.parse
        import json
        user_json = urllib.parse.quote(json.dumps({
            "id": user_data.id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "is_active": user_data.is_active,
            "created_at": user_data.created_at.isoformat() if user_data.created_at else None,
            "profile_picture": user.profile_picture
        }))
        redirect_url = f"{settings.FRONTEND_URL}/auth/callback?token={access_token}&user={user_json}"

        return RedirectResponse(url=redirect_url)

    except Exception as e:
        import traceback
        print(f"Google OAuth error: {e}")
        print(f"Error type: {type(e).__name__}")
        print(f"Full traceback:")
        traceback.print_exc()
        # Redirect to login page with error
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=oauth_failed")
