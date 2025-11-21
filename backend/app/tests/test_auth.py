"""
Tests for authentication endpoints
"""
import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base, get_db

# Test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_register_user():
    """Test user registration"""
    unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    response = client.post(
        "/api/auth/register",
        json={
            "email": unique_email,
            "password": "testpass123",
            "full_name": "Test User"
        }
    )
    assert response.status_code == 201
    assert "access_token" in response.json()
    assert response.json()["user"]["email"] == unique_email


def test_register_duplicate_email():
    """Test registration with duplicate email fails"""
    unique_email = f"duplicate_{uuid.uuid4().hex[:8]}@example.com"
    # First registration
    client.post(
        "/api/auth/register",
        json={
            "email": unique_email,
            "password": "testpass123"
        }
    )

    # Second registration with same email
    response = client.post(
        "/api/auth/register",
        json={
            "email": unique_email,
            "password": "testpass123"
        }
    )
    assert response.status_code == 400


def test_login_success():
    """Test successful login"""
    unique_email = f"login_{uuid.uuid4().hex[:8]}@example.com"
    # Register user first
    client.post(
        "/api/auth/register",
        json={
            "email": unique_email,
            "password": "testpass123"
        }
    )

    # Login
    response = client.post(
        "/api/auth/login",
        json={
            "email": unique_email,
            "password": "testpass123"
        }
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_invalid_credentials():
    """Test login with invalid credentials fails"""
    response = client.post(
        "/api/auth/login",
        json={
            "email": "nonexistent@example.com",
            "password": "wrongpass"
        }
    )
    assert response.status_code == 401


def test_get_current_user():
    """Test getting current user info"""
    unique_email = f"current_{uuid.uuid4().hex[:8]}@example.com"
    # Register and get token
    response = client.post(
        "/api/auth/register",
        json={
            "email": unique_email,
            "password": "testpass123"
        }
    )
    token = response.json()["access_token"]

    # Get current user
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == unique_email
