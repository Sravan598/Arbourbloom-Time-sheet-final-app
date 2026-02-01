# AurborBloom HRMS Backend

Multi-tenant Human Resource Management System built with FastAPI, MongoDB, and Python.

## Directory Structure

```
/app/backend/
├── server.py           # Main application (11,000+ lines - being refactored)
├── main.py             # Entry point (imports from server.py)
├── config.py           # Centralized configuration
├── database.py         # MongoDB connection
├── models/             # Pydantic models
│   ├── __init__.py     # Exports all models
│   ├── enums.py        # All enum definitions
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
│   ├── status.py       # Status check models
│   ├── tenant.py       # Multi-tenant models
│   ├── security.py     # Security audit models
│   ├── webhook.py      # Webhook models
│   └── ssl.py          # SSL certificate models
├── services/           # Business logic services
│   ├── __init__.py     # Exports all services
│   ├── audit.py        # Security audit logging
│   ├── webhook.py      # Webhook delivery
│   ├── rate_limit.py   # API rate limiting
│   ├── notification.py # Notification service
│   └── utils.py        # Utility functions
├── routes/             # API routes (being migrated)
│   ├── __init__.py     # Route aggregator
│   ├── auth.py         # Authentication routes
│   └── tenants.py      # Tenant management routes
├── utils/              # Helper utilities
│   ├── __init__.py     # Exports all utils
│   ├── auth.py         # JWT authentication
│   └── helpers.py      # Common helpers
├── assets/
│   └── aurborbloom_logo.png
└── requirements.txt
```

## Quick Start

### Import Examples

```python
# Configuration
from config import MONGO_URL, JWT_SECRET, DEFAULT_TENANT_SLUG

# Database
from database import db

# Models
from models import UserRole, Tenant, Ticket, LeaveRequest
from models.enums import TicketStatus, TicketPriority

# Services
from services import log_audit_event, trigger_webhooks, check_rate_limit

# Utilities
from utils import create_token, get_current_user, require_admin
from utils.helpers import hash_password, verify_password
```

## Current Architecture

### Multi-Tenancy
- Shared database with tenant isolation via `tenant_id` field
- Each tenant has custom branding (logo, colors, name)
- Three active tenants: AurborBloom, Perfect Solutions, Knowvia Tech

### Security Features
- JWT-based authentication
- Role-based access control (SUPER_ADMIN, ADMIN, EMPLOYEE)
- Per-tenant data encryption
- Security audit logging
- API rate limiting

### SaaS Features
- Webhooks for external integrations
- Usage metrics tracking
- Custom domain support with SSL

## Refactoring Status

### Completed ✅
1. Configuration centralized in `config.py`
2. Database connection in `database.py`
3. All Pydantic models extracted to `/models/`
4. Business services extracted to `/services/`
5. Auth utilities in `/utils/auth.py`
6. Helper functions in `/utils/helpers.py`

### In Progress 🔄
- Routes being migrated from `server.py` to `/routes/`

### Migration Strategy
Routes are being migrated incrementally while keeping `server.py` functional.
Once routes are fully moved, `main.py` will create its own FastAPI app.

## Environment Variables

Required in `.env`:
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="*"
SUPER_ADMIN_CODE="AURBORBLOOM-SUPER-2025"
EMERGENT_LLM_KEY="your-emergent-key"
ENCRYPTION_KEY="your-32-char-encryption-key"
```

## Running the Server

```bash
# Development (with hot reload)
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Production
uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4
```

## API Documentation

Once running:
- Swagger UI: `http://localhost:8001/docs`
- ReDoc: `http://localhost:8001/redoc`

## Key Endpoints

| Endpoint | Description |
|----------|-------------|
| POST /api/auth/login | User authentication |
| POST /api/auth/signup | User registration |
| GET /api/tenants/public | List active tenants |
| GET /api/admin/employees | List employees (admin) |
| POST /api/employee/clock-in | Clock in |
| GET /api/tickets | List tickets |
| POST /api/leave-requests | Submit leave request |

## Test Credentials

- **Super Admin**: superadmin@aurborbloom.com / superadmin123
- **AurborBloom Admin**: admin@company.com / password123
- **Perfect Solutions Admin**: admin@perfectsolutions.com / admin123
- **Knowvia Tech Admin**: admin@knowviatech.com / admin123
