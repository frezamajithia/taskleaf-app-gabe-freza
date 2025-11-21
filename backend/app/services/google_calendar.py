"""
Google Calendar helper service
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException, status

from app.core.config import settings


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
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
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
