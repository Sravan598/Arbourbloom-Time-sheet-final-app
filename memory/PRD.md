# CORtracker - Product Requirements Document

## Overview
CORtracker is a comprehensive time-tracking and workforce management application built with React frontend and FastAPI backend, using MongoDB for data storage.

## Core Features

### 1. Authentication & Authorization
- JWT-based authentication with role-based access control (RBAC)
- Admin and Employee roles
- Admin signup code: `CORTRACKER-ADMIN-2024`

### 2. Time Tracking
- Clock in/out functionality
- Break timer
- Timesheet management

### 3. Employee Management (Admin)
- View and manage employees
- Project assignment
- Team organization

### 4. Document Management
- Secure document upload and storage
- Document sharing between admin and employees

### 5. Leave/PTO Module
- Employee leave requests with custom leave types
- Admin approval/denial workflow
- Bell notification system for updates

### 6. CORChat - Team Communication
- Real-time team chat widget
- Phase 1 completed: Basic chat foundation
- Floating widget accessible from all pages

### 7. CORBot - FAQ Chatbot ✅ ENHANCED
- Draggable FAQ chatbot widget
- Pre-defined questions and answers about the application
- **Position Persistence**: Position saved to localStorage and restored on page reload
- Can be placed anywhere on the screen by dragging

### 8. Calendar Integration ✅ NEW (January 2025)
- **ICS Feed subscription** for calendar apps (Google Calendar, Outlook, Apple Calendar)
- **Personal Calendar**: Shows user's approved leave/PTO events
- **Team Calendar** (Admin only): Shows all team members' approved leave events
- Accessible from Profile → Calendar tab and Sidebar → Calendar Sync
- Features:
  - Copy calendar URL to clipboard
  - Regenerate URL for security
  - Download ICS file directly
  - Instructions for major calendar apps

## Technical Architecture

### Frontend
- React with TailwindCSS
- Framer Motion for animations and drag-and-drop
- Shadcn/UI components

### Backend
- FastAPI (Python)
- MongoDB database
- WebSocket support for real-time features

### Key Files
- `/app/backend/server.py` - Main backend file with Calendar API endpoints
- `/app/frontend/src/pages/Profile.jsx` - Profile page with Calendar tab
- `/app/frontend/src/components/employee/EmployeeSidebar.jsx` - Employee sidebar with Calendar Sync
- `/app/frontend/src/components/admin/AdminSidebar.jsx` - Admin sidebar with Calendar Sync
- `/app/frontend/src/components/chatbot/CORBot.jsx` - FAQ chatbot with drag persistence

### Calendar API Endpoints
- `GET /api/calendar/token` - Get calendar feed URLs (personal + team for admins)
- `GET /api/calendar/feed/{token}.ics` - Public ICS feed endpoint
- `POST /api/calendar/regenerate-token` - Regenerate calendar URL

## Upcoming Tasks

### P0 - High Priority
1. **CORChat Phase 2**: Channel creation modal and message view
2. **CORChat Phase 3**: Real-time WebSocket messaging
3. **CORChat Phase 4**: Direct Messages and online status

### P1 - Medium Priority
1. **CORChat Phase 5**: Unread counts, search, attachments
2. **Daily Summary Email**: Automated work hour summaries

### P2 - Future
1. Shift Scheduling module
2. Employee Correction Requests for timesheets

## Test Credentials
- **Admin**: `admin@company.com` / `password123`
- **Employee**: Create via signup

## Known Issues
- React Three Fiber incompatibility (3D logo feature)

## Refactoring Needs
- `/app/backend/server.py` is monolithic - consider splitting into routes/models/services
