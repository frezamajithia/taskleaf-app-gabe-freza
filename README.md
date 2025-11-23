# TaskLeaf - Calendar & Task Management Web Application

A modern full-stack web application for calendar and task management with integrated weather forecasting and Google Calendar synchronization.

**Tagline:** Plan simply. Live calmly.

## Project Overview

TaskLeaf is a comprehensive task and calendar management solution, much like some popular ones out there, that demonstrates modern web development practices including three-tier architecture, RESTful API design, JWT authentication, external API integration, and containerized deployment.

### Key Features

- **User Authentication:** Secure registration and login with JWT tokens, plus Google OAuth 2.0 integration
- **Task Management:** Full CRUD operations with priority levels, categories, and due dates
- **Calendar Integration:**
  - Visual calendar view for events and tasks
  - Google Calendar integration for event synchronization
  - Create, edit, and delete calendar events
- **Real-time Weather:** Location-based weather data via OpenWeatherMap API
- **Analytics Dashboard:** Task completion statistics and priority breakdowns
- **Theme Support:** Light and dark mode with smooth transitions
- **Responsive Design:** Mobile-first design that works on all device sizes

### Mock Features and Improvements:

- **Mock Notifications Panel:** Shows how the notifications would show if integrated with the backend.
- **Mock Settings Tab:** The current Settings tab is interactive and lets the use switch themes. A more comprehensive one would need implementation.
- **Mock Analytics Tab:** The current Analytics is great for demonstration, though ideally it would fetch the sample data in real time as a user uses the application more.
- **Additional Themes/UI Polishes:** The overall UI could be improved to have more themes, and/or have a more premium feel.

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

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- API keys for OpenWeatherMap and Google OAuth (see below)

### Running with Docker (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd taskleaf-app
```

2. Set up environment variables:
```bash
# Backend environment variables
cp backend/.env.example backend/.env
```

3. Edit `backend/.env` and add your API keys (see API Keys section below)

4. Start all services:
```bash
docker-compose up --build
```

The application will be available at:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/api/docs

### Running Tests

```bash
# Backend tests (all should pass)
docker-compose exec backend pytest app/tests/test_auth.py app/tests/test_tasks.py -v

# Frontend build test
cd frontend && npm run build
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
- `GET /api/auth/google/login` - Google OAuth login
- `GET /api/tasks/` - List all tasks
- `POST /api/tasks/` - Create new task
- `GET /api/calendar/events` - List calendar events
- `POST /api/calendar/events` - Create calendar event

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
