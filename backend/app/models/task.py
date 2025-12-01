"""
Task/Event model
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Task(Base):
    """Task/Event model with calendar and weather support"""
    
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Date and time
    date = Column(DateTime(timezone=True), nullable=True)
    time = Column(String, nullable=True)  # Store as "HH:MM" format
    
    # Status
    completed = Column(Boolean, default=False)
    priority = Column(String, default="medium")  # low, medium, high
    
    # Location for weather
    location = Column(String, nullable=True)
    
    # Weather data (stored as JSON)
    weather_data = Column(JSON, nullable=True)

    # Google Calendar sync
    google_calendar_event_id = Column(String, nullable=True, index=True)
    sync_with_google_calendar = Column(Boolean, default=False)

    # Category relationship
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    category = relationship("Category", back_populates="tasks")
    
    # User relationship
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    owner = relationship("User", back_populates="tasks")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Task {self.title}>"


class Category(Base):
    """Category/Tag model for organizing tasks"""
    
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    color = Column(String, default="#609A93")  # Hex color code
    
    # User relationship
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    owner = relationship("User", back_populates="categories")
    
    # Task relationship
    tasks = relationship("Task", back_populates="category")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<Category {self.name}>"
class PomodoroSession(Base):
    """Track pomodoro sessions with minute-by-minute progress"""
    __tablename__ = "pomodoro_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Session details
    session_type = Column(String, default="work")  # work, shortBreak, longBreak
    target_duration = Column(Integer, default=25)  # Target minutes
    elapsed_minutes = Column(Integer, default=0)  # Actual minutes elapsed
    is_completed = Column(Boolean, default=False)  # Whether session finished
    
    # Timestamps
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationship - must match back_populates in User model
    owner = relationship("User", back_populates="pomodoro_sessions")
    
    def __repr__(self):
        return f"<PomodoroSession {self.id} - {self.elapsed_minutes}/{self.target_duration}m>"

class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Event details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    date = Column(String(10), nullable=True)  # ISO format: YYYY-MM-DD
    time = Column(String(5), nullable=True)  # HH:MM format
    location = Column(String(255), nullable=True)
    
    # Recurrence
    recurrence = Column(String(20), default="none")  # none, daily, weekly, monthly, yearly
    recurrence_end_date = Column(String(10), nullable=True)  # ISO format: YYYY-MM-DD
    
    # Visual/organizational
    tag = Column(String(100), nullable=True)
    color = Column(String(7), default="#14b8a6")  # Hex color code
    
    # Google Calendar sync
    google_event_id = Column(String(255), nullable=True, unique=True)  # Google Calendar event ID if synced
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    owner = relationship("User", back_populates="calendar_events")

    def __repr__(self):
        return f"<CalendarEvent(id={self.id}, title='{self.title}', date='{self.date}', user_id={self.user_id})>"