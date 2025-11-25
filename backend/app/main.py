"""
TaskLeaf FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.core.database import engine, Base
from app.routes import auth, tasks, calendar

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="TaskLeaf API - A modern calendar and task management system",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Add session middleware (required for OAuth)
# In development (DEBUG=True), allow non-HTTPS for localhost testing
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    session_cookie="session",
    max_age=14 * 24 * 60 * 60,  # 14 days
    same_site="lax" if settings.DEBUG else "none",  # lax for dev, none for prod
    https_only=not settings.DEBUG  # False for local dev, True for production
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(tasks.router, prefix="/api/tasks")
app.include_router(calendar.router, prefix="/api/calendar")


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "Welcome to TaskLeaf API",
        "version": settings.APP_VERSION,
        "docs": "/api/docs"
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "app": settings.APP_NAME}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
