# AurborBloom HRMS - API Documentation

## Overview

AurborBloom HRMS provides a RESTful API for all functionality. This document covers all available endpoints.

**Base URL:** `https://your-domain.com/api`

**Authentication:** Bearer Token (JWT)
```
Authorization: Bearer <your-jwt-token>
```

---

## Table of Contents

1. [Authentication](#authentication)
2. [Invitations](#invitations)
3. [Profile](#profile)
4. [Timesheets](#timesheets)
5. [Leave Requests](#leave-requests)
6. [Tickets](#tickets)
7. [Calendar & Holidays](#calendar--holidays)
8. [Projects](#projects)
9. [Admin Endpoints](#admin-endpoints)

---

## Authentication

### Login

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@company.com",
  "password": "yourpassword"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "user@company.com",
    "role": "EMPLOYEE",
    "is_active": true,
    "created_at": "2025-01-21T00:00:00Z"
  }
}
```

**Error Responses:**
- `401`: "No account found with this email address"
- `401`: "Incorrect password. Please try again"
- `403`: "Account is deactivated"

---

### Signup (Employee)

```http
POST /api/auth/signup
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@company.com",
  "password": "password123",
  "employee_invite_code": "INV-ABC123"
}
```

**Response:** Same as login response

**Error Responses:**
- `400`: "Email already registered"
- `403`: "Employee invitation code is required"
- `403`: "Invalid or expired invitation code"

---

### Signup (Admin)

```http
POST /api/auth/signup
```

**Request Body:**
```json
{
  "name": "Admin User",
  "email": "admin@company.com",
  "password": "password123",
  "role": "ADMIN",
  "admin_invite_code": "ARBORBLOOM-ADMIN-2025"
}
```

---

### Get Current User

```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@company.com",
  "role": "EMPLOYEE",
  "is_active": true,
  "created_at": "2025-01-21T00:00:00Z"
}
```

---

## Invitations

### Create Invitation (Admin Only)

```http
POST /api/admin/invitations
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "email": "newemployee@company.com",
  "department": "Engineering",
  "expires_in_days": 7
}
```

**Response:**
```json
{
  "id": "uuid",
  "email": "newemployee@company.com",
  "code": "INV-XYZ789",
  "department": "Engineering",
  "status": "pending",
  "invited_by": "admin-uuid",
  "invited_by_name": "Admin User",
  "expires_at": "2025-01-28T00:00:00Z",
  "created_at": "2025-01-21T00:00:00Z",
  "accepted_at": null
}
```

---

### List All Invitations (Admin Only)

```http
GET /api/admin/invitations
Authorization: Bearer <admin-token>
```

**Query Parameters:**
- `status` (optional): Filter by status (pending, accepted, expired, revoked)

---

### Revoke Invitation (Admin Only)

```http
DELETE /api/admin/invitations/{invitation_id}
Authorization: Bearer <admin-token>
```

---

### Validate Invitation Code (Public)

```http
GET /api/invitations/validate/{code}
```

**Response:**
```json
{
  "valid": true,
  "email": "employee@company.com",
  "department": "Engineering",
  "expires_at": "2025-01-28T00:00:00Z"
}
```

---

## Profile

### Get Profile

```http
GET /api/profile
Authorization: Bearer <token>
```

---

### Update Profile

```http
PUT /api/profile
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "John Smith",
  "phone": "+1234567890",
  "address": "123 Main St"
}
```

---

## Timesheets

### Clock In

```http
POST /api/employee/clock-in
Authorization: Bearer <token>
```

---

### Clock Out

```http
POST /api/employee/clock-out
Authorization: Bearer <token>
```

---

### Start Break

```http
POST /api/employee/break/start
Authorization: Bearer <token>
```

---

### End Break

```http
POST /api/employee/break/end
Authorization: Bearer <token>
```

---

### Get My Timesheets

```http
GET /api/timesheets
Authorization: Bearer <token>
```

**Query Parameters:**
- `start_date`: ISO date string
- `end_date`: ISO date string

---

### Request Timesheet Correction

```http
POST /api/timesheets/{timesheet_id}/correction
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "clock_in": "2025-01-21T09:00:00Z",
  "clock_out": "2025-01-21T17:00:00Z",
  "reason": "Forgot to clock in"
}
```

---

### Get All Timesheets (Admin Only)

```http
GET /api/admin/timesheets
Authorization: Bearer <admin-token>
```

---

### Export Timesheets PDF (Admin Only)

```http
GET /api/admin/timesheets/export/pdf
Authorization: Bearer <admin-token>
```

**Query Parameters:**
- `user_id`: Employee ID
- `start_date`: ISO date string
- `end_date`: ISO date string

---

## Leave Requests

### Submit Leave Request

```http
POST /api/leave-requests
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "leave_type": "annual",
  "start_date": "2025-02-01",
  "end_date": "2025-02-05",
  "reason": "Family vacation"
}
```

---

### Get My Leave Requests

```http
GET /api/leave-requests
Authorization: Bearer <token>
```

---

### Cancel Leave Request

```http
DELETE /api/leave-requests/{request_id}
Authorization: Bearer <token>
```

---

### Get All Leave Requests (Admin Only)

```http
GET /api/admin/leave-requests
Authorization: Bearer <admin-token>
```

---

### Approve/Reject Leave (Admin Only)

```http
PUT /api/admin/leave-requests/{request_id}
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "status": "approved",
  "admin_notes": "Approved. Enjoy your vacation!"
}
```

---

## Tickets

### Create Ticket

```http
POST /api/tickets
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "subject": "Cannot access email",
  "description": "Getting error when trying to login to email",
  "category": "IT",
  "priority": "high"
}
```

---

### Get My Tickets

```http
GET /api/tickets
Authorization: Bearer <token>
```

---

### Get Ticket Details

```http
GET /api/tickets/{ticket_id}
Authorization: Bearer <token>
```

---

### Add Comment to Ticket

```http
POST /api/tickets/{ticket_id}/comments
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "text": "I tried restarting but still not working",
  "attachments": []
}
```

---

### Get All Tickets (Admin Only)

```http
GET /api/admin/tickets
Authorization: Bearer <admin-token>
```

---

### Update Ticket Status (Admin Only)

```http
PUT /api/admin/tickets/{ticket_id}
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "status": "in_progress",
  "assigned_to": "employee-uuid"
}
```

---

## Calendar & Holidays

### Get Calendar Events

```http
GET /api/calendar/events
Authorization: Bearer <token>
```

**Query Parameters:**
- `month`: 1-12
- `year`: YYYY

---

### Add Holiday (Admin Only)

```http
POST /api/admin/holidays
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "name": "Christmas Day",
  "date": "2025-12-25",
  "is_recurring": true
}
```

---

### Delete Holiday (Admin Only)

```http
DELETE /api/admin/holidays/{holiday_id}
Authorization: Bearer <admin-token>
```

---

## Projects

### Get My Projects

```http
GET /api/projects
Authorization: Bearer <token>
```

---

### Create Project (Admin Only)

```http
POST /api/admin/projects
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "name": "Website Redesign",
  "description": "Redesign company website",
  "start_date": "2025-02-01",
  "end_date": "2025-04-30",
  "status": "planning"
}
```

---

### Assign Employees to Project (Admin Only)

```http
POST /api/admin/projects/{project_id}/assign
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "employee_ids": ["uuid1", "uuid2", "uuid3"]
}
```

---

## Admin Endpoints

### Get All Employees

```http
GET /api/admin/employees
Authorization: Bearer <admin-token>
```

---

### Get Dashboard Stats

```http
GET /api/admin/dashboard
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "total_employees": 25,
  "clocked_in_today": 18,
  "pending_leave_requests": 3,
  "open_tickets": 5
}
```

---

### Deactivate Employee

```http
PUT /api/admin/employees/{employee_id}/deactivate
Authorization: Bearer <admin-token>
```

---

### Delete Employee

```http
DELETE /api/admin/employees/{employee_id}
Authorization: Bearer <admin-token>
```

---

## Error Responses

All errors follow this format:

```json
{
  "detail": "Error message here"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Server Error |

---

## Rate Limiting

- Standard rate limit: 100 requests per minute
- Login endpoint: 10 requests per minute

---

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `skip`: Number of records to skip (default: 0)
- `limit`: Number of records to return (default: 100, max: 1000)

---

*AurborBloom HRMS API v1.0*
