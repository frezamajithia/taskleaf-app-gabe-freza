"""
Tests for tasks endpoints
"""
import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture
def auth_token():
    """Create a user and return auth token"""
    # Use unique email for each test to avoid conflicts
    unique_email = f"taskuser_{uuid.uuid4().hex[:8]}@example.com"
    response = client.post(
        "/api/auth/register",
        json={
            "email": unique_email,
            "password": "testpass123"
        }
    )
    return response.json()["access_token"]


def test_create_task(auth_token):
    """Test creating a new task"""
    response = client.post(
        "/api/tasks/",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={
            "title": "Test Task",
            "description": "Test description",
            "priority": "high"
        }
    )
    assert response.status_code == 201
    assert response.json()["title"] == "Test Task"
    assert response.json()["completed"] == False


def test_get_tasks(auth_token):
    """Test getting all tasks"""
    # Create a task first
    client.post(
        "/api/tasks/",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"title": "Task 1"}
    )
    
    # Get tasks
    response = client.get(
        "/api/tasks/",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_update_task(auth_token):
    """Test updating a task"""
    # Create task
    create_response = client.post(
        "/api/tasks/",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"title": "Original Title"}
    )
    task_id = create_response.json()["id"]
    
    # Update task
    response = client.put(
        f"/api/tasks/{task_id}",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={
            "title": "Updated Title",
            "completed": True
        }
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Updated Title"
    assert response.json()["completed"] == True


def test_delete_task(auth_token):
    """Test deleting a task"""
    # Create task
    create_response = client.post(
        "/api/tasks/",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"title": "Task to Delete"}
    )
    task_id = create_response.json()["id"]
    
    # Delete task
    response = client.delete(
        f"/api/tasks/{task_id}",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 204
    
    # Verify deletion
    get_response = client.get(
        f"/api/tasks/{task_id}",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert get_response.status_code == 404


def test_get_task_stats(auth_token):
    """Test getting task statistics"""
    # Create some tasks
    client.post(
        "/api/tasks/",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"title": "Task 1", "completed": True}
    )
    client.post(
        "/api/tasks/",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"title": "Task 2", "completed": False}
    )
    
    # Get stats
    response = client.get(
        "/api/tasks/stats/summary",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "total_tasks" in data
    assert "completed_tasks" in data
    assert "completion_rate" in data


def test_unauthorized_access():
    """Test that unauthorized requests are rejected"""
    response = client.get("/api/tasks/")
    assert response.status_code == 401
