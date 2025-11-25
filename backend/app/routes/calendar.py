"""
Google Calendar integration routes - Two-way sync support
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.google_calendar import (
    fetch_calendar_events,
    create_calendar_event,
    update_calendar_event,
    delete_calendar_event,
)

router = APIRouter(tags=["Calendar"])


# Request/Response schemas for calendar events
class CalendarEventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    date: Optional[str] = None  # ISO format date
    time: Optional[str] = None  # HH:MM format
    location: Optional[str] = None
    recurrence: Optional[str] = None  # none, daily, weekly, monthly, yearly


class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    location: Optional[str] = None
    recurrence: Optional[str] = None  # none, daily, weekly, monthly, yearly


def _check_google_connected(user: User):
    """Helper to check if user has Google connected."""
    if not user.google_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google not connected. Please sign in with Google to use calendar features."
        )


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
    _check_google_connected(current_user)

    events = await fetch_calendar_events(
        refresh_token=current_user.google_refresh_token,
        time_min=timeMin,
        time_max=timeMax,
    )
    return {"items": events}


@router.post("/events", status_code=status.HTTP_201_CREATED)
async def create_google_calendar_event(
    event_data: CalendarEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new event in the user's Google Calendar.

    Returns the created event including its Google Calendar event ID.
    """
    _check_google_connected(current_user)

    from datetime import datetime

    # Parse date if provided
    parsed_date = None
    if event_data.date:
        try:
            parsed_date = datetime.fromisoformat(event_data.date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)"
            )

    created_event = await create_calendar_event(
        refresh_token=current_user.google_refresh_token,
        title=event_data.title,
        description=event_data.description,
        date=parsed_date,
        time=event_data.time,
        location=event_data.location,
        recurrence=event_data.recurrence,
    )

    return {
        "message": "Event created successfully",
        "event": created_event
    }


@router.put("/events/{event_id}")
async def update_google_calendar_event(
    event_id: str,
    event_data: CalendarEventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing event in the user's Google Calendar.
    """
    _check_google_connected(current_user)

    from datetime import datetime

    # Parse date if provided
    parsed_date = None
    if event_data.date:
        try:
            parsed_date = datetime.fromisoformat(event_data.date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)"
            )

    # Get title - required for update
    if not event_data.title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title is required for updating an event"
        )

    updated_event = await update_calendar_event(
        refresh_token=current_user.google_refresh_token,
        event_id=event_id,
        title=event_data.title,
        description=event_data.description,
        date=parsed_date,
        time=event_data.time,
        location=event_data.location,
        recurrence=event_data.recurrence,
    )

    if updated_event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar event not found"
        )

    return {
        "message": "Event updated successfully",
        "event": updated_event
    }


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_google_calendar_event(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete an event from the user's Google Calendar.
    """
    _check_google_connected(current_user)

    success = await delete_calendar_event(
        refresh_token=current_user.google_refresh_token,
        event_id=event_id,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar event not found"
        )

    return None


@router.get("/status")
async def get_calendar_sync_status(
    current_user: User = Depends(get_current_user)
):
    """
    Check if the user has Google Calendar connected.
    """
    return {
        "connected": current_user.google_refresh_token is not None,
        "google_id": current_user.google_id,
    }
