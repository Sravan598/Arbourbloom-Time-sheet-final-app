# AurborBloom HRMS - Administrator Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Employee Management](#employee-management)
4. [Invitation System](#invitation-system)
5. [Timesheet Management](#timesheet-management)
6. [Ticket Management](#ticket-management)
7. [Leave Management](#leave-management)
8. [Calendar & Holidays](#calendar--holidays)
9. [Project Management](#project-management)
10. [Reports & Analytics](#reports--analytics)

---

## Getting Started

### Accessing the Admin Portal

1. Navigate to your AurborBloom URL
2. Click **"Login"**
3. Select the **"Admin"** tab
4. Enter your credentials:
   - Email: your admin email
   - Password: your password
5. Click **"Sign in as Admin"**

### First-Time Admin Setup

If you're setting up AurborBloom for the first time:

1. Go to the **Signup** page
2. Click **"Sign up as Admin?"**
3. Fill in your details
4. Enter the Admin Code: `ARBORBLOOM-ADMIN-2025`
5. Click **"Create Account"**

> ⚠️ **Security Note**: Change the default admin code after initial setup.

---

## Dashboard Overview

The Admin Dashboard provides a quick overview of your organization:

| Widget | Description |
|--------|-------------|
| **Total Employees** | Number of registered employees |
| **Today's Attendance** | Employees clocked in today |
| **Pending Requests** | Leave requests awaiting approval |
| **Open Tickets** | Support tickets needing attention |

### Navigation Sidebar

| Menu Item | Function |
|-----------|----------|
| Dashboard | Main overview page |
| Employees | Manage employees & invitations |
| Timesheets | View & manage all timesheets |
| Tickets | Support ticket management (Kanban) |
| Leave Requests | Approve/reject leave requests |
| Calendar | Company calendar & holidays |
| Projects | Project management |
| Performance | Analytics & insights |

---

## Employee Management

### Viewing Employees

1. Click **"Employees"** in the sidebar
2. View the list of all employees
3. Use the search bar to find specific employees

### Employee Details

Click on any employee to view:
- Profile information
- Work history
- Timesheets
- Documents

### Deactivating an Employee

1. Go to **Employees**
2. Click on the employee
3. Click **"Deactivate"** button
4. Confirm the action

> Note: Deactivated employees cannot log in but their data is preserved.

---

## Invitation System

### How It Works

AurborBloom uses a secure invitation system:
- Each employee needs a unique invitation code to sign up
- Codes are one-time use only
- Codes expire after 7 days

### Creating an Invitation

1. Go to **Employees** page
2. Click **"Invite Employee"** button (top right)
3. Fill in the form:
   - **Employee Email**: The email address for the new employee
   - **Department** (optional): e.g., Engineering, HR, Sales
4. Click **"Generate Code"**
5. A unique code like `INV-ABC123` will be generated

### Sharing the Invitation

You can share with the employee:
- **Option 1**: Copy the code and send via email/chat
- **Option 2**: Click "Copy signup link" to share a direct link

### Managing Invitations

Click the **"Pending Invitations"** tab to:
- View all pending invitations
- See accepted invitations
- Revoke pending invitations (click X button)

### Invitation Statuses

| Status | Meaning |
|--------|---------|
| **Pending** | Code generated, not yet used |
| **Accepted** | Employee has signed up |
| **Expired** | 7 days passed, code invalid |
| **Revoked** | Admin cancelled the invitation |

---

## Timesheet Management

### Viewing Timesheets

1. Go to **Timesheets** in the sidebar
2. View all employee timesheets
3. Filter by:
   - Employee name
   - Date range
   - Status

### Timesheet Details

Each timesheet shows:
- Clock in/out times
- Break duration
- Total hours worked
- Status (Pending/Approved/Rejected)

### Approving/Rejecting Timesheets

1. Click on a timesheet entry
2. Review the details
3. Click **"Approve"** or **"Reject"**
4. Add notes if needed

### Correction Requests

When employees request corrections:
1. Go to **Timesheets**
2. Look for entries with "Correction Requested" badge
3. Review the requested changes
4. Approve or reject the correction

### Exporting Timesheets (PDF)

1. Go to **Timesheets**
2. Select the date range
3. Click **"Export PDF"**
4. PDF will download with detailed timesheet data

---

## Ticket Management

### Kanban Board Overview

The ticket system uses a Kanban board with 4 columns:

| Column | Description |
|--------|-------------|
| **Open** | New tickets awaiting action |
| **In Progress** | Tickets being worked on |
| **Resolved** | Completed tickets |
| **Closed** | Archived tickets |

### Viewing Tickets

1. Go to **Tickets** in the sidebar
2. View all tickets in Kanban view
3. Drag and drop to change status

### Ticket Details

Click on any ticket to view:
- Subject and description
- Category (IT, HR, Facilities, Other)
- Priority (Low, Medium, High, Urgent)
- Comments and attachments
- History

### Responding to Tickets

1. Click on a ticket
2. Scroll to the comments section
3. Type your response
4. Optionally attach files
5. Click **"Add Comment"**

### Assigning Tickets

1. Open a ticket
2. Click **"Assign"**
3. Select an employee
4. Save changes

### Ticket Categories

| Category | Use For |
|----------|---------|
| **IT** | Technical issues, software, hardware |
| **HR** | HR-related queries, policies |
| **Facilities** | Office maintenance, supplies |
| **Other** | General inquiries |

---

## Leave Management

### Viewing Leave Requests

1. Go to **Leave Requests** in the sidebar
2. View all pending requests
3. Filter by status or employee

### Approving/Rejecting Leave

1. Click on a leave request
2. Review the details:
   - Leave type
   - Start/end dates
   - Reason
3. Click **"Approve"** or **"Reject"**
4. Add notes if needed

### Leave Types

| Type | Description |
|------|-------------|
| **Annual Leave** | Vacation days |
| **Sick Leave** | Medical leave |
| **Personal Leave** | Personal matters |
| **Other** | Miscellaneous |

---

## Calendar & Holidays

### Viewing the Calendar

1. Go to **Calendar** in the sidebar
2. View monthly calendar with:
   - Company holidays (red)
   - Approved leaves (blue)
   - Events (green)

### Adding Holidays

1. Click **"Add Holiday"** button
2. Fill in:
   - Holiday name
   - Date
   - Recurring (yearly) or one-time
3. Click **"Save"**

### Managing Holidays

- Click on a holiday to edit or delete
- Recurring holidays appear every year automatically

---

## Project Management

### Creating a Project

1. Go to **Projects** in the sidebar
2. Click **"Add Project"**
3. Fill in:
   - Project name
   - Description
   - Start/end dates
   - Status
4. Click **"Create"**

### Assigning Employees

1. Open a project
2. Click **"Assign Employees"**
3. Select employees to add
4. Save changes

### Project Statuses

| Status | Description |
|--------|-------------|
| **Planning** | Initial phase |
| **In Progress** | Active work |
| **On Hold** | Temporarily paused |
| **Completed** | Finished |
| **Cancelled** | Terminated |

---

## Reports & Analytics

### Performance Insights

1. Go to **Performance** in the sidebar
2. View analytics:
   - Attendance trends
   - Average work hours
   - Leave patterns
   - Ticket resolution times

### Exporting Reports

1. Select the report type
2. Choose date range
3. Click **"Export"**
4. Download as PDF or CSV

---

## Security Best Practices

### Recommended Actions

1. **Change default admin password** immediately after first login
2. **Update the admin signup code** to something unique and secure
3. **Regularly review** employee access and deactivate former employees
4. **Monitor** failed login attempts
5. **Use strong passwords** (minimum 8 characters with mixed case, numbers, symbols)

### Admin Code Security

To change the admin signup code, contact your system administrator or modify the environment variable:
```
ADMIN_INVITE_CODE=YOUR-NEW-SECURE-CODE
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Can't login | Check email/password, ensure correct tab (Admin/Employee) |
| Invitation code not working | Ensure code is not expired or already used |
| PDF export not working | Check browser popup blocker |
| Employee not appearing | Ensure they completed signup with invitation code |

### Getting Help

For technical support:
- Email: hr@aurborbloom.com
- Phone: +1 (469) 465-0554

---

## Quick Reference

### Important Codes

| Code Type | Value | Usage |
|-----------|-------|-------|
| Admin Signup Code | `ARBORBLOOM-ADMIN-2025` | Create new admin accounts |
| Employee Invitation | `INV-XXXXXX` | Generated per employee |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Quick search |
| `Esc` | Close modal |

---

*AurborBloom HRMS - Simplifying Human Resource Management*

**Address:** 2351 W Northwest Hwy, Suite 1115, Dallas TX, 75220, United States  
**Phone:** +1 (469) 465-0554  
**Email:** hr@aurborbloom.com
