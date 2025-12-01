"""
Google Calendar integration routes - Two-way sync support + Local calendar events
"""
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.task import CalendarEvent  # New model we'll create
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
    tag: Optional[str] = None
    color: Optional[str] = "#14b8a6"
    google_event_id: Optional[str] = None  # If synced with Google


class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    location: Optional[str] = None
    recurrence: Optional[str] = None
    tag: Optional[str] = None
    color: Optional[str] = None
    google_event_id: Optional[str] = None


class CalendarEventResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    date: Optional[str]
    time: Optional[str]
    location: Optional[str]
    recurrence: Optional[str]
    recurrence_end_date: Optional[str]
    tag: Optional[str]
    color: str
    google_event_id: Optional[str]
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


def _check_google_connected(user: User):
    """Helper to check if user has Google connected."""
    if not user.google_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google not connected. Please sign in with Google to use calendar features."
        )


# ============================================================================
# LOCAL CALENDAR EVENTS (Database-backed, works for all users)
# ============================================================================

@router.get("/local-events", response_model=List[CalendarEventResponse])
async def get_local_calendar_events(
    start_date: Optional[str] = Query(None, description="ISO date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="ISO date YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetch local calendar events stored in the database for the current user.
    Works for all users regardless of Google OAuth connection.
    """
    query = db.query(CalendarEvent).filter(CalendarEvent.user_id == current_user.id)
    
    # Filter by date range if provided
    if start_date:
        query = query.filter(CalendarEvent.date >= start_date)
    if end_date:
        query = query.filter(CalendarEvent.date <= end_date)
    
    events = query.order_by(CalendarEvent.date, CalendarEvent.time).all()
    return events


@router.post("/local-events", status_code=status.HTTP_201_CREATED, response_model=CalendarEventResponse)
async def create_local_calendar_event(
    event_data: CalendarEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new local calendar event in the database.
    Works for all users regardless of Google OAuth connection.
    """
    new_event = CalendarEvent(
        user_id=current_user.id,
        title=event_data.title,
        description=event_data.description,
        date=event_data.date,
        time=event_data.time,
        location=event_data.location,
        recurrence=event_data.recurrence or "none",
        tag=event_data.tag,
        color=event_data.color,
        google_event_id=event_data.google_event_id,
    )
    
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    
    return new_event


@router.put("/local-events/{event_id}", response_model=CalendarEventResponse)
async def update_local_calendar_event(
    event_id: int,
    event_data: CalendarEventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a local calendar event in the database.
    Works for all users regardless of Google OAuth connection.
    """
    event = db.query(CalendarEvent).filter(
        CalendarEvent.id == event_id,
        CalendarEvent.user_id == current_user.id
    ).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar event not found"
        )
    
    # Update fields if provided
    if event_data.title is not None:
        event.title = event_data.title
    if event_data.description is not None:
        event.description = event_data.description
    if event_data.date is not None:
        event.date = event_data.date
    if event_data.time is not None:
        event.time = event_data.time
    if event_data.location is not None:
        event.location = event_data.location
    if event_data.recurrence is not None:
        event.recurrence = event_data.recurrence
    if event_data.tag is not None:
        event.tag = event_data.tag
    if event_data.color is not None:
        event.color = event_data.color
    if event_data.google_event_id is not None:
        event.google_event_id = event_data.google_event_id
    
    event.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(event)
    
    return event


@router.delete("/local-events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_local_calendar_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a local calendar event from the database.
    Works for all users regardless of Google OAuth connection.
    """
    event = db.query(CalendarEvent).filter(
        CalendarEvent.id == event_id,
        CalendarEvent.user_id == current_user.id
    ).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar event not found"
        )
    
    db.delete(event)
    db.commit()
    
    return None


# ============================================================================
# GOOGLE CALENDAR EVENTS (Only for users with Google OAuth)
# ============================================================================

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