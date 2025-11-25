"""
Task/Event model
"""
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
