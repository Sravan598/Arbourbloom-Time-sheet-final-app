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
1. ✅ **Complete AurborBloom Tenant Isolation** - COMPLETED & VERIFIED (February 1, 2025)
2. ✅ **CNAME Verification Logic** - COMPLETED & VERIFIED (February 1, 2025)
3. ✅ **AI HR Chatbot Integration** - COMPLETED (February 1, 2025)
4. ✅ **Knowvia Tech Tenant Design** - COMPLETED & APPROVED (February 1, 2025)
5. ✅ **PDF Timesheet Export** - VERIFIED WORKING (February 1, 2025)
6. **Daily Summary Email**: Automated work hour summaries (ON HOLD per user request)

### P1 - Medium Priority
1. **CNAME User Testing** - Ready for testing with real custom domain
2. In-App Calendar (ON HOLD per user request)
3. Calendar Integration Phase 2 (Two-Way OAuth Sync) - ON HOLD

### P2 - Medium Priority
1. **Refactor server.py**: Split into modular structure (IN PROGRESS - February 2025)
2. Shift Scheduling module
3. Advanced Payroll Export (CSV/Excel for ADP)
4. **Ticketing System Enhancements**: Email notifications, canned responses, satisfaction ratings
5. **Usage Analytics Dashboard**: Super Admin view of usage statistics per tenant

### P3 - Future
1. Onboarding & Offboarding Module
2. Performance & Feedback Module

## Refactoring Status 🔄 IN PROGRESS (February 2025)
Backend being refactored from 11,000+ line monolith to modular structure:

### Completed ✅
- **config.py**: Centralized configuration with all env variables
- **database.py**: MongoDB connection management
- **models/**: 16 Pydantic model files including:
  - Core: enums.py, user.py, timesheet.py, leave.py, project.py
  - Communication: chat.py, notification.py, announcement.py
  - Support: ticket.py, document.py, calendar.py, status.py
  - Multi-tenant: tenant.py, security.py, webhook.py, ssl.py
- **services/**: Business logic services
  - audit.py: Security audit logging
  - webhook.py: Webhook delivery
  - rate_limit.py: API rate limiting
  - notification.py: User notifications
  - utils.py: Common utilities
- **utils/**: Helper functions
  - auth.py: JWT authentication (create_token, get_current_user, require_admin)
  - helpers.py: Password hashing, encryption, datetime handling
- **routes/**: API route modules (February 2, 2025)
  - auth.py: Authentication (signup, login, token management) ✅
  - tenants.py: Tenant management (CRUD, public info) ✅
  - employees.py: Employee management (CRUD, invitations, work info) ✅
  - timesheets.py: Time tracking (clock in/out, corrections, admin management) ✅
  - leave.py: Leave management (requests, types, approvals) ✅
  - tickets.py: Ticket management (CRUD, comments, attachments, stats) ✅

### In Progress 🔄
- **routes/**: Remaining routes to migrate from server.py:
  - profile.py: User profile routes
  - projects.py: Project management routes
  - chat.py: Team chat routes
  - documents.py: Document management routes
  - calendar.py: Calendar/Holiday routes
  - notifications.py: Notification routes
  - announcements.py: Announcement routes
  - breaks.py: Break/Performance routes
  - exports.py: PDF export routes
  - super_admin.py: Super Admin routes (audit, usage, webhooks, SSL)
- **server.py**: Still contains remaining routes (~6000+ lines)

### Migration Strategy
Routes are being migrated incrementally while keeping server.py functional.
Once complete, main.py will orchestrate all modular routes.

## Test Credentials
- **Super Admin**: `superadmin@aurborbloom.com` / `superadmin123`
- **AurborBloom Admin**: `admin@company.com` / `password123`
- **Perfect Solutions Admin**: `admin@perfectsolutions.com` / `admin123`
- **Knowvia Tech Admin**: `admin@knowviatech.com` / `admin123`

## Known Issues
- React Three Fiber incompatibility (3D logo feature)

## Change Log

### February 2, 2025 (Current Session - Continued)
- ✅ **Backend Refactoring Phase 2** - Major route migration completed
  - Created 4 new route files with full functionality:
    - `employees.py`: Employee management, invitations, work info, admin password reset
    - `timesheets.py`: Clock in/out, correction requests, admin timesheet management
    - `leave.py`: Leave types, leave requests, admin approvals
    - `tickets.py`: Ticket CRUD, comments, attachments, admin stats
  - Updated `routes/__init__.py` to include all new routers
  - Fixed all lint issues (bare except clauses)
  - Updated `README.md` with refactoring progress
  - All API endpoints verified working:
    - Auth (login/signup) ✅
    - Tenants (public info) ✅
    - Dashboard stats ✅
    - Employees list ✅
    - Leave requests ✅
    - Tickets ✅
  - Frontend verified functional with screenshot test
  - **~50% of routes migrated** from server.py to modular structure

### February 2, 2025 (Earlier)
- 🔄 **Backend Refactoring Phase 1** - Extracting modules from server.py
  - Created 4 new model files: tenant.py, security.py, webhook.py, ssl.py
  - Updated enums.py with all enums (UserRole with SUPER_ADMIN, InvitationStatus, etc.)
  - Fixed all import paths in services (audit.py, webhook.py, rate_limit.py, notification.py)
  - Fixed all import paths in utils (auth.py, helpers.py)
  - Removed redundant /core/ directory
  - Updated config.py with all configuration variables
  - Created route templates (auth.py, tenants.py)
  - Updated main.py documentation
  - Created comprehensive README.md for backend
  - All 8 API tests passing (100% success rate)
  - Backend health verified across all 3 tenants


### February 1, 2025 (Session 2)
- ✅ **Verified PDF Timesheet Export (P1)** - All tenants working correctly
  - Tenant-branded filenames: `{TenantName}_Timesheet_{UserName}_{Date}.pdf`
  - CST timezone for date calculations
  - PDFs generate with proper sizes (11-28KB per report)
  - Tested: AurborBloom, Perfect Solutions, Knowvia Tech - all working
  
- ✅ **Verified CNAME Verification UI (P1)** - Ready for real-world testing
  - Super Admin UI displays all tenants with domain status
  - DNS Check Results: CNAME record, Domain resolves, TXT verification
  - Detailed status modal with instructions
  - "Verify Domain" and "Remove" buttons functional
  - Automatic DNS verification background task running hourly
  - Perfect Solutions configured with `hr.perfectsolutions.com` (pending verification)

- ✅ **Verified Knowvia Tech Design (P0)** - User approved
  - Red-to-Orange gradient background
  - Frosted glass logo effect
  - Clean, professional login/signup pages

- ✅ **Database Seed Data Script** - Created for fresh environments
  - Creates all 3 tenants: AurborBloom, Perfect Solutions, Knowvia Tech
  - Creates test users: Super Admin, AurborBloom Admin, PS Admin, KT Admin
  - Ensures proper tenant isolation and colors

### February 1, 2025 (Session 1)
- ✅ **Complete AurborBloom Tenant Isolation (P0)** - Full white-label experience for all tenants
  - **Isolated Login Pages**: Both AurborBloom and Perfect Solutions now have fully isolated login pages
  - **No Tenant Dropdown**: Neither tenant sees a dropdown with other companies
  - **Automatic Redirects**: `/login` → `/aurborbloom/login`, `/signup` → `/aurborbloom/signup`
  - **Super Admin Portal**: Reserved login at `/login?superadmin=true` for system administrators
  - **Tenant-Aware Logout**: All logout flows redirect to `/{tenant}/login` instead of shared `/login`
  - **Marketing Page CTAs**: All CTA buttons on main page point to `/aurborbloom/login` and `/aurborbloom/signup`
  - Key files modified:
    - `/app/frontend/src/pages/Login.jsx` - Super Admin-only login with redirect logic
    - `/app/frontend/src/pages/Signup.jsx` - Redirects to `/aurborbloom/signup`
    - `/app/frontend/src/context/AuthContext.jsx` - Updated `getLogoutRedirectUrl()` for all tenants
    - `/app/frontend/src/components/auth/ProtectedRoute.jsx` - Updated redirect logic
  - **12/12 frontend tests passed (100%)**

- ✅ **CNAME Verification Logic (P1)** - Custom domain DNS verification
  - **Backend DNS Verification**: Full DNS check (CNAME, A record, TXT verification)
  - **Periodic Auto-Verification**: Background task runs every hour to auto-verify pending domains
  - **Detailed Domain Status API**: New endpoint `/api/super-admin/tenants/{id}/domain-status`
  - **Enhanced UI**: DNS check results displayed in domain modal (CNAME, Resolves, TXT)
  - API Endpoints:
    - `GET /api/super-admin/tenants/{id}/domain-status` - Detailed DNS status check
  - Key files modified:
    - `/app/backend/server.py` - Added `periodic_dns_verification()` background task and domain-status endpoint
    - `/app/frontend/src/pages/admin/TenantManagement.jsx` - Enhanced domain modal with DNS check results

- ✅ **AI HR Chatbot (AurborBot) (P1)** - Intelligent AI-powered assistant
  - **OpenAI GPT-5.2 Integration**: Uses Emergent LLM Key for AI responses
  - **Context-Aware**: Knows user's name, role, and company
  - **Conversation Memory**: Chat history stored in MongoDB for session continuity
  - **HR-Specific Knowledge**: Trained to answer HR, time tracking, leave, and app navigation questions
  - **Tenant-Branded**: Shows as "AurborBot" for AurborBloom, "{Company} Assistant" for other tenants
  - **AI Badge**: Purple sparkles indicator distinguishes AI responses from FAQ
  - **Fallback Mode**: Falls back to FAQ responses if AI is unavailable
  - API Endpoints:
    - `POST /api/chatbot/message` - Send message to AI chatbot
    - `GET /api/chatbot/history/{session_id}` - Get chat history
    - `DELETE /api/chatbot/history/{session_id}` - Clear chat history
    - `POST /api/chatbot/new-session` - Create new chat session
  - Key files:
    - `/app/backend/server.py` - AI chatbot endpoints using emergentintegrations
    - `/app/frontend/src/components/chatbot/AurborBot.jsx` - Updated to use AI API
    - `/app/frontend/src/components/chatbot/faqData.js` - Fallback FAQ data (unchanged)

- ✅ **Knowvia Tech Tenant** - New fully isolated tenant
  - **Company**: Knowvia Tech (Online Learning Platform)
  - **Landing Page**: `/knowviatech` - Custom branded page with courses, testimonials
  - **Login/Signup**: `/knowviatech/login`, `/knowviatech/signup` - Fully isolated
  - **Branding**: Red (#E53935) primary, Green (#2E7D32) secondary
  - **AI Chatbot**: Shows as "Knowvia Tech Assistant"
  - **Features**: All enabled (Timesheets, Tickets, Leave, Calendar, Projects, Chat)
  - **Admin**: admin@knowviatech.com / admin123
  - Key files:
    - `/app/frontend/src/pages/tenant/KnowviaTechHome.jsx` - Landing page
    - `/app/frontend/public/knowviatech_logo.png` - Company logo

### January 31, 2025
- ✅ **Custom Domain Mapping (CNAME)** - Allow tenants to use custom domains
  - Super Admin can configure custom domain for each tenant (e.g., hr.perfectsolutions.com)
  - DNS verification workflow with CNAME and TXT record instructions
  - Verification status indicator (pending/verified) on tenant cards
  - Lookup tenant by custom domain API for domain-based routing
  - API Endpoints:
    - `POST /api/super-admin/tenants/{id}/custom-domain` - Set custom domain
    - `POST /api/super-admin/tenants/{id}/verify-domain` - Verify DNS configuration
    - `DELETE /api/super-admin/tenants/{id}/custom-domain` - Remove domain
    - `GET /api/tenants/by-domain/{domain}` - Lookup tenant by domain
  - Key files:
    - `/app/backend/server.py` - Custom domain API endpoints
    - `/app/frontend/src/pages/admin/TenantManagement.jsx` - Domain configuration modal
- ✅ **Tenant-Specific Feature Toggles** - Enable/disable modules per tenant
  - 8 toggleable features: Timesheets, Tickets, Leave, Calendar, Projects, Chat, Documents, Performance
  - Super Admin UI modal to toggle features on/off per tenant
  - Sidebar navigation dynamically filters based on enabled features
  - Feature toggles persist in tenant settings
  - API Endpoints:
    - `GET /api/super-admin/features` - List all available features
    - `GET /api/super-admin/tenants/{id}/features` - Get tenant's feature settings
    - `PUT /api/super-admin/tenants/{id}/features` - Update tenant's enabled features
  - Key files:
    - `/app/backend/server.py` - Feature toggle API endpoints (AVAILABLE_FEATURES constant)
    - `/app/frontend/src/pages/admin/TenantManagement.jsx` - Feature toggle modal
    - `/app/frontend/src/context/TenantContext.jsx` - isFeatureEnabled() helper
    - `/app/frontend/src/components/admin/AdminSidebar.jsx` - Feature-filtered navigation
    - `/app/frontend/src/components/employee/EmployeeSidebar.jsx` - Feature-filtered navigation
- ✅ **Perfect Solutions Landing Page** - Custom white-label landing page
  - Full landing page at `/perfectsolutions` route
  - Company branding, services section, HRMS portal preview, about section, contact info
  - Data sourced from https://www.perfectgroupus.com/
  - Employee Portal button links to login with tenant preselected
  - Key files:
    - `/app/frontend/src/pages/tenant/PerfectSolutionsHome.jsx` - Full landing page
    - `/app/frontend/src/App.js` - Route configuration
- ✅ **Domain-Based Auto-Routing** - Automatic tenant detection
  - Login page auto-selects tenant from URL parameter `?tenant=perfectsolutions`
  - Tenant selection persists when navigating from tenant landing page
  - Key files:
    - `/app/frontend/src/utils/tenantRouter.js` - Tenant routing utilities
    - `/app/frontend/src/pages/Login.jsx` - Updated tenant preselection logic

### January 22, 2025
- ✅ **Application Documentation Completed** - Comprehensive documentation created
  - `ADMIN_GUIDE.md` (403 lines) - Full admin user guide
  - `EMPLOYEE_GUIDE.md` (425 lines) - Full employee user guide
  - `API_DOCUMENTATION.md` (655 lines) - Complete API reference
  - `QUICK_REFERENCE.md` (246 lines) - Quick reference card
  - Location: `/app/docs/`
  - All guides include tables, workflow diagrams, and troubleshooting sections
- ✅ **Interactive Spotlight Tutorial** - First-time employee onboarding tour
  - 8-step guided tour covering: Clock In/Out, Break Timer, Timesheet, Leave, Tickets, Calendar, Profile, Notifications
  - Spotlight style with dark overlay and golden border highlights
  - Auto-shows on first login, stored in localStorage
  - Help icon (?) in header to replay tour anytime
  - Component: `/app/frontend/src/components/tutorial/SpotlightTutorial.jsx`
- ✅ **Multi-Tenant Architecture Implemented** - White-labeling support
  - **Tenant Management**: Super Admin can create/edit/delete tenants
  - **Login Dropdown**: Users select company before login (when 2+ tenants exist)
  - **Dynamic Branding**: Logo and name change based on selected tenant
  - **Data Isolation**: All data filtered by `tenant_id` in database
  - **Tenant-specific Admin Codes**: Each tenant has unique admin signup code
  - **Super Admin Role**: New role for managing all tenants
  - **Perfect Solutions**: First client tenant created with blue branding
  - Key files:
    - `/app/frontend/src/pages/admin/TenantManagement.jsx` - Tenant management UI
    - `/app/frontend/src/pages/Login.jsx` - Updated with tenant selector
    - `/app/backend/server.py` - Tenant models and API endpoints
- ✅ **Full Tenant Branding** - Complete white-label experience
  - **TenantContext**: React context that provides tenant branding throughout app
  - **Sidebar Logo**: Changes to tenant's logo on both Admin and Employee dashboards
  - **Dashboard Header**: Shows "{Tenant Name} Dashboard" with tenant's primary color
  - **Navigation Highlights**: Active menu items use tenant's primary color
  - **Admin Badge**: Shows tenant name and uses tenant colors
  - **PDF Reports**: Timesheet PDFs include tenant logo and branding (no "Powered by AurborBloom")
  - **Browser Tab Title**: Updates to "{Tenant Name} HRMS"
  - **Chatbot**: Named "{Tenant Name} Assistant" with tenant colors
  - **Tutorial**: Welcome message uses tenant name and colors
  - **Login Page**: Shows "Sign in to {Tenant Name}" with tenant branding
  - **Zero AurborBloom references**: When logged into another tenant, no AurborBloom branding appears
  - Key files:
    - `/app/frontend/src/context/TenantContext.jsx` - Tenant branding context
    - `/app/frontend/src/components/ui/TenantButton.jsx` - Tenant-colored buttons
    - `/app/frontend/src/components/chatbot/AurborBot.jsx` - Tenant-aware chatbot
    - Updated sidebars, dashboards, tutorial, and PDF generation

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


### May 11, 2026 — Perfect Solutions BRD / FRD with Portal Screenshots ✅
- ✅ Built automated portal screenshot capture pipeline using headless Chromium (`/app/documents/perfect_solutions/scripts/capture_screenshots.py`) — generates 15 high-resolution screens (public, admin, employee).
- ✅ Updated `generate_brd_docx.py` and `generate_frd_docx.py` to embed all 15 portal screenshots inline + system diagrams (architecture, ERD, auth flow, modules, leave flow).
- ✅ Extended `generate_pdfs.py` with a new `screenshot()` flowable + `portal_appendix()` builder; preserves native aspect ratio and adds a branded label bar above each screen.
- ✅ Re-generated final deliverables (May 11, 2026):
  - `/app/documents/perfect_solutions/Perfect_Solutions_BRD_v1.0.docx` (3.0 MB, 18 images)
  - `/app/documents/perfect_solutions/Perfect_Solutions_BRD_v1.0.pdf` (3.6 MB, 24 pages)
  - `/app/documents/perfect_solutions/Perfect_Solutions_FRD_v1.0.docx` (2.8 MB, 17 images)
  - `/app/documents/perfect_solutions/Perfect_Solutions_FRD_v1.0.pdf` (3.9 MB, 29 pages)

### Next Priorities (P1)
- Continue `server.py` → `/app/backend/routes/` modular refactor (resolve duplicate `/auth/signup` route).
- Super Admin UI for backend-ready features (Usage Metrics, Data Export, Rate Limiting, Webhooks, Encryption, SSL).
- Custom domain frontend detection (`window.location.hostname` → fetch tenant theme).

### Backlog (P2)
- Forgot Password via Resend, Ticketing enhancements (email notifications, canned responses, CSAT), Payroll ADP export, CSV employee import, Shift Scheduling, WebSocket-based ticket chat.

### June 17, 2026 — AurborBloom Platform BRD & FRD ✅
- ✅ Created `/app/documents/aurborbloom/` with full generator stack cloned from Perfect Solutions and pivoted to platform/product framing (subject = AurborBloom HRMS itself, not a tenant implementation).
- ✅ Applied AurborBloom brand palette: Black `#000000` + Gold `#D4AF37` (with light-gold accent `#FEF3C7`).
- ✅ Captured 15 portal screenshots from the default `aurborbloom` tenant (admin@company.com / employee@test.com) and embedded inline as Appendix A.
- ✅ Regenerated 5 system diagrams (architecture, ERD, auth flow, modules, leave flow) under the new brand.
- ✅ Final deliverables (verified text-clean — 0 leftover "Perfect Solutions" hits):
  - `/app/documents/aurborbloom/AurborBloom_BRD_v1.0.docx` (5.9 MB, 18 imgs)
  - `/app/documents/aurborbloom/AurborBloom_BRD_v1.0.pdf` (7.0 MB, 24 pages)
  - `/app/documents/aurborbloom/AurborBloom_FRD_v1.0.docx` (5.6 MB, 17 imgs)
  - `/app/documents/aurborbloom/AurborBloom_FRD_v1.0.pdf` (7.2 MB, 29 pages)
- Doc codes: `AB-BRD-2026-001`, `AB-FRD-2026-001`. Tagline: "Where People Bloom".

