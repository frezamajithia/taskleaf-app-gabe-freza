# TaskLeaf - Calendar & Task Management Web Application

A modern full-stack web application for calendar and task management with integrated weather forecasting and Google Calendar synchronization.

**Tagline:** Plan simply. Live calmly.

## Project Overview

TaskLeaf is a comprehensive task and calendar management solution, much like some popular ones out there, that demonstrates modern web development practices including three-tier architecture, RESTful API design, JWT authentication, external API integration, and containerized deployment.

### Key Features

- **User Authentication:** Secure registration and login with JWT tokens, plus Google OAuth 2.0 integration
  - Password reset functionality for email/password accounts (users who signed up with email and password can reset their password via a secure link; users who signed up with Google should use "Continue with Google" to log in, as their authentication is managed by Google)
  - Demo mode displays the reset link directly on screen for testing purposes, since no email service is configured
- **Task Management:** Full CRUD operations with priority levels, categories, and due dates
  - Bulk selection mode for managing multiple tasks at once
  - Batch operations: mark complete, delete selected tasks
- **Calendar Integration:**
  - Visual calendar with month, week, and day views
  - Pill-style view switcher for seamless navigation between calendar views
  - Google Calendar two-way synchronization
  - Create, edit, and delete calendar events
  - Recurring events support (daily, weekly, monthly, yearly) with Google Calendar sync
  - Recurring events display up to 6 months ahead and 6 months back from the current date
  - Event hover tooltips for quick preview
  - Note: Google Calendar events are read-only within TaskLeaf; to edit or delete them, use Google Calendar directly
- **Notification System:**
  - Toast notifications for user actions (task/event create, update, delete)
  - Persistent notification bell with notification history
  - Notifications stored in localStorage for persistence across sessions
- **Real-time Weather:** Location-based weather data via OpenWeatherMap API
- **Analytics Dashboard:** Task completion statistics and priority breakdowns
- **Theme Support:** Light and dark mode with smooth transitions
- **UI Polish:** Micro-interactions, hover effects, loading states, and animations throughout the interface
- **Responsive Design:** Mobile-first design that works on all device sizes
- **Analytics Enhancement:** The current Analytics dashboard provides demonstration data. Real-time data aggregation as users interact with the application would be beneficial.
- **Pomodoro Timer:** Pomodoro Timer Page to track a users focus
### Future Improvements

- **Settings Tab:** The current Settings tab is interactive and allows theme switching. A more comprehensive settings panel with user preferences could be implemented.
- **Additional Themes:** The UI could be extended to support additional color themes beyond light and dark mode.
- **Email Service Integration:** Backend integration for email delivery (password reset emails, notifications, and reminders). Currently, password reset works but displays the reset link on screen instead of sending an email, which is suitable for demonstration purposes.

## Technology Stack

### Frontend
- **Next.js 14** (React 18, App Router) with TypeScript
- **Tailwind CSS & shadcn UI Components** for styling with custom theme
- **Zustand** for state management
- **Framer Motion** for animations
- **Axios** for HTTP requests

### Backend
- **FastAPI** (Python 3.11) with async support
- **SQLAlchemy** ORM for database operations
- **PostgreSQL 15** database
- **JWT** authentication with HTTP-only cookies
- **bcrypt** password hashing via passlib

### External APIs
- **OpenWeatherMap API** - Real-time weather data
- **Google Calendar API** - Calendar event synchronization
- **Google OAuth 2.0** - Social authentication

### DevOps
- **Docker & Docker Compose** for containerization
- **pytest** for backend testing (11 unit/integration tests)
- **GitHub Actions** for CI/CD
- **Vercel** (frontend deployment)
- **Railway** (backend deployment)

## Quick Start (Local Development with Docker)

### Prerequisites
- **Docker** and **Docker Compose** installed
- API keys for OpenWeatherMap and Google OAuth (see [API Keys](#api-keys) section below)

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd taskleaf-app-gabe-freza
```

### Step 2: Set Up Backend Environment Variables

```bash
cp backend/.env.example backend/.env
```

**Edit `backend/.env`** and add your API keys:

```env
# Application
APP_NAME=TaskLeaf API
APP_VERSION=1.0.0
DEBUG=True

# Database (already configured for Docker)
DATABASE_URL=postgresql://taskleaf:taskleaf123@db:5432/taskleaf_db

# JWT Secret (generate a random string for security)
SECRET_KEY=your-secret-key-at-least-32-characters-long
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000

# Frontend URL (for OAuth redirects)
FRONTEND_URL=http://localhost:3000

# OpenWeatherMap API (get from https://openweathermap.org/api)
OPENWEATHER_API_KEY=your-openweather-api-key
OPENWEATHER_BASE_URL=https://api.openweathermap.org/data/2.5

# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
```

### Step 3: Start All Services with Docker

```bash
docker-compose up --build
```

This command will:
- Build the frontend (Next.js) container
- Build the backend (FastAPI) container
- Start the PostgreSQL database container
- Set up networking between all services

### Step 4: Access the Application

Once all containers are running, open your browser:

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:8000 |
| **API Documentation (Swagger)** | http://localhost:8000/api/docs |
| **API Documentation (ReDoc)** | http://localhost:8000/api/redoc |

### Step 5: Verify Everything Works

1. Open http://localhost:3000 in your browser
2. Register a new account or sign in with Google
3. Create a task to verify the backend connection
4. Check the API docs at http://localhost:8000/api/docs

### Stopping the Application

```bash
# Stop all containers
docker-compose down

# Stop and remove volumes (resets database)
docker-compose down -v
```

### Rebuilding After Code Changes

```bash
# Rebuild and restart
docker-compose up --build
```

> **Note:** If you encounter issues, see the [Troubleshooting](#troubleshooting) section below.

---

## Running Tests

```bash
# Run backend tests (with Docker running)
docker-compose exec backend pytest app/tests/test_auth.py app/tests/test_tasks.py -v

# Run all backend tests
docker-compose exec backend pytest app/tests/ -v

# Frontend build test
docker-compose exec frontend npm run build
```

## API Keys

This application requires API keys for full functionality:

### OpenWeatherMap API
1. Sign up at https://openweathermap.org/api
2. Copy your API key to `backend/.env` as `OPENWEATHER_API_KEY`

### Google OAuth & Calendar API
1. Go to https://console.cloud.google.com/
2. Create a new project or select existing one
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Add to `backend/.env`:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback`

**For TA/Professor:** API keys will be shared via Slack or email for evaluation purposes. Alternatively, you can generate your own keys using the instructions above.

## Environment Variables

Required variables in `backend/.env`:

```env
DATABASE_URL=postgresql://taskleaf:taskleaf123@db:5432/taskleaf_db
SECRET_KEY=your-secret-key-min-32-chars-long
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000

# API Keys (will be provided separately)
OPENWEATHER_API_KEY=your_key_here
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
```

## Project Architecture

TaskLeaf implements a **three-tier architecture**:

1. **Client Layer** (Next.js/React) - Presentation and user interface
2. **Application Layer** (FastAPI) - Business logic and API endpoints
3. **Data Layer** (PostgreSQL) - Data persistence and storage

### Key Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/google/login` - Google OAuth login
- `GET /api/tasks/` - List all tasks
- `POST /api/tasks/` - Create new task
- `DELETE /api/tasks/bulk` - Bulk delete tasks
- `GET /api/calendar/events` - List calendar events
- `POST /api/calendar/events` - Create calendar event
- `POST /pomodoro/sessions` - Create Sessions
- `GET /pomdoro/sessions/active` - Get Each Active Pomodoro Session
- `GET /pomdoro/sessions` - Get all pomodoro sessions
- `GET /pomdoro/stats` - Get pomdoro statistics

### API Documentation

**Interactive API Documentation (Swagger UI):** http://localhost:8000/api/docs

**Alternative API Documentation (ReDoc):** http://localhost:8000/api/redoc

The backend automatically generates comprehensive API documentation using FastAPI's built-in OpenAPI support. When the application is running, visit the Swagger UI endpoint for an interactive interface to:
- View all available endpoints
- See request/response schemas
- Test API calls directly from the browser
- View authentication requirements

## Testing

The application includes comprehensive testing:

- **Backend:** 11 unit and integration tests covering authentication and task management
- **Test Coverage:** Auth endpoints, task CRUD operations, unauthorized access
- **All tests passing** with unique UUID-based fixtures to prevent conflicts

Run tests:
```bash
docker-compose exec backend pytest app/tests/ -v
```
## Performance Optimization

### Google PageSpeed Insights Report (Desktop)
https://pagespeed.web.dev/analysis/https-taskleaf-app-gabe-freza-vercel-app/z9k338wxhy?form_factor=desktop

## Database Schema

### Users Table
- Authentication and profile information
- Supports both email/password and Google OAuth
- Stores Google refresh tokens for Calendar API access

### Tasks Table
- Task details with priority, due dates, and categories
- Linked to users with CASCADE delete
- Optional weather data (JSONB) based on location

### Calendar Events Table
- Event details with start/end times
- Google Calendar event synchronization
- User-specific event management

## Development Notes

- **Frontend runs on port 3000** with hot-reload enabled
- **Backend runs on port 8000** with auto-reload enabled
- **PostgreSQL runs on port 5432** with persistent volume
- **Dark mode** implemented throughout the application
- **Responsive design** tested on desktop, tablet, and mobile
- **UI polish** includes smooth animations, hover effects, and transition states throughout the interface
- **Password reset** is available only for accounts created with email/password registration. Google OAuth users do not have a password stored in the system (their authentication is handled by Google), so they are prompted to use "Continue with Google" instead. In demo mode, the reset link is displayed on screen since no email service is configured

## Troubleshooting

### Common Issues

**Docker containers won't start**
- Ensure Docker Desktop is running
- Try `docker-compose down -v` then `docker-compose up --build` to start fresh
- Check if ports 3000, 8000, or 5432 are already in use: `lsof -i :3000`

**"CORS error" or "Network Error" in frontend**
- Ensure `ALLOWED_ORIGINS` in `backend/.env` includes `http://localhost:3000`
- Verify backend container is running: `docker-compose ps`
- Check backend logs: `docker-compose logs backend`

**"Connection refused" to database**
- Ensure `DATABASE_URL` uses `db` as the host (not `localhost`): `@db:5432`
- Wait for PostgreSQL container to fully initialize (check logs: `docker-compose logs db`)
- Try restarting: `docker-compose restart`

**Google OAuth not working locally**
- Ensure `DEBUG=True` in `backend/.env` for local development
- Verify `GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback`
- In Google Cloud Console, add to **Authorized JavaScript origins**:
  - `http://localhost:8000`
  - `http://localhost:3000`
- In Google Cloud Console, add to **Authorized redirect URIs**:
  - `http://localhost:8000/api/auth/google/callback`

**Changes not reflecting after code update**
- Rebuild containers: `docker-compose up --build`
- For frontend changes, the container has hot-reload enabled
- For backend changes, the container has auto-reload enabled

**Weather data not showing**
- Verify `OPENWEATHER_API_KEY` is set in `backend/.env`
- Free tier API keys may take a few minutes to activate after creation
- Check backend logs for API errors: `docker-compose logs backend`

**Database data persists after code changes**
- Data is stored in a Docker volume
- To reset database: `docker-compose down -v` then `docker-compose up --build`

## Additional Documentation

- `docs/ARCHITECTURE.md` - Detailed architecture diagrams and design decisions
- `docs/DEPLOYMENT.md` - Step-by-step deployment guide

## Team Members & Contributions

**Team Members:**
- Gabe Manaog - 50% (all areas)
- Freza Majithia - 50% (all areas)

## Acknowledgments

Built by Freza Majithia & Gabe Manaog for CSCI 4230U Advanced Web Development Final Project at Ontario Tech University

## License

This project is licensed for educational purposes.
