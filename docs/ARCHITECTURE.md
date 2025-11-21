# TaskLeaf Architecture Documentation

## Architectural Design Overview

TaskLeaf implements a **Three-Tier Architecture** pattern, providing clear separation of concerns between the presentation layer (frontend), business logic layer (backend), and data persistence layer (database). This architecture was chosen for its scalability, maintainability, and alignment with modern web application best practices.

### Architecture Pattern: Three-Tier with RESTful API

**Tier 1 - Presentation Layer:** Next.js/React frontend handling user interface and client-side logic
**Tier 2 - Application Layer:** FastAPI backend managing business logic, authentication, and external API integration
**Tier 3 - Data Layer:** PostgreSQL database providing persistent storage

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    TIER 1: Presentation Layer                    │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │   Next.js Frontend (React + TypeScript)                    │  │
│  │   - Pages & Components (UI)                                │  │
│  │   - State Management (Zustand)                             │  │
│  │   - API Client (Axios)                                     │  │
│  │   - Routing & Navigation                                   │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST API (JSON)
                              │ JWT Authentication
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   TIER 2: Application Layer                      │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │   FastAPI Backend (Python)                                 │  │
│  │                                                             │  │
│  │   ┌─────────────────────────────────────────────────────┐  │  │
│  │   │  API Routes Layer                                   │  │  │
│  │   │  - /api/auth/* (Authentication)                     │  │  │
│  │   │  - /api/tasks/* (Task CRUD)                         │  │  │
│  │   │  - /api/calendar/* (Calendar Events)                │  │  │
│  │   └─────────────────────────────────────────────────────┘  │  │
│  │                                                             │  │
│  │   ┌─────────────────────────────────────────────────────┐  │  │
│  │   │  Business Logic Layer                               │  │  │
│  │   │  - Authentication & Authorization (JWT)             │  │  │
│  │   │  - Task Management & Validation                     │  │  │
│  │   │  - Category Management                              │  │  │
│  │   │  - Event Management                                 │  │  │
│  │   └─────────────────────────────────────────────────────┘  │  │
│  │                                                             │  │
│  │   ┌─────────────────────────────────────────────────────┐  │  │
│  │   │  External Services Integration                      │  │  │
│  │   │  - OpenWeatherMap API (Weather Data)                │  │  │
│  │   │  - Google OAuth 2.0 (Authentication)                │  │  │
│  │   │  - Google Calendar API (Event Sync)                 │  │  │
│  │   └─────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ SQLAlchemy ORM
                              │ Database Connections
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     TIER 3: Data Layer                           │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │   PostgreSQL Relational Database                           │  │
│  │                                                             │  │
│  │   Tables:                                                   │  │
│  │   - users (authentication & profile data)                  │  │
│  │   - tasks (task/event data with weather)                   │  │
│  │   - categories (organization & classification)             │  │
│  │                                                             │  │
│  │   Features:                                                 │  │
│  │   - ACID compliance                                         │  │
│  │   - Foreign key constraints                                 │  │
│  │   - Indexed columns for performance                         │  │
│  │   - JSONB support for flexible data                         │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Separation of Concerns

### Frontend (Presentation Layer)
**Responsibility:** User interface, user experience, client-side state management

**Technologies:**
- Next.js 14 with App Router
- React 18 with TypeScript
- Tailwind CSS for styling
- Zustand for state management
- Axios for HTTP requests

**Key Principles:**
- No direct database access
- All data fetched via REST API
- Client-side validation for UX
- Stateful UI components
- Responsive design implementation

### Backend (Application Layer)
**Responsibility:** Business logic, authentication, authorization, external API integration

**Technologies:**
- FastAPI (Python 3.11)
- SQLAlchemy ORM
- JWT for authentication
- Pydantic for validation

**Key Principles:**
- No direct frontend rendering
- Stateless API design
- Server-side validation (authoritative)
- Database abstraction via ORM
- RESTful endpoint design

### Database (Data Layer)
**Responsibility:** Data persistence, data integrity, relational structure

**Technologies:**
- PostgreSQL 15
- ACID transactions
- Relational schema with constraints

**Key Principles:**
- No business logic in database
- Accessed only via ORM
- Enforces referential integrity
- Provides data persistence guarantees

## UML Package Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         TaskLeaf System                          │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  «package»                                                   │ │
│  │  frontend                                                    │ │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────┐         │ │
│  │  │    app     │  │    lib     │  │  components  │         │ │
│  │  ├────────────┤  ├────────────┤  ├──────────────┤         │ │
│  │  │ pages      │  │ api.ts     │  │ AppShell     │         │ │
│  │  │ routes     │  │ store.ts   │  │ UI components│         │ │
│  │  └────────────┘  └────────────┘  └──────────────┘         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                             │ uses                                │
│                             ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  «package»                                                   │ │
│  │  backend                                                     │ │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────┐         │ │
│  │  │   routes   │  │   models   │  │    core      │         │ │
│  │  ├────────────┤  ├────────────┤  ├──────────────┤         │ │
│  │  │ auth.py    │  │ user.py    │  │ config.py    │         │ │
│  │  │ tasks.py   │  │ task.py    │  │ database.py  │         │ │
│  │  │ calendar.py│  │ schemas.py │  │ security.py  │         │ │
│  │  └────────────┘  └────────────┘  └──────────────┘         │ │
│  │                                                              │ │
│  │  ┌────────────────────────────────┐                        │ │
│  │  │       services                 │                        │ │
│  │  ├────────────────────────────────┤                        │ │
│  │  │ weather.py                     │                        │ │
│  │  │ google_oauth.py                │                        │ │
│  │  │ google_calendar.py             │                        │ │
│  │  └────────────────────────────────┘                        │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                             │ uses                                │
│                             ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  «database»                                                  │ │
│  │  PostgreSQL                                                  │ │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────┐         │ │
│  │  │   users    │  │   tasks    │  │  categories  │         │ │
│  │  └────────────┘  └────────────┘  └──────────────┘         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  «external»                                                  │ │
│  │  External APIs                                               │ │
│  │  ┌──────────────────┐  ┌──────────────────┐                │ │
│  │  │ OpenWeatherMap   │  │  Google APIs     │                │ │
│  │  │    API           │  │  OAuth & Calendar│                │ │
│  │  └──────────────────┘  └──────────────────┘                │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## UML Class Diagram

```
┌──────────────────────────────┐
│          User                │
├──────────────────────────────┤
│ - id: Integer                │
│ - email: String (unique)     │
│ - full_name: String          │
│ - hashed_password: String    │
│ - google_id: String          │
│ - google_refresh_token: Str  │
│ - profile_picture: String    │
│ - is_active: Boolean         │
│ - created_at: DateTime       │
├──────────────────────────────┤
│ + authenticate()             │
│ + verify_password()          │
│ + get_tasks()                │
│ + get_categories()           │
└──────────────────────────────┘
           │
           │ 1          *
           │ owns
           ▼
┌──────────────────────────────┐        ┌──────────────────────────────┐
│         Task                 │        │        Category              │
├──────────────────────────────┤        ├──────────────────────────────┤
│ - id: Integer                │   *    │ - id: Integer                │
│ - title: String (required)   │───────▶│ - name: String (required)    │
│ - description: Text          │belongs │ - color: String              │
│ - date: DateTime             │   to   │ - user_id: Integer (FK)      │
│ - time: String               │   1    │ - created_at: DateTime       │
│ - completed: Boolean         │        ├──────────────────────────────┤
│ - priority: Enum             │        │ + create()                   │
│   (high/medium/low)          │        │ + update()                   │
│ - location: String           │        │ + delete()                   │
│ - weather_data: JSONB        │        └──────────────────────────────┘
│ - user_id: Integer (FK)      │                    ▲
│ - category_id: Integer (FK)  │                    │
│ - google_event_id: String    │                    │ 1
│ - created_at: DateTime       │                    │
│ - updated_at: DateTime       │                    │ owns
├──────────────────────────────┤                    │
│ + create()                   │                    │
│ + update()                   │                    │
│ + delete()                   │        ┌───────────┴──────────────────┐
│ + fetch_weather()            │        │          User                │
│ + sync_to_google_calendar()  │        │   (referenced above)         │
│ + mark_complete()            │        └──────────────────────────────┘
└──────────────────────────────┘

┌──────────────────────────────┐
│      UserResponse            │ (Pydantic Schema)
├──────────────────────────────┤
│ + id: int                    │
│ + email: str                 │
│ + full_name: Optional[str]   │
│ + is_active: bool            │
│ + created_at: datetime       │
│ + profile_picture: Opt[str]  │
└──────────────────────────────┘

┌──────────────────────────────┐
│      TaskResponse            │ (Pydantic Schema)
├──────────────────────────────┤
│ + id: int                    │
│ + title: str                 │
│ + description: Optional[str] │
│ + date: Optional[datetime]   │
│ + completed: bool            │
│ + priority: str              │
│ + weather_data: Optional[dict]│
│ + category: Optional[Category]│
└──────────────────────────────┘

Relationships:
- User has many Tasks (1:N) - CASCADE DELETE
- User has many Categories (1:N) - CASCADE DELETE
- Task belongs to one User (N:1) - REQUIRED
- Task belongs to one Category (N:1) - OPTIONAL (SET NULL)
- Task has one Weather data (1:1) - EMBEDDED JSON
```

## Request/Response Flow Diagram

### Authentication Flow
```
┌──────┐                ┌──────────┐               ┌─────────┐           ┌──────────┐
│Client│                │ Frontend │               │ Backend │           │ Database │
└──┬───┘                └────┬─────┘               └────┬────┘           └────┬─────┘
   │                         │                          │                     │
   │ 1. Enter Credentials    │                          │                     │
   ├────────────────────────▶│                          │                     │
   │                         │                          │                     │
   │                         │ 2. POST /api/auth/login  │                     │
   │                         ├─────────────────────────▶│                     │
   │                         │    {email, password}     │                     │
   │                         │                          │                     │
   │                         │                          │ 3. Query user       │
   │                         │                          ├────────────────────▶│
   │                         │                          │                     │
   │                         │                          │ 4. Return user data │
   │                         │                          │◀────────────────────┤
   │                         │                          │                     │
   │                         │                          │ 5. Verify password  │
   │                         │                          │    (bcrypt)         │
   │                         │                          │                     │
   │                         │                          │ 6. Generate JWT     │
   │                         │                          │    token            │
   │                         │                          │                     │
   │                         │ 7. Return token + user   │                     │
   │                         │◀─────────────────────────┤                     │
   │                         │    Set HTTP-only cookie  │                     │
   │                         │                          │                     │
   │ 8. Store auth state     │                          │                     │
   │◀────────────────────────┤                          │                     │
   │    Redirect to dashboard│                          │                     │
   │                         │                          │                     │
```

### Task Creation with Weather Integration
```
┌──────┐     ┌──────────┐     ┌─────────┐     ┌──────────┐     ┌──────────────┐
│Client│     │ Frontend │     │ Backend │     │ Database │     │ Weather API  │
└──┬───┘     └────┬─────┘     └────┬────┘     └────┬─────┘     └──────┬───────┘
   │              │                 │                │                  │
   │ 1. Fill form │                 │                │                  │
   ├─────────────▶│                 │                │                  │
   │              │                 │                │                  │
   │              │ 2. POST /tasks  │                │                  │
   │              ├────────────────▶│                │                  │
   │              │  + JWT token    │                │                  │
   │              │                 │                │                  │
   │              │                 │ 3. Verify JWT  │                  │
   │              │                 │                │                  │
   │              │                 │ 4. INSERT task │                  │
   │              │                 ├───────────────▶│                  │
   │              │                 │                │                  │
   │              │                 │ 5. Return task │                  │
   │              │                 │◀───────────────┤                  │
   │              │                 │                │                  │
   │              │                 │ 6. GET weather (if location set)  │
   │              │                 ├──────────────────────────────────▶│
   │              │                 │                │                  │
   │              │                 │ 7. Return weather data            │
   │              │                 │◀──────────────────────────────────┤
   │              │                 │                │                  │
   │              │                 │ 8. UPDATE task │                  │
   │              │                 │  with weather  │                  │
   │              │                 ├───────────────▶│                  │
   │              │                 │                │                  │
   │              │ 9. Return task  │                │                  │
   │              │   + weather     │                │                  │
   │              │◀────────────────┤                │                  │
   │              │                 │                │                  │
   │ 10. Update UI│                 │                │                  │
   │◀─────────────┤                 │                │                  │
   │              │                 │                │                  │
```

## Database Schema and Relationships

```sql
-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    hashed_password VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    google_refresh_token TEXT,
    profile_picture VARCHAR(512),
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categories Table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#609A93',
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, user_id)
);

-- Tasks Table
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date TIMESTAMP WITH TIME ZONE,
    time VARCHAR(10),
    completed BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    location VARCHAR(255),
    weather_data JSONB,
    google_event_id VARCHAR(255),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_date ON tasks(date);
CREATE INDEX idx_tasks_completed ON tasks(completed);
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
```

## API Endpoints Architecture

### Authentication Endpoints
- `POST /api/auth/register` - User registration with email/password
- `POST /api/auth/login` - User login with JWT token generation
- `GET /api/auth/me` - Get current authenticated user
- `POST /api/auth/logout` - Logout user and clear session
- `GET /api/auth/google/login` - Initiate Google OAuth flow
- `GET /api/auth/google/callback` - Handle Google OAuth callback

### Task Management Endpoints
- `GET /api/tasks/` - List all tasks for authenticated user
- `POST /api/tasks/` - Create new task (with weather integration)
- `GET /api/tasks/{id}` - Get specific task details
- `PUT /api/tasks/{id}` - Update existing task
- `DELETE /api/tasks/{id}` - Delete task
- `GET /api/tasks/stats/summary` - Get task statistics and analytics

### Calendar Endpoints
- `GET /api/calendar/events` - List calendar events (includes Google Calendar sync)
- `POST /api/calendar/events` - Create new calendar event
- `PUT /api/calendar/events/{id}` - Update calendar event
- `DELETE /api/calendar/events/{id}` - Delete calendar event

### Category Endpoints
- `GET /api/tasks/categories` - List all categories
- `POST /api/tasks/categories` - Create new category

## External API Integration Architecture

### OpenWeatherMap API
```
Backend Service → OpenWeatherMap API
                  ↓
          Fetch weather by location
                  ↓
          Parse response (temp, desc, etc.)
                  ↓
          Store as JSONB in task.weather_data
```

### Google OAuth & Calendar API
```
User → Frontend → Backend → Google OAuth
                              ↓
                    Get access_token + refresh_token
                              ↓
                    Store refresh_token in users table
                              ↓
                    Use refresh_token for Calendar API
                              ↓
                    Sync events bidirectionally
```

## Security Architecture

### Authentication Layer
- **JWT Tokens:** Stateless authentication with 7-day expiration
- **HTTP-only Cookies:** Prevents XSS attacks on tokens
- **bcrypt Hashing:** Industry-standard password hashing (cost factor: 12)
- **Google OAuth 2.0:** Third-party authentication with refresh tokens

### Authorization Layer
- **Role-based Access:** User-specific data isolation
- **JWT Verification:** All protected routes verify token validity
- **Database Constraints:** Foreign keys enforce data ownership

### Data Protection
- **SQL Injection:** Prevented via SQLAlchemy ORM parameterization
- **XSS Protection:** React auto-escaping + CSP headers
- **CORS Policy:** Whitelist allowed origins only
- **HTTPS Enforcement:** Required in production
- **Input Validation:** Pydantic schemas validate all inputs

## Performance Architecture

### Database Optimization
- **Indexing Strategy:** Foreign keys, date fields, email fields indexed
- **Connection Pooling:** SQLAlchemy manages connection pool (5-20 connections)
- **Query Optimization:** ORM uses lazy loading and eager loading where appropriate
- **JSONB for Flexibility:** Weather data stored as JSONB for fast queries

### Frontend Optimization
- **Code Splitting:** Next.js automatic route-based splitting
- **Image Optimization:** Next.js Image component with lazy loading
- **Static Generation:** Build-time page generation where possible
- **Client-side Caching:** Zustand state prevents redundant API calls

### API Optimization
- **Response Compression:** Gzip/Brotli enabled
- **Pagination:** Large result sets use cursor-based pagination
- **Async Processing:** FastAPI async endpoints for I/O operations
- **Rate Limiting:** Production rate limits prevent abuse

## Deployment Architecture

### Development Environment
```
Docker Compose Local Environment
├── PostgreSQL Container (port 5432)
│   └── Volume: postgres_data (persistent)
├── Backend Container (port 8000)
│   ├── Hot reload enabled
│   └── Volume: ./backend (code sync)
└── Frontend Container (port 3000)
    ├── Hot reload enabled
    └── Volume: ./frontend (code sync)
```

### Production Environment
```
┌─────────────────────┐
│   Vercel CDN        │ ← Next.js Frontend
│   - Edge Network    │    (Static + SSR)
│   - Auto-scaling    │
└──────────┬──────────┘
           │ HTTPS
           ▼
┌─────────────────────┐
│   Railway Platform  │ ← FastAPI Backend
│   - Container Host  │    (Dockerized)
│   - Auto-deploy     │
└──────────┬──────────┘
           │ Internal Network
           ▼
┌─────────────────────┐
│ PostgreSQL Database │ ← Railway Managed DB
│   - Automated       │    (Production)
│     backups         │
│   - Connection pool │
└─────────────────────┘
```

## Scalability Considerations

### Horizontal Scaling
- **Stateless Backend:** Multiple backend instances can run concurrently
- **Database Connection Pool:** Efficient connection reuse across instances
- **CDN Distribution:** Frontend assets cached at edge locations globally

### Vertical Scaling
- **Database:** PostgreSQL supports read replicas for query distribution
- **Backend:** Railway supports container size upgrades
- **Frontend:** Vercel Edge Network handles traffic automatically

### Future Enhancements
- **Redis Caching:** Add Redis for session and query result caching
- **Background Jobs:** Celery/RQ for async task processing
- **WebSocket Support:** Real-time updates for collaborative features
- **Microservices:** Split weather/calendar services into separate microservices

---

**Document Purpose:** This document serves as the architectural reference for the TaskLeaf application, demonstrating clear three-tier architecture implementation with proper separation of concerns, comprehensive UML diagrams, and production-ready design patterns for CSCI 4230U Advanced Web Development.

**Document Version:** 2.0
**Last Updated:** November 2024
**Author:** TaskLeaf Development Team
