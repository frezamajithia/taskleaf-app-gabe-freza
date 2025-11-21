"""
Tasks API routes
"""
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
    
    # Update task fields
    update_data = task_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)
    
    # Update weather if location changed
    if task_data.location and task_data.location != task.location:
        weather_data = await weather_service.get_weather(task_data.location)
        if weather_data:
            task.weather_data = weather_data
    
    db.commit()
    db.refresh(task)
    
    return TaskResponse.model_validate(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a task
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
    
    db.delete(task)
    db.commit()
    return None


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
    
    # Tasks by priority
    tasks_by_priority = {"high": 0, "medium": 0, "low": 0}
    for task in tasks:
        if task.priority in tasks_by_priority:
            tasks_by_priority[task.priority] += 1
    
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
