"""
Tasks API routes with Google Calendar sync support
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.task import Task, Category
from app.models.schemas import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    CategoryCreate,
    CategoryResponse,
    TaskStatsResponse
)
from app.services.weather import weather_service
from app.services.google_calendar import (
    create_calendar_event,
    update_calendar_event,
    delete_calendar_event,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Tasks"])


@router.get("/", response_model=List[TaskResponse])
def get_tasks(
    skip: int = 0,
    limit: int = 100,
    completed: bool = None,
    search: str = None,
    filter_type: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all tasks for the current user

    Supports pagination, search, and filtering by completion status and date.
    - search: Search in title and description
    - filter_type: 'today', 'upcoming', 'overdue', or None for all
    """
    from datetime import date, timedelta

    query = db.query(Task).filter(Task.user_id == current_user.id)

    # Filter by completion status
    if completed is not None:
        query = query.filter(Task.completed == completed)

    # Search in title and description
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Task.title.ilike(search_term)) |
            (Task.description.ilike(search_term))
        )

    # Filter by date
    if filter_type:
        today = date.today()
        if filter_type == "today":
            query = query.filter(Task.date == today)
        elif filter_type == "upcoming":
            query = query.filter(Task.date > today)
        elif filter_type == "overdue":
            query = query.filter(Task.date < today, Task.completed == False)

    tasks = query.order_by(Task.date.asc(), Task.created_at.desc()).offset(skip).limit(limit).all()
    return [TaskResponse.model_validate(task) for task in tasks]


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new task

    If location is provided, fetches weather data for that location.
    If sync_with_google_calendar is True and user has Google connected,
    creates a corresponding event in Google Calendar.
    """
    # Create new task
    new_task = Task(
        **task_data.model_dump(),
        user_id=current_user.id
    )

    # Fetch weather data if location is provided
    if task_data.location:
        weather_data = await weather_service.get_weather(task_data.location)
        if weather_data:
            new_task.weather_data = weather_data

    # Sync with Google Calendar if enabled
    logger.info(f"Sync check: sync_enabled={task_data.sync_with_google_calendar}, has_refresh_token={bool(current_user.google_refresh_token)}")
    if task_data.sync_with_google_calendar and current_user.google_refresh_token:
        try:
            logger.info(f"Attempting to create Google Calendar event for task: {task_data.title}")
            calendar_event = await create_calendar_event(
                refresh_token=current_user.google_refresh_token,
                title=task_data.title,
                description=task_data.description,
                date=task_data.date,
                time=task_data.time,
                location=task_data.location,
            )
            new_task.google_calendar_event_id = calendar_event.get("id")
            logger.info(f"Successfully created Google Calendar event: {new_task.google_calendar_event_id}")
        except Exception as e:
            import traceback
            logger.error(f"Failed to sync task to Google Calendar: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            # Don't fail task creation if calendar sync fails
    elif task_data.sync_with_google_calendar and not current_user.google_refresh_token:
        logger.warning("User requested calendar sync but no Google refresh token available")

    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    return TaskResponse.model_validate(new_task)


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific task by ID
    """
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    return TaskResponse.model_validate(task)


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a task

    Updates weather data if location is changed.
    Syncs changes to Google Calendar if the task is linked to a calendar event.
    """
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Store old values for comparison
    old_sync_enabled = task.sync_with_google_calendar
    old_calendar_event_id = task.google_calendar_event_id

    # Update task fields
    update_data = task_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    # Update weather if location changed
    if task_data.location and task_data.location != task.location:
        weather_data = await weather_service.get_weather(task_data.location)
        if weather_data:
            task.weather_data = weather_data

    # Handle Google Calendar sync
    if current_user.google_refresh_token:
        try:
            # If sync was just enabled and no event exists, create one
            if task.sync_with_google_calendar and not old_calendar_event_id:
                calendar_event = await create_calendar_event(
                    refresh_token=current_user.google_refresh_token,
                    title=task.title,
                    description=task.description,
                    date=task.date,
                    time=task.time,
                    location=task.location,
                )
                task.google_calendar_event_id = calendar_event.get("id")
                logger.info(f"Created Google Calendar event {task.google_calendar_event_id} for task")

            # If task has a calendar event, update it
            elif task.google_calendar_event_id and task.sync_with_google_calendar:
                await update_calendar_event(
                    refresh_token=current_user.google_refresh_token,
                    event_id=task.google_calendar_event_id,
                    title=task.title,
                    description=task.description,
                    date=task.date,
                    time=task.time,
                    location=task.location,
                )
                logger.info(f"Updated Google Calendar event {task.google_calendar_event_id}")

            # If sync was disabled, delete the calendar event
            elif old_calendar_event_id and not task.sync_with_google_calendar:
                await delete_calendar_event(
                    refresh_token=current_user.google_refresh_token,
                    event_id=old_calendar_event_id,
                )
                task.google_calendar_event_id = None
                logger.info(f"Deleted Google Calendar event {old_calendar_event_id}")

        except Exception as e:
            logger.error(f"Failed to sync task changes to Google Calendar: {e}")
            # Don't fail task update if calendar sync fails

    db.commit()
    db.refresh(task)

    return TaskResponse.model_validate(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a task

    Also deletes the corresponding Google Calendar event if one exists.
    """
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Delete Google Calendar event if exists
    if task.google_calendar_event_id and current_user.google_refresh_token:
        try:
            await delete_calendar_event(
                refresh_token=current_user.google_refresh_token,
                event_id=task.google_calendar_event_id,
            )
            logger.info(f"Deleted Google Calendar event {task.google_calendar_event_id}")
        except Exception as e:
            logger.error(f"Failed to delete Google Calendar event: {e}")
            # Don't fail task deletion if calendar sync fails

    db.delete(task)
    db.commit()
    return None


@router.post("/{task_id}/sync-to-calendar", response_model=TaskResponse)
async def sync_task_to_calendar(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually sync an existing task to Google Calendar.

    Creates a new calendar event for the task if one doesn't exist.
    """
    if not current_user.google_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google not connected. Please sign in with Google to use calendar sync."
        )

    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    if task.google_calendar_event_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task is already synced to Google Calendar"
        )

    # Create calendar event
    calendar_event = await create_calendar_event(
        refresh_token=current_user.google_refresh_token,
        title=task.title,
        description=task.description,
        date=task.date,
        time=task.time,
        location=task.location,
    )

    task.google_calendar_event_id = calendar_event.get("id")
    task.sync_with_google_calendar = True

    db.commit()
    db.refresh(task)

    return TaskResponse.model_validate(task)


@router.delete("/{task_id}/unsync-from-calendar", response_model=TaskResponse)
async def unsync_task_from_calendar(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove a task's link to Google Calendar.

    Deletes the calendar event but keeps the task.
    """
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    if not task.google_calendar_event_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task is not synced to Google Calendar"
        )

    # Delete calendar event if user has Google connected
    if current_user.google_refresh_token:
        try:
            await delete_calendar_event(
                refresh_token=current_user.google_refresh_token,
                event_id=task.google_calendar_event_id,
            )
        except Exception as e:
            logger.error(f"Failed to delete calendar event: {e}")

    task.google_calendar_event_id = None
    task.sync_with_google_calendar = False

    db.commit()
    db.refresh(task)

    return TaskResponse.model_validate(task)


@router.get("/stats/summary", response_model=TaskStatsResponse)
def get_task_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get task statistics for dashboard

    Returns completion rates and task breakdowns by priority and category.
    """
    tasks = db.query(Task).filter(Task.user_id == current_user.id).all()

    total_tasks = len(tasks)
    completed_tasks = sum(1 for task in tasks if task.completed)
    pending_tasks = total_tasks - completed_tasks
    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0

    # Tasks by priority (total and completed)
    tasks_by_priority = {"high": 0, "medium": 0, "low": 0}
    completed_by_priority = {"high": 0, "medium": 0, "low": 0}
    for task in tasks:
        if task.priority in tasks_by_priority:
            tasks_by_priority[task.priority] += 1
            if task.completed:
                completed_by_priority[task.priority] += 1

    # Tasks by category
    tasks_by_category = {}
    for task in tasks:
        if task.category:
            cat_name = task.category.name
            tasks_by_category[cat_name] = tasks_by_category.get(cat_name, 0) + 1

    return TaskStatsResponse(
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        pending_tasks=pending_tasks,
        completion_rate=round(completion_rate, 1),
        tasks_by_priority=tasks_by_priority,
        completed_by_priority=completed_by_priority,
        tasks_by_category=tasks_by_category
    )


# Category routes
@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new category"""
    new_category = Category(
        **category_data.model_dump(),
        user_id=current_user.id
    )
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return CategoryResponse.model_validate(new_category)


@router.get("/categories", response_model=List[CategoryResponse])
def get_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all categories for the current user"""
    categories = db.query(Category).filter(Category.user_id == current_user.id).all()
    return [CategoryResponse.model_validate(cat) for cat in categories]


@router.put("/categories/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a category"""
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id
    ).first()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    # Update category fields
    for field, value in category_data.model_dump().items():
        setattr(category, field, value)

    db.commit()
    db.refresh(category)
    return CategoryResponse.model_validate(category)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a category"""
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id
    ).first()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    db.delete(category)
    db.commit()
    return None
