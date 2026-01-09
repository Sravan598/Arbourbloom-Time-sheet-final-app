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
- `/app/backend/server.py` - Main backend file
- `/app/frontend/src/components/chatbot/CORBot.jsx` - FAQ chatbot with drag persistence
- `/app/frontend/src/components/chat/` - CORChat components
- `/app/frontend/src/pages/employee/Leave.jsx` - Employee leave requests
- `/app/frontend/src/pages/admin/LeaveRequests.jsx` - Admin leave management

## Completed Work (This Session)
- [x] CORBot drag-and-drop enhancement with localStorage persistence
  - Position saved on drag end
  - Position restored on page load
  - Works for both floating button and chat panel

## Upcoming Tasks

### P0 - High Priority
1. **CORChat Phase 2**: Channel creation modal and message view
2. **CORChat Phase 3**: Real-time WebSocket messaging
3. **CORChat Phase 4**: Direct Messages and online status

### P1 - Medium Priority
1. **CORChat Phase 5**: Unread counts, search, attachments
2. **Daily Summary Email**: Automated work hour summaries
3. **Calendar Integration**: Google/Outlook sync

### P2 - Future
1. Shift Scheduling module
2. Employee Correction Requests for timesheets

## Test Credentials
- **Admin**: `admin@company.com` / `password123`
- **Employee**: Can be created via signup or use `test@test.com` / `password123`

## Known Issues
- React Three Fiber incompatibility (3D logo feature)
- During drag, CORBot may visually extend outside viewport (snaps back on release)

## Refactoring Needs
- `/app/backend/server.py` is monolithic - consider splitting into:
  - `/app/backend/routes/` for API routes
  - `/app/backend/models/` for data models
