"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict
from datetime import datetime


# User schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    google_id: Optional[str] = None
    profile_picture: Optional[str] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# Category schemas
class CategoryBase(BaseModel):
    name: str
    color: str = "#609A93"


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Task schemas
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    date: Optional[datetime] = None
    time: Optional[str] = None
    priority: str = "medium"
    location: Optional[str] = None
    category_id: Optional[int] = None
    sync_with_google_calendar: bool = False


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    time: Optional[str] = None
    completed: Optional[bool] = None
    priority: Optional[str] = None
    location: Optional[str] = None
    category_id: Optional[int] = None
    sync_with_google_calendar: Optional[bool] = None


class TaskResponse(TaskBase):
    id: int
    completed: bool
    weather_data: Optional[dict] = None
    category: Optional[CategoryResponse] = None
    google_calendar_event_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Weather schemas
class WeatherResponse(BaseModel):
    temperature: float
    feels_like: float
    description: str
    icon: str
    humidity: int
    wind_speed: float


# Dashboard/Analytics schemas
class TaskStatsResponse(BaseModel):
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    completion_rate: float
    tasks_by_priority: dict
    completed_by_priority: dict
    tasks_by_category: dict

# Analytics schemas for the dashboard
class AnalyticsSummary(BaseModel):
    total_tasks: int
    completed_tasks: int
    completion_rate: float
    productivity_score: int
    current_streak: int
    focus_hours_today: float
    goal_achievement_month: float


class AnalyticsTrends(BaseModel):
    weekly_completion: List[float]
    weekly_focus_hours: List[float]
    week_labels: List[str]


class CategoryBreakdownItem(BaseModel):
    name: str
    value: int
    percentage: float


class PriorityBreakdown(BaseModel):
    total: Dict[str, int]
    completed: Dict[str, int]


class AnalyticsBreakdown(BaseModel):
    categories: List[CategoryBreakdownItem]
    priority: PriorityBreakdown


class AnalyticsInsights(BaseModel):
    completion_rate_change: float
    focus_hours_change: float
    streak_is_record: bool
    month_achievement_change: float


class AnalyticsMetricsResponse(BaseModel):
    summary: AnalyticsSummary
    trends: AnalyticsTrends
    breakdown: AnalyticsBreakdown
    insights: AnalyticsInsights


class DailyStatsItem(BaseModel):
    date: str
    total: int
    completed: int
    completion_rate: float


class DailyStatsResponse(BaseModel):
    stats: List[DailyStatsItem]

class PomodoroSessionCreate(BaseModel):
    session_type: str = "work"  # work, shortBreak, longBreak
    target_duration: int = 25


class PomodoroSessionUpdate(BaseModel):
    elapsed_minutes: int
    is_completed: Optional[bool] = None


class PomodoroSessionResponse(BaseModel):
    id: int
    session_type: str
    target_duration: int
    elapsed_minutes: int
    is_completed: bool
    started_at: datetime
    last_updated: datetime
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class PomodoroStatsResponse(BaseModel):
    today_sessions: int
    today_focus_minutes: int
    week_sessions: int
    week_focus_minutes: int
    total_sessions: int
    total_focus_hours: float
    daily_breakdown: List[Dict]