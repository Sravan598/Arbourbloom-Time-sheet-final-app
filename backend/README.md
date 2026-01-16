# CORtracker Backend

## Directory Structure

```
/app/backend/
├── server.py           # Main application (legacy monolith - 7000+ lines)
├── main.py             # New entry point (for future use)
├── core/               # Core utilities
│   ├── __init__.py     # Exports all core modules
│   ├── config.py       # Application settings
│   ├── database.py     # MongoDB connection
│   └── auth.py         # Authentication utilities
├── models/             # Pydantic models
│   ├── __init__.py     # Exports all models
│   ├── enums.py        # Enum definitions
│   ├── user.py         # User models
│   ├── timesheet.py    # Timesheet models
│   ├── leave.py        # Leave/PTO models
│   ├── project.py      # Project models
│   ├── chat.py         # Chat models
│   ├── ticket.py       # Ticket models
│   ├── notification.py # Notification models
│   ├── announcement.py # Announcement models
│   ├── document.py     # Document models
│   ├── calendar.py     # Calendar/Holiday models
│   └── status.py       # Status check models
├── services/           # Business logic
│   ├── __init__.py     # Exports all services
│   ├── notification.py # Notification service
│   └── utils.py        # Utility functions
├── routes/             # API routes (future migration)
│   └── __init__.py     # Route aggregator
└── assets/
    └── cortracker_logo.png
```

## Usage

### Import from modules

```python
# Core imports
from core import db, settings, get_current_user, require_admin

# Model imports
from models import UserRole, Ticket, TicketCreate, LeaveRequest

# Service imports
from services import create_notification, serialize_datetime
```

### Current State

- `server.py` contains all routes (7000+ lines)
- Models and core utilities have been extracted to modules
- Routes will be migrated incrementally in future updates

### Migration Plan

1. ✅ Phase 1: Extract core utilities (config, database, auth)
2. ✅ Phase 2: Extract Pydantic models
3. ✅ Phase 3: Extract services
4. 🔄 Phase 4: Migrate routes (in progress)

### Running the Server

```bash
# Development (with hot reload)
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Production
uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4
```

### Environment Variables

Required in `.env`:
- `MONGO_URL` - MongoDB connection string
- `DB_NAME` - Database name
- `JWT_SECRET` - JWT signing secret (optional, has default)

### API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8001/docs`
- ReDoc: `http://localhost:8001/redoc`
