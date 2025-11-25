"""
Google Calendar helper service - Two-way sync support
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)

CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3/calendars/primary/events"


async def exchange_refresh_token(refresh_token: str) -> str:
    """
    Exchange a Google refresh token for a short-lived access token.
    """
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account not connected."
        )

    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(token_url, data=data)

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to refresh Google token: {resp.text}"
        )

    access_token = resp.json().get("access_token")
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to obtain Google access token."
        )
    return access_token


async def fetch_calendar_events(
    refresh_token: str,
    time_min: Optional[str] = None,
    time_max: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Fetch events from the primary Google Calendar within a time window.
    """
    access_token = await exchange_refresh_token(refresh_token)

    now = datetime.now(timezone.utc)
    default_time_min = (now - timedelta(days=1)).isoformat()
    default_time_max = (now + timedelta(days=7)).isoformat()

    params = {
        "singleEvents": "true",
        "orderBy": "startTime",
        "timeMin": time_min or default_time_min,
        "timeMax": time_max or default_time_max,
    }

    headers = {
        "Authorization": f"Bearer {access_token}",
    }

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            CALENDAR_API_BASE,
            params=params,
            headers=headers,
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch Google Calendar events: {resp.text}"
        )

    data = resp.json()
    return data.get("items", [])


def _build_recurrence_rule(recurrence: Optional[str]) -> Optional[List[str]]:
    """
    Build a Google Calendar RRULE from recurrence type.
    """
    if not recurrence or recurrence == 'none':
        return None

    rrule_map = {
        'daily': 'RRULE:FREQ=DAILY',
        'weekly': 'RRULE:FREQ=WEEKLY',
        'monthly': 'RRULE:FREQ=MONTHLY',
        'yearly': 'RRULE:FREQ=YEARLY',
    }

    rrule = rrule_map.get(recurrence.lower())
    if rrule:
        return [rrule]
    return None


def _build_event_body(
    title: str,
    description: Optional[str] = None,
    date: Optional[datetime] = None,
    time: Optional[str] = None,
    location: Optional[str] = None,
    recurrence: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Build a Google Calendar event body from task data.
    """
    logger.info(f"Building calendar event: title={title}, date={date}, time={time}, recurrence={recurrence}")

    event = {
        "summary": title,
        "description": description or "",
    }

    if location:
        event["location"] = location

    # Add recurrence rule if specified
    recurrence_rule = _build_recurrence_rule(recurrence)
    if recurrence_rule:
        event["recurrence"] = recurrence_rule

    # Handle date/time
    if date:
        # Convert to date string format YYYY-MM-DD
        if hasattr(date, 'strftime'):
            date_str = date.strftime("%Y-%m-%d")
        else:
            date_str = str(date)[:10]  # Handle string dates

        if time:
            # Specific time event
            try:
                # Parse time - handle both HH:MM and HH:MM:SS formats
                time_parts = time.split(":")
                hour = int(time_parts[0])
                minute = int(time_parts[1]) if len(time_parts) > 1 else 0

                # Build proper ISO datetime string (always use HH:MM:SS format)
                start_datetime = f"{date_str}T{str(hour).zfill(2)}:{str(minute).zfill(2)}:00"

                # End time is 1 hour after start - handle midnight rollover
                end_hour = hour + 1
                end_date_str = date_str
                if end_hour >= 24:
                    end_hour = 0
                    # Move to next day
                    end_date_str = (datetime.strptime(date_str, "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d")

                end_datetime = f"{end_date_str}T{str(end_hour).zfill(2)}:{str(minute).zfill(2)}:00"

                event["start"] = {
                    "dateTime": start_datetime,
                    "timeZone": "UTC",
                }
                event["end"] = {
                    "dateTime": end_datetime,
                    "timeZone": "UTC",
                }
                logger.info(f"Created timed event: start={start_datetime}, end={end_datetime}")
            except (ValueError, AttributeError, IndexError) as e:
                logger.warning(f"Failed to parse time '{time}', creating all-day event: {e}")
                # Fallback to all-day event
                event["start"] = {"date": date_str}
                next_day = (datetime.strptime(date_str, "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d")
                event["end"] = {"date": next_day}
        else:
            # All-day event
            event["start"] = {"date": date_str}
            next_day = (datetime.strptime(date_str, "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d")
            event["end"] = {"date": next_day}
            logger.info(f"Created all-day event: date={date_str}")
    else:
        # No date - use today as default
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
        event["start"] = {"date": today}
        event["end"] = {"date": tomorrow}
        logger.info(f"No date provided, using today: {today}")

    logger.info(f"Final event body: {event}")
    return event


async def create_calendar_event(
    refresh_token: str,
    title: str,
    description: Optional[str] = None,
    date: Optional[datetime] = None,
    time: Optional[str] = None,
    location: Optional[str] = None,
    recurrence: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Create a new event in Google Calendar.
    Returns the created event with its ID.
    """
    access_token = await exchange_refresh_token(refresh_token)

    event_body = _build_event_body(title, description, date, time, location, recurrence)

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            CALENDAR_API_BASE,
            json=event_body,
            headers=headers,
        )

    if resp.status_code not in (200, 201):
        logger.error(f"Failed to create calendar event: {resp.text}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create Google Calendar event: {resp.text}"
        )

    return resp.json()


async def update_calendar_event(
    refresh_token: str,
    event_id: str,
    title: str,
    description: Optional[str] = None,
    date: Optional[datetime] = None,
    time: Optional[str] = None,
    location: Optional[str] = None,
    recurrence: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Update an existing event in Google Calendar.
    """
    access_token = await exchange_refresh_token(refresh_token)

    event_body = _build_event_body(title, description, date, time, location, recurrence)

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.put(
            f"{CALENDAR_API_BASE}/{event_id}",
            json=event_body,
            headers=headers,
        )

    if resp.status_code == 404:
        logger.warning(f"Calendar event {event_id} not found, may have been deleted")
        return None

    if resp.status_code not in (200, 201):
        logger.error(f"Failed to update calendar event: {resp.text}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update Google Calendar event: {resp.text}"
        )

    return resp.json()


async def delete_calendar_event(
    refresh_token: str,
    event_id: str,
) -> bool:
    """
    Delete an event from Google Calendar.
    Returns True if successful, False if event not found.
    """
    access_token = await exchange_refresh_token(refresh_token)

    headers = {
        "Authorization": f"Bearer {access_token}",
    }

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.delete(
            f"{CALENDAR_API_BASE}/{event_id}",
            headers=headers,
        )

    if resp.status_code == 404:
        logger.warning(f"Calendar event {event_id} not found, may have been deleted")
        return False

    if resp.status_code not in (200, 204):
        logger.error(f"Failed to delete calendar event: {resp.text}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete Google Calendar event: {resp.text}"
        )

    return True
