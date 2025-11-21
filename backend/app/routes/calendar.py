"""
Google Calendar integration routes
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.google_calendar import fetch_calendar_events

router = APIRouter(tags=["Calendar"])


@router.get("/events")
async def get_google_calendar_events(
    timeMin: Optional[str] = Query(None, description="ISO datetime, inclusive start"),
    timeMax: Optional[str] = Query(None, description="ISO datetime, inclusive end"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetch events from the user's primary Google Calendar.

    Requires the user to have connected Google (refresh token stored).
    If no refresh token is present, a 400 is returned with guidance to reconnect.
    """
    if not current_user.google_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google not connected. Please sign in with Google again."
        )

    events = await fetch_calendar_events(
        refresh_token=current_user.google_refresh_token,
        time_min=timeMin,
        time_max=timeMax,
    )
    return {"items": events}
