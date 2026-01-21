# AurborBloom - Product Requirements Document

## Overview
AurborBloom is a comprehensive Human Resource Management System (HRMS) built with React frontend and FastAPI backend, using MongoDB for data storage.

**Rebranded from CORtracker to AurborBloom - January 2025**
**Brand Colors: Black (#000000) and Gold (#D4AF37)**

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

### 6. CORChat - Team Communication ✅ COMPLETE (January 2025)
- **Phase 1**: Basic chat foundation - channels, DMs, messages ✅
- **Phase 2**: Channel creation modal, message view ✅
- **Phase 3**: WebSocket real-time messaging, typing indicators ✅
- **Phase 4**: Direct Messages, online/offline user status ✅
- **Phase 5**: Search, emoji reactions, unread counts ✅
- **Phase 6**: File Attachments ✅ (January 9, 2025)
- Features:
  - Create public/private channels
  - Real-time messaging via WebSocket
  - Search across all messages
  - Add emoji reactions to messages (👍❤️😂 etc.)
  - Typing indicators ("User is typing...")
  - Online/offline status for users
  - Unread message counts
  - Date-grouped messages
  - **Image and document attachments** (PNG, JPG, GIF, PDF, TXT, DOC, XLS)

### 7. CORBot - FAQ Chatbot ✅ ENHANCED
- Draggable FAQ chatbot widget
- Pre-defined questions and answers about the application
- **Position Persistence**: Position saved to localStorage and restored on page reload
- Can be placed anywhere on the screen by dragging

### 8. Calendar Integration ✅ (January 2025)
- **ICS Feed subscription** for calendar apps (Google Calendar, Outlook, Apple Calendar)
- **Personal Calendar**: Shows user's approved leave/PTO events
- **Team Calendar** (Admin only): Shows all team members' approved leave events
- Accessible from Profile → Calendar tab and Sidebar → Calendar Sync
- Features:
  - Copy calendar URL to clipboard
  - Regenerate URL for security
  - Download ICS file directly
  - Instructions for major calendar apps

### 9. PDF Reports ✅ ENHANCED (January 9, 2025)
- **Timesheet PDF Export**: Employee timesheet reports
- **Performance Insights PDF** (Admin): Team performance reports
- **Professional Header**: CORtracker logo with tagline centered at top
- Logo stored at `/app/backend/assets/cortracker_logo.png`

### 10. Employee Projects ✅ NEW (January 12, 2025)
- **My Projects Page** (`/employee/projects`): View all assigned projects
- Features:
  - List of active and completed projects
  - Project details (description, created date, estimated hours)
  - Progress tracking with visual progress bar
  - Time tracking per project (start/stop)
  - Weekly and daily time summaries
- Accessible from Employee Sidebar → "My Projects"

### 11. Support Ticketing System ✅ NEW (January 14, 2025)
- **Full-featured support ticket system** for HR, IT, and general inquiries
- **Categories**: IT Support, HR, Payroll, Facilities, Time & Attendance, Benefits, Other
- **Priority Levels**: Low, Medium, High, Urgent
- **SLA Tracking**: Auto-calculated due dates (Urgent=4h, High=8h, Medium=24h, Low=72h)
- **Multi-Admin Assignment**: Tickets can be assigned to multiple admins
- **File Attachments**: Upload images, PDFs, Word docs, Excel files
- **Internal Notes**: Admins can add notes visible only to other admins
- **Admin Features**:
  - Dashboard with stats (Active, Unassigned, SLA Breached, Urgent/High, Resolved)
  - Filter by status, category, priority, assigned to me
  - Update ticket status, priority, assignment
  - Add comments and internal notes
- **Employee Features**:
  - Create new tickets with category selection
  - View own tickets with status updates
  - Add comments/replies to tickets
- **Routes**: `/admin/tickets`, `/employee/tickets`
- **API Endpoints**:
  - `POST /api/tickets` - Create ticket
  - `GET /api/tickets` - List tickets (role-based)
  - `GET /api/tickets/{id}` - Get ticket details
  - `PUT /api/tickets/{id}` - Update ticket (admin)
  - `POST /api/tickets/{id}/comments` - Add text-only comment
  - `POST /api/tickets/{id}/comments-with-attachments` - Add comment with file attachments
  - `GET /api/tickets/{id}/comments` - Get comments (includes attachments)
  - `POST /api/tickets/{id}/attachments` - Upload attachment to ticket
  - `GET /api/tickets/attachments/{filename}` - Download attachment file
  - `GET /api/admin/tickets/stats` - Admin statistics

### 12. In-App Calendar ✅ NEW (January 14, 2025)
- **Visual calendar** displaying company events and personal schedules
- **Admin View** (`/admin/calendar`):
  - View all company holidays, team leave requests, birthdays, project deadlines
  - Manage holidays (add/edit/delete)
- **Employee View** (`/employee/calendar`):
  - View personal leaves, team leaves, company holidays, birthdays
- **Event Types**: Holidays (blue), Leave Requests (orange), Birthdays (green), Project Deadlines (red)
- Uses `react-big-calendar` library
- **API Endpoints**:
  - `GET /api/calendar/events` - Get events for calendar display
  - `GET /api/holidays` - List all holidays
  - `POST /api/admin/holidays` - Create holiday (admin)
  - `PUT /api/admin/holidays/{id}` - Update holiday (admin)
  - `DELETE /api/admin/holidays/{id}` - Delete holiday (admin)

## Technical Architecture

### Frontend
- React with TailwindCSS
- Framer Motion for animations and drag-and-drop
- Shadcn/UI components
- react-big-calendar for calendar views

### Backend (Refactored ✅ January 2025)
- FastAPI (Python)
- MongoDB database
- WebSocket support for real-time features
- `aiofiles` for async file handling

**Modular Structure:**
```
/app/backend/
├── server.py           # Main app with all routes
├── core/               # Core utilities
│   ├── config.py       # Application settings
│   ├── database.py     # MongoDB connection
│   └── auth.py         # JWT authentication
├── models/             # Pydantic models (12 files)
│   ├── enums.py        # All enum definitions
│   ├── user.py         # User models
│   ├── timesheet.py    # Timesheet models
│   ├── ticket.py       # Ticket models
│   └── ...             # Other model files
├── services/           # Business logic
│   ├── notification.py # Notification service
│   └── utils.py        # Utility functions
└── routes/             # API routes (future)
```

### Key Files
- `/app/backend/server.py` - Main backend with Calendar, Chat, PDF APIs
- `/app/backend/assets/cortracker_logo.png` - Logo for PDF reports
- `/app/frontend/src/pages/Profile.jsx` - Profile page with Calendar tab
- `/app/frontend/src/components/chat/` - CORChat components (11 files)
  - `CORChat.jsx` - Main chat component with WebSocket integration
  - `ChatPanel.jsx` - Chat panel with channels/DMs/search
  - `MessageView.jsx` - Message display with reactions and file attachments
  - `SearchResults.jsx` - Search results component
  - `EmojiPicker.jsx` - Emoji picker for messages/reactions
  - `MessageReactions.jsx` - Reaction display component
- `/app/frontend/src/services/chatService.js` - Chat API and WebSocket manager
- `/app/frontend/src/components/chatbot/CORBot.jsx` - FAQ chatbot with drag persistence

### Chat API Endpoints
- `GET /api/chat/channels` - List all channels
- `POST /api/chat/channels` - Create a channel
- `GET /api/chat/channels/{id}/messages` - Get channel messages
- `POST /api/chat/channels/{id}/messages` - Send channel message (with attachment support)
- `GET /api/chat/dm` - List DM threads
- `POST /api/chat/dm/{user_id}` - Start DM thread
- `GET /api/chat/dm/{id}/messages` - Get DM messages
- `POST /api/chat/dm/{id}/messages` - Send DM message (with attachment support)
- `GET /api/chat/search?q=query` - Search all messages
- `POST /api/chat/messages/{id}/reactions?emoji=👍` - Add/remove reaction
- `GET /api/chat/user-status` - Get all users' online status
- `POST /api/chat/upload` - Upload file for chat attachment
- `GET /api/chat/files/{category}/{filename}` - Serve uploaded files
- `WS /api/ws/{token}` - WebSocket for real-time updates

### PDF Export Endpoints
- `GET /api/export/timesheet/pdf` - Export employee timesheet as PDF
- `GET /api/admin/performance/export-pdf` - Export performance insights as PDF

## Upcoming Tasks

### P0 - High Priority
1. **Daily Summary Email**: Automated work hour summaries (ON HOLD per user request)

### P1 - Medium Priority
1. In-App Calendar (ON HOLD per user request)
2. Calendar Integration Phase 2 (Two-Way OAuth Sync) - ON HOLD

### P2 - Medium Priority
1. Shift Scheduling module
2. Advanced Payroll Export (CSV/Excel for ADP)

### P3 - Future
1. AI Integration (HR Chatbot using Emergent LLM Key or Groq free tier) - **Ready to discuss**
2. White-Labeling support (env-based branding)
3. Email Notifications for Ticketing System (Resend free tier - ON HOLD)
4. Onboarding & Offboarding Module
5. Performance & Feedback Module

## Refactoring Status ✅ COMPLETE (January 2025)
Backend refactored from 7000+ line monolith to modular structure:
- **core/**: Config, database, authentication
- **models/**: 12 Pydantic model files
- **services/**: Notification service, utilities
- **29 regression tests passed** (100% success rate)

## Test Credentials
- **Admin**: `admin@company.com` / `password123`
- **Employee**: `demo@employee.com` / `password123`

## Known Issues
- React Three Fiber incompatibility (3D logo feature)

## Change Log

### January 21, 2025
- ✅ **Google OAuth Login** - Implemented "Continue with Google" button using Emergent-managed Google Auth
  - Users can sign up/login with their Google account
  - New users via Google are automatically created as EMPLOYEE role
  - Google profile picture is synced to user account
  - AuthCallback component handles OAuth redirect flow
- ✅ **Specific Login Error Messages** - Users now see clear error messages:
  - "No account found with this email address" (wrong email)
  - "Incorrect password. Please try again" (wrong password)
  - "Account is deactivated. Please contact administrator" (deactivated account)
- ✅ **Employee Invitation System** - Implemented invitation-only employee signup
  - Admin generates invitation codes (INV-XXXXXX format) from Employees page
  - Employees must have valid invitation code to sign up
  - Real-time code validation on signup page with visual feedback
  - Pending Invitations tab for admin to manage invitations
  - Copy code and signup link functionality
  - 18/18 backend tests passed (100%)
- ✅ **UI Improvements**
  - Removed AurborBloom text from dashboard headers (icon only)
  - Updated contact details (Dallas, TX address)
  - Replaced red dot cursor with golden spotlight effect

### January 19, 2025
- ✅ **Landing Page 3D Logo Animation** - Implemented "Morphing Bloom" + "Glowing Pulse" effect
  - Created transparent PNG version of logo (removed white background)
  - Golden pulsing aura effect behind logo
  - Logo scales/morphs with breathing animation
  - Sparkle particles around logo
  - Component: `/app/frontend/src/components/Logo3DLanding.jsx`
- ✅ **Fixed Preview/Landing Page Crash** - Corrected component import mismatch in Hero.jsx

### January 2025 (Continued)
- ✅ **3D Interactive Logo** - Mouse-responsive perspective tilt effect on dashboards
  - Transparent background with soft shadow
  - Smooth animation on mouse movement
  - Added to Admin and Employee dashboards
- ✅ **Kanban Board for Tickets** - Replaced list view with visual Kanban board
  - 4 columns: Open → In Progress → Waiting on User → Resolved
  - Drag-and-drop to change status (Admin)
  - Ticket cards show: Category icon, ticket #, priority dot, subject, assigned, time
  - CLOSED tickets filtered out from view
  - Employee view shows "Reply needed" badge for tickets needing response
  - **100% frontend tests passed**

### January 14, 2025
- ✅ **NEW FEATURE: Support Ticketing System** - Full implementation
  - 7 ticket categories (IT Support, HR, Payroll, Facilities, Time & Attendance, Benefits, Other)
  - 4 priority levels with SLA tracking (Low=72h, Medium=24h, High=8h, Urgent=4h)
  - Multi-admin assignment capability
  - File attachments support (images, PDFs, docs)
  - Internal notes for admin-only comments
  - Admin dashboard with ticket statistics
  - Employee ticket creation and tracking
  - 29 backend tests passing (100% coverage)
- ✅ Added "Support Tickets" to Admin and Employee sidebars
- ✅ Fixed MongoDB ObjectId serialization in ticket comments
- ✅ **COMPLETED: Ticket Comment Attachments** - Both admin and employee can attach files to comments
  - Admin can attach files to comments and internal notes
  - Employee can attach files to comments
  - 25MB per file limit enforced
  - Support for images, PDFs, Word docs, Excel files, videos
  - Attachments displayed inline with download links
  - Backend endpoint: POST /api/tickets/{id}/comments-with-attachments
  - 14 backend API tests passing (100% success rate)
- ✅ **In-App Calendar Feature** - Full visual calendar implementation (TESTED ✅)
  - Admin view: Company holidays, all leave requests, birthdays, project deadlines
  - Employee view: Personal leaves, team leaves, holidays, birthdays
  - Holiday management for admins (add/edit/delete)
  - Uses react-big-calendar library
  - Routes: /admin/calendar, /employee/calendar
  - **21 backend API tests passing (100% success rate)**
- ✅ **PDF Export Fixes** (Pending User Verification)
  - Fixed incorrect clock-in/out data after corrections
  - Fixed CST timezone handling for all dates/times
  - Fixed logo aspect ratio distortion

### January 12, 2025
- ✅ Removed "Pending Leave Requests" section from Admin Dashboard (centralized in Leave Requests page)
- ✅ Fixed Admin Dashboard "Pending Requests" stat to include both corrections + leave requests
- ✅ Added "My Projects" page for employees (`/employee/projects`)
- ✅ Added "My Projects" link to Employee Sidebar
- ✅ Removed CORtracker logo from CORChat (replaced with MessageCircle icon)
- ✅ Merged Leave Settings into Leave Requests page as "Settings" tab
- ✅ Enhanced Employee Correction Requests feature:
  - Added "My Corrections" button with pending count badge
  - Added Correction History modal showing all requests with status
  - Improved Admin Dashboard to show requested time changes
  - Full test coverage (12 tests passing)

### January 9, 2025
- ✅ Fixed CORBot drag-and-drop with improved state handling
- ✅ Added CORtracker logo to PDF reports (centered header with tagline)
- ✅ Completed CORChat file attachments (image/document sharing)
- ✅ Added 12 backend tests for new features (all passing)
