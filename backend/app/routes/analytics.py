from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.task import Task, Category,PomodoroSession
from app.models.schemas import (
    AnalyticsMetricsResponse,
    AnalyticsSummary,
    AnalyticsTrends,
    AnalyticsBreakdown,
    AnalyticsInsights,
    CategoryBreakdownItem,
    PriorityBreakdown,
    DailyStatsResponse,
    DailyStatsItem
)

router = APIRouter(tags=["Analytics"])


@router.get("/metrics", response_model=AnalyticsMetricsResponse)
def get_analytics_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive analytics metrics for the dashboard
    """
    now = datetime.now()
    today = date.today()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    
    # Get all user tasks
    all_tasks = db.query(Task).filter(Task.user_id == current_user.id).all()
    
    # Basic stats
    total_tasks = len(all_tasks)
    completed_tasks = sum(1 for t in all_tasks if t.completed)
    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    # Weekly completion trend (last 7 days)
    weekly_trend = []
    week_labels = []
    for i in range(7):
        day = today - timedelta(days=6-i)
        week_labels.append(day.strftime("%a"))
        day_tasks = [t for t in all_tasks if t.date and t.date.date() == day]
        day_completed = sum(1 for t in day_tasks if t.completed)
        day_total = len(day_tasks)
        day_rate = (day_completed / day_total * 100) if day_total > 0 else 0
        weekly_trend.append(round(day_rate, 1))
    
    # Category breakdown
    category_breakdown = {}
    for task in all_tasks:
        if task.category:
            cat_name = task.category.name
            if cat_name not in category_breakdown:
                category_breakdown[cat_name] = {"total": 0, "completed": 0}
            category_breakdown[cat_name]["total"] += 1
            if task.completed:
                category_breakdown[cat_name]["completed"] += 1
    
    # Calculate category percentages
    category_data = []
    for cat_name, stats in category_breakdown.items():
        percentage = (stats["total"] / total_tasks * 100) if total_tasks > 0 else 0
        category_data.append(CategoryBreakdownItem(
            name=cat_name,
            value=stats["total"],
            percentage=round(percentage, 1)
        ))
    
    # Priority breakdown
    priority_stats = {"high": 0, "medium": 0, "low": 0}
    priority_completed = {"high": 0, "medium": 0, "low": 0}
    for task in all_tasks:
        if task.priority in priority_stats:
            priority_stats[task.priority] += 1
            if task.completed:
                priority_completed[task.priority] += 1
    
    # Weekly focus hours (simulated - estimate based on completed tasks)
    weekly_focus_hours = []
    for i in range(7):
        day = today - timedelta(days=6-i)
        day_completed = sum(1 for t in all_tasks 
                          if t.date and t.date.date() == day and t.completed)
        # Estimate 0.5 hours per completed task + base variation
        hours = round(day_completed * 0.5 + (3 + i * 0.3), 1)
        weekly_focus_hours.append(hours)
    
    # Calculate productivity score (0-100)
    recent_tasks = [t for t in all_tasks if t.date and t.date.date() >= week_ago]
    recent_completed = sum(1 for t in recent_tasks if t.completed)
    recent_rate = (recent_completed / len(recent_tasks) * 100) if recent_tasks else 0
    
    productivity_score = round(
        (completion_rate * 0.4) + 
        (recent_rate * 0.3) + 
        (min(len(recent_tasks) / 20, 1) * 30)
    )
    
    # Streak calculation
    streak = 0
    current_date = today
    while True:
        day_tasks = [t for t in all_tasks 
                    if t.date and t.date.date() == current_date and t.completed]
        if day_tasks:
            streak += 1
            current_date -= timedelta(days=1)
        else:
            break
    
    # Month stats
    month_tasks = [t for t in all_tasks if t.date and t.date.date() >= month_ago]
    month_completed = sum(1 for t in month_tasks if t.completed)
    month_rate = (month_completed / len(month_tasks) * 100) if month_tasks else 0
    
    # Build response
    return AnalyticsMetricsResponse(
        summary=AnalyticsSummary(
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            completion_rate=round(completion_rate, 1),
            productivity_score=productivity_score,
            current_streak=streak,
            focus_hours_today=weekly_focus_hours[-1] if weekly_focus_hours else 0,
            goal_achievement_month=round(month_rate, 1)
        ),
        trends=AnalyticsTrends(
            weekly_completion=weekly_trend,
            weekly_focus_hours=weekly_focus_hours,
            week_labels=week_labels
        ),
        breakdown=AnalyticsBreakdown(
            categories=category_data,
            priority=PriorityBreakdown(
                total=priority_stats,
                completed=priority_completed
            )
        ),
        insights=AnalyticsInsights(
            completion_rate_change=round(recent_rate - completion_rate, 1),
            focus_hours_change=round(
                weekly_focus_hours[-1] - weekly_focus_hours[-2], 1
            ) if len(weekly_focus_hours) > 1 else 0,
            streak_is_record=streak >= 10,
            month_achievement_change=round(month_rate - completion_rate, 1)
        )
    )


@router.get("/daily-stats", response_model=DailyStatsResponse)
def get_daily_stats(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get daily task completion stats for charts
    """
    today = date.today()
    start_date = today - timedelta(days=days-1)
    
    # Query tasks within date range
    tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.date >= start_date
    ).all()
    
    # Group by date
    daily_stats = {}
    for i in range(days):
        current_date = start_date + timedelta(days=i)
        daily_stats[current_date] = {"total": 0, "completed": 0}
    
    for task in tasks:
        if task.date:
            task_date = task.date.date()
            if task_date in daily_stats:
                daily_stats[task_date]["total"] += 1
                if task.completed:
                    daily_stats[task_date]["completed"] += 1
    
    # Format response
    result = []
    for current_date in sorted(daily_stats.keys()):
        stats = daily_stats[current_date]
        completion_rate = (
            (stats["completed"] / stats["total"] * 100) 
            if stats["total"] > 0 else 0
        )
        result.append(DailyStatsItem(
            date=current_date.isoformat(),
            total=stats["total"],
            completed=stats["completed"],
            completion_rate=round(completion_rate, 1)
        ))
    
    return DailyStatsResponse(stats=result)