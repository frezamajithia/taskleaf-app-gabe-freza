"""
User model for authentication
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class User(Base):
    """User model for authentication and profile"""
    
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)  # Nullable for OAuth users
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)

    # OAuth fields
    google_id = Column(String, unique=True, nullable=True, index=True)
    profile_picture = Column(String, nullable=True)
    google_refresh_token = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    tasks = relationship("Task", back_populates="owner", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="owner", cascade="all, delete-orphan")
    pomodoro_sessions = relationship("PomodoroSession", back_populates="owner")

    def __repr__(self):
        return f"<User {self.email}>"
