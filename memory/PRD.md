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

### 6. CORChat - Team Communication ✅ COMPLETE (January 2025)
- **Phase 1**: Basic chat foundation - channels, DMs, messages ✅
- **Phase 2**: Channel creation modal, message view ✅
- **Phase 3**: WebSocket real-time messaging, typing indicators ✅
- **Phase 4**: Direct Messages, online/offline user status ✅
- **Phase 5**: Search, emoji reactions, unread counts ✅
- Features:
  - Create public/private channels
  - Real-time messaging via WebSocket
  - Search across all messages
  - Add emoji reactions to messages (👍❤️😂 etc.)
  - Typing indicators ("User is typing...")
  - Online/offline status for users
  - Unread message counts
  - Date-grouped messages

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
- `/app/backend/server.py` - Main backend file with Calendar API and Chat API endpoints
- `/app/frontend/src/pages/Profile.jsx` - Profile page with Calendar tab
- `/app/frontend/src/components/chat/` - CORChat components (11 files)
  - `CORChat.jsx` - Main chat component with WebSocket integration
  - `ChatPanel.jsx` - Chat panel with channels/DMs/search
  - `MessageView.jsx` - Message display with reactions
  - `SearchResults.jsx` - Search results component
  - `EmojiPicker.jsx` - Emoji picker for messages/reactions
  - `MessageReactions.jsx` - Reaction display component
- `/app/frontend/src/services/chatService.js` - Chat API and WebSocket manager
- `/app/frontend/src/components/chatbot/CORBot.jsx` - FAQ chatbot with drag persistence

### Chat API Endpoints
- `GET /api/chat/channels` - List all channels
- `POST /api/chat/channels` - Create a channel
- `GET /api/chat/channels/{id}/messages` - Get channel messages
- `POST /api/chat/channels/{id}/messages` - Send channel message
- `GET /api/chat/dm` - List DM threads
- `POST /api/chat/dm/{user_id}` - Start DM thread
- `GET /api/chat/dm/{id}/messages` - Get DM messages
- `POST /api/chat/dm/{id}/messages` - Send DM message
- `GET /api/chat/search?q=query` - Search all messages
- `POST /api/chat/messages/{id}/reactions?emoji=👍` - Add/remove reaction
- `GET /api/chat/user-status` - Get all users' online status
- `WS /api/ws/{token}` - WebSocket for real-time updates

## Upcoming Tasks

### P0 - High Priority
1. **Daily Summary Email**: Automated work hour summaries (ON HOLD per user request)

### P1 - Medium Priority
1. **CORChat File Attachments**: Image and document sharing in chat

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
