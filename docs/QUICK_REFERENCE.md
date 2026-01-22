# AurborBloom HRMS - Quick Reference Guide

## Login Credentials

### Default Admin Account
| Field | Value |
|-------|-------|
| Email | `admin@company.com` |
| Password | `password123` |

> ⚠️ **Change these immediately after deployment!**

### Signup Codes

| Code Type | Code | Purpose |
|-----------|------|---------|
| **Admin Signup** | `ARBORBLOOM-ADMIN-2025` | Create new admin accounts |
| **Employee Invitation** | `INV-XXXXXX` | Generated per employee by admin |

---

## Feature Overview

### For Employees

| Feature | Description | Location |
|---------|-------------|----------|
| Clock In/Out | Track work hours | Dashboard |
| Timesheets | View time records | Timesheet page |
| Leave Requests | Request time off | Leave page |
| Support Tickets | Submit issues | Tickets page |
| Calendar | View holidays | Calendar page |
| Projects | View assignments | Projects page |
| Profile | Update info | Profile page |

### For Admins

| Feature | Description | Location |
|---------|-------------|----------|
| Employee Management | Add, view, deactivate employees | Employees page |
| Invitation System | Generate signup codes | Employees → Invite |
| Timesheet Approval | Review & approve hours | Timesheets page |
| Ticket Management | Handle support requests | Tickets (Kanban) |
| Leave Approval | Approve/reject leave | Leave Requests |
| Holiday Management | Add company holidays | Calendar page |
| Project Management | Create & manage projects | Projects page |
| Performance Insights | Analytics & reports | Performance page |

---

## Workflow Diagrams

### Employee Onboarding
```
Admin creates invitation
        ↓
Code generated (INV-XXXXXX)
        ↓
Admin shares code with employee
        ↓
Employee goes to /signup
        ↓
Employee enters code + details
        ↓
Account created → Dashboard access
```

### Daily Time Tracking
```
Start of day → Clock In
        ↓
Work on tasks
        ↓
Break → Start Break → End Break
        ↓
End of day → Clock Out
        ↓
Timesheet auto-recorded
```

### Leave Request Flow
```
Employee submits request
        ↓
Status: PENDING
        ↓
Admin reviews request
        ↓
Admin approves/rejects
        ↓
Employee notified
        ↓
Approved leave → Shows on calendar
```

### Ticket Flow
```
Employee creates ticket
        ↓
Status: OPEN
        ↓
Admin assigns/responds
        ↓
Status: IN PROGRESS
        ↓
Issue resolved
        ↓
Status: RESOLVED → CLOSED
```

---

## Status Reference

### Timesheet Status
| Status | Color | Meaning |
|--------|-------|---------|
| Pending | 🟡 Yellow | Awaiting approval |
| Approved | 🟢 Green | Confirmed |
| Rejected | 🔴 Red | Not approved |

### Leave Status
| Status | Color | Meaning |
|--------|-------|---------|
| Pending | 🟡 Yellow | Awaiting decision |
| Approved | 🟢 Green | Leave granted |
| Rejected | 🔴 Red | Leave denied |

### Ticket Status
| Status | Column | Meaning |
|--------|--------|---------|
| Open | 1st | New ticket |
| In Progress | 2nd | Being handled |
| Resolved | 3rd | Issue fixed |
| Closed | 4th | Completed |

### Ticket Priority
| Priority | Color | Response Time |
|----------|-------|---------------|
| Low | 🔵 Blue | 3-5 days |
| Medium | 🟡 Yellow | 1-2 days |
| High | 🟠 Orange | Same day |
| Urgent | 🔴 Red | ASAP |

### Invitation Status
| Status | Meaning |
|--------|---------|
| Pending | Not yet used |
| Accepted | Employee signed up |
| Expired | Past 7 days |
| Revoked | Cancelled by admin |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Quick search |
| `Esc` | Close modal/dialog |
| `Enter` | Submit form |

---

## URL Routes

### Public Routes
| URL | Page |
|-----|------|
| `/` | Landing page |
| `/login` | Login page |
| `/signup` | Signup page |

### Employee Routes
| URL | Page |
|-----|------|
| `/employee/dashboard` | Dashboard |
| `/employee/timesheet` | Timesheets |
| `/employee/leave` | Leave requests |
| `/employee/tickets` | Support tickets |
| `/employee/calendar` | Calendar |
| `/employee/projects` | Projects |
| `/employee/documents` | Documents |
| `/profile` | Profile settings |

### Admin Routes
| URL | Page |
|-----|------|
| `/admin/dashboard` | Admin dashboard |
| `/admin/employees` | Employee management |
| `/admin/timesheets` | All timesheets |
| `/admin/tickets` | Ticket management |
| `/admin/leave-requests` | Leave approvals |
| `/admin/calendar` | Calendar & holidays |
| `/admin/projects` | Project management |
| `/admin/performance` | Analytics |

---

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| Can't login | Check email/password, correct tab |
| Invitation code invalid | Get new code from admin |
| Page not loading | Clear cache (Ctrl+Shift+Delete) |
| Clock in not working | Refresh page, try again |
| PDF won't download | Check popup blocker |
| Forgot password | Contact administrator |

---

## Contact Information

**AurborBloom HR Support**

| Channel | Contact |
|---------|---------|
| 📧 Email | hr@aurborbloom.com |
| 📞 Phone | +1 (469) 465-0554 |
| 📍 Address | 2351 W Northwest Hwy, Suite 1115, Dallas TX, 75220 |

---

## System Requirements

### Browser Support
- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ❌ Internet Explorer

### Screen Resolution
- Minimum: 1024 x 768
- Recommended: 1920 x 1080

### Mobile
- Responsive design
- Works on tablets and phones

---

*AurborBloom HRMS v1.0*
*Last Updated: January 2025*
