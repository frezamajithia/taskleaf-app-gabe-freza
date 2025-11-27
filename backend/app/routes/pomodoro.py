"""
Pomodoro API routes with minute-by-minute tracking
Update your app/api/pomodoro.py with this code
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.task import PomodoroSession
from app.models.schemas import (
    PomodoroSessionResponse,
    PomodoroStatsResponse,
    PomodoroSessionCreate,
    PomodoroSessionUpdate,
)

router = APIRouter(tags=["Pomodoro"])


@router.post("/sessions", response_model=PomodoroSessionResponse)
def create_session(
    session_data: PomodoroSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Start a new pomodoro session
    """
    session = PomodoroSession(
        user_id=current_user.id,
        session_type=session_data.session_type,
        target_duration=session_data.target_duration,
        elapsed_minutes=0,
        is_completed=False
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return PomodoroSessionResponse.model_validate(session)


@router.put("/sessions/{session_id}", response_model=PomodoroSessionResponse)
def update_session(
    session_id: int,
    session_data: PomodoroSessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update session progress (called every minute)
    """
    session = db.query(PomodoroSession).filter(
        PomodoroSession.id == session_id,
        PomodoroSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Update elapsed time
    session.elapsed_minutes = session_data.elapsed_minutes
    session.last_updated = datetime.now()
    
    # Mark as completed if specified
    if session_data.is_completed:
        session.is_completed = True
        session.completed_at = datetime.now()
    
    db.commit()
    db.refresh(session)
    
    return PomodoroSessionResponse.model_validate(session)


@router.get("/sessions/active", response_model=Optional[PomodoroSessionResponse])
def get_active_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the current active session (if any)
    """
    session = db.query(PomodoroSession).filter(
        PomodoroSession.user_id == current_user.id,
        PomodoroSession.is_completed == False
    ).order_by(PomodoroSession.started_at.desc()).first()
    
    if session:
        return PomodoroSessionResponse.model_validate(session)
    return None


@router.get("/sessions", response_model=List[PomodoroSessionResponse])
def get_sessions(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get recent pomodoro sessions
    """
    start_date = datetime.now() - timedelta(days=days)
    sessions = db.query(PomodoroSession).filter(
        PomodoroSession.user_id == current_user.id,
        PomodoroSession.started_at >= start_date
    ).order_by(PomodoroSession.started_at.desc()).all()
    
    return [PomodoroSessionResponse.model_validate(s) for s in sessions]


@router.get("/stats", response_model=PomodoroStatsResponse)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get pomodoro statistics based on elapsed minutes
    """
    now = datetime.now()
    today = date.today()
    week_ago = today - timedelta(days=7)
    
    # All sessions (only work sessions for focus time)
    all_sessions = db.query(PomodoroSession).filter(
        PomodoroSession.user_id == current_user.id,
        PomodoroSession.session_type == "work"
    ).all()
    
    # Today's sessions - use elapsed_minutes
    today_sessions = [s for s in all_sessions if s.started_at.date() == today]
    today_focus = sum(s.elapsed_minutes for s in today_sessions)
    
    # This week - use elapsed_minutes
    week_sessions = [s for s in all_sessions if s.started_at.date() >= week_ago]
    week_focus = sum(s.elapsed_minutes for s in week_sessions)
    
    # Total
    completed_sessions = [s for s in all_sessions if s.is_completed]
    total_sessions = len(completed_sessions)
    total_minutes = sum(s.elapsed_minutes for s in all_sessions)
    total_hours = round(total_minutes / 60, 1)
    
    # Daily breakdown for last 7 days
    daily_breakdown = []
    for i in range(7):
        day = today - timedelta(days=6-i)
        day_sessions = [s for s in all_sessions if s.started_at.date() == day]
        daily_breakdown.append({
            "date": day.isoformat(),
            "sessions": len([s for s in day_sessions if s.is_completed]),
            "focus_minutes": sum(s.elapsed_minutes for s in day_sessions)
        })
    
    return PomodoroStatsResponse(
        today_sessions=len([s for s in today_sessions if s.is_completed]),
        today_focus_minutes=today_focus,
        week_sessions=len([s for s in week_sessions if s.is_completed]),
        week_focus_minutes=week_focus,
        total_sessions=total_sessions,
        total_focus_hours=total_hours,
        daily_breakdown=daily_breakdown
    )


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a pomodoro session
    """
    session = db.query(PomodoroSession).filter(
        PomodoroSession.id == session_id,
        PomodoroSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    db.delete(session)
    db.commit()
    return {"message": "Session deleted"}