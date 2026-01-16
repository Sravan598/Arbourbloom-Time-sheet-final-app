"""
CORtracker Backend Regression Tests
Tests to verify the backend refactoring didn't break any functionality.
Modules tested:
- Auth (login for admin and employee)
- Dashboard stats (admin)
- Clock in/out (employee)
- Tickets API
- Calendar API
- Leave requests API
- Chat channels API
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@company.com"
ADMIN_PASSWORD = "password123"
EMPLOYEE_EMAIL = "employee@test.com"
EMPLOYEE_PASSWORD = "password123"


class TestAPIVersion:
    """Test API root endpoint returns version"""
    
    def test_api_version(self):
        """GET /api/ returns API version"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"API root failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert "CORtracker API" in data["message"]
        print(f"API Version: {data['message']}")


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "Response missing access_token"
        assert "user" in data, "Response missing user"
        assert data["user"]["role"] == "ADMIN", f"Expected ADMIN role, got {data['user']['role']}"
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"Admin login successful: {data['user']['name']}")
    
    def test_admin_login_invalid_password(self):
        """Test admin login with invalid password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestEmployeeAuth:
    """Employee authentication tests"""
    
    def test_employee_login_success(self):
        """Test employee login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD
        })
        assert response.status_code == 200, f"Employee login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "Response missing access_token"
        assert "user" in data, "Response missing user"
        assert data["user"]["role"] == "EMPLOYEE", f"Expected EMPLOYEE role, got {data['user']['role']}"
        assert data["user"]["email"] == EMPLOYEE_EMAIL
        print(f"Employee login successful: {data['user']['name']}")
    
    def test_employee_login_invalid_email(self):
        """Test employee login with non-existent email"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": EMPLOYEE_PASSWORD
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


@pytest.fixture
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.text}")
    return response.json()["access_token"]


@pytest.fixture
def employee_token():
    """Get employee auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": EMPLOYEE_EMAIL,
        "password": EMPLOYEE_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Employee login failed: {response.text}")
    return response.json()["access_token"]


@pytest.fixture
def admin_headers(admin_token):
    """Get auth headers for admin"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture
def employee_headers(employee_token):
    """Get auth headers for employee"""
    return {"Authorization": f"Bearer {employee_token}", "Content-Type": "application/json"}


class TestAdminDashboard:
    """Admin dashboard stats tests"""
    
    def test_get_dashboard_stats(self, admin_headers):
        """GET /api/admin/dashboard-stats returns stats"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard-stats", headers=admin_headers)
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        data = response.json()
        
        # Verify expected fields exist
        expected_fields = [
            "total_hours_this_week",
            "active_employees",
            "pending_corrections",
            "pending_leave_requests",
            "total_pending_requests",
            "total_employees"
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"Dashboard stats: {data}")
    
    def test_dashboard_stats_requires_admin(self, employee_headers):
        """Dashboard stats should require admin role"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard-stats", headers=employee_headers)
        assert response.status_code == 403, f"Expected 403 for employee, got {response.status_code}"


class TestEmployeeClockInOut:
    """Employee clock in/out tests"""
    
    def test_get_current_shift(self, employee_headers):
        """GET /api/employee/current-shift returns shift status"""
        response = requests.get(f"{BASE_URL}/api/employee/current-shift", headers=employee_headers)
        assert response.status_code == 200, f"Current shift failed: {response.text}"
        data = response.json()
        assert "clocked_in" in data, "Response missing clocked_in field"
        print(f"Current shift status: clocked_in={data['clocked_in']}")
    
    def test_clock_in_and_out_flow(self, employee_headers):
        """Test clock in and clock out flow"""
        # First check current status
        status_response = requests.get(f"{BASE_URL}/api/employee/current-shift", headers=employee_headers)
        assert status_response.status_code == 200
        status = status_response.json()
        
        if status["clocked_in"]:
            # Already clocked in, clock out first
            clock_out_response = requests.post(
                f"{BASE_URL}/api/employee/clock-out",
                json={"notes": "TEST_regression_test_cleanup"},
                headers=employee_headers
            )
            assert clock_out_response.status_code == 200, f"Clock out failed: {clock_out_response.text}"
            print("Clocked out existing shift")
        
        # Now clock in
        clock_in_response = requests.post(
            f"{BASE_URL}/api/employee/clock-in",
            json={"notes": "TEST_regression_test_clock_in"},
            headers=employee_headers
        )
        assert clock_in_response.status_code == 200, f"Clock in failed: {clock_in_response.text}"
        clock_in_data = clock_in_response.json()
        assert "id" in clock_in_data, "Clock in response missing id"
        assert "clock_in_at" in clock_in_data, "Clock in response missing clock_in_at"
        print(f"Clocked in at: {clock_in_data['clock_in_at']}")
        
        # Verify we're clocked in
        status_response = requests.get(f"{BASE_URL}/api/employee/current-shift", headers=employee_headers)
        assert status_response.status_code == 200
        assert status_response.json()["clocked_in"] == True
        
        # Now clock out
        clock_out_response = requests.post(
            f"{BASE_URL}/api/employee/clock-out",
            json={"notes": "TEST_regression_test_clock_out"},
            headers=employee_headers
        )
        assert clock_out_response.status_code == 200, f"Clock out failed: {clock_out_response.text}"
        clock_out_data = clock_out_response.json()
        assert "clock_out_at" in clock_out_data, "Clock out response missing clock_out_at"
        assert "total_minutes" in clock_out_data, "Clock out response missing total_minutes"
        print(f"Clocked out at: {clock_out_data['clock_out_at']}, total_minutes: {clock_out_data['total_minutes']}")
        
        # Verify we're clocked out
        status_response = requests.get(f"{BASE_URL}/api/employee/current-shift", headers=employee_headers)
        assert status_response.status_code == 200
        assert status_response.json()["clocked_in"] == False
    
    def test_clock_in_requires_employee(self, admin_headers):
        """Clock in should require employee role"""
        response = requests.post(
            f"{BASE_URL}/api/employee/clock-in",
            json={"notes": "TEST_admin_attempt"},
            headers=admin_headers
        )
        assert response.status_code == 403, f"Expected 403 for admin, got {response.status_code}"


class TestTicketsAPI:
    """Tickets API tests"""
    
    def test_list_tickets_admin(self, admin_headers):
        """GET /api/tickets returns tickets list for admin"""
        response = requests.get(f"{BASE_URL}/api/tickets", headers=admin_headers)
        assert response.status_code == 200, f"List tickets failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of tickets"
        print(f"Admin can see {len(data)} tickets")
    
    def test_list_tickets_employee(self, employee_headers):
        """GET /api/tickets returns tickets list for employee (their own)"""
        response = requests.get(f"{BASE_URL}/api/tickets", headers=employee_headers)
        assert response.status_code == 200, f"List tickets failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of tickets"
        print(f"Employee can see {len(data)} tickets")
    
    def test_create_ticket(self, employee_headers):
        """POST /api/tickets creates a new ticket"""
        ticket_data = {
            "subject": "TEST_Regression Test Ticket",
            "description": "This is a test ticket created during regression testing",
            "category": "IT_SUPPORT",
            "priority": "LOW"
        }
        response = requests.post(f"{BASE_URL}/api/tickets", json=ticket_data, headers=employee_headers)
        assert response.status_code == 200, f"Create ticket failed: {response.text}"
        data = response.json()
        assert "id" in data, "Response missing id"
        assert "ticket_number" in data, "Response missing ticket_number"
        assert data["subject"] == ticket_data["subject"]
        assert data["status"] == "OPEN"
        print(f"Created ticket: {data['ticket_number']}")
        return data["id"]


class TestCalendarAPI:
    """Calendar API tests"""
    
    def test_get_calendar_events(self, employee_headers):
        """GET /api/calendar/events returns events"""
        # Get events for current month
        today = datetime.now()
        start_date = today.replace(day=1).strftime("%Y-%m-%d")
        end_date = (today.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
        end_date = end_date.strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/calendar/events",
            params={"start_date": start_date, "end_date": end_date},
            headers=employee_headers
        )
        assert response.status_code == 200, f"Get calendar events failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of events"
        print(f"Calendar has {len(data)} events for current month")
    
    def test_get_holidays(self, employee_headers):
        """GET /api/holidays returns holidays list"""
        current_year = datetime.now().year
        response = requests.get(
            f"{BASE_URL}/api/holidays",
            params={"year": current_year},
            headers=employee_headers
        )
        assert response.status_code == 200, f"Get holidays failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of holidays"
        print(f"Found {len(data)} holidays for {current_year}")


class TestLeaveRequestsAPI:
    """Leave requests API tests - endpoint is /leave/requests"""
    
    def test_get_leave_requests_employee(self, employee_headers):
        """GET /api/leave/requests returns employee's leave requests"""
        response = requests.get(f"{BASE_URL}/api/leave/requests", headers=employee_headers)
        assert response.status_code == 200, f"Get leave requests failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of leave requests"
        print(f"Employee has {len(data)} leave requests")
    
    def test_get_leave_requests_admin(self, admin_headers):
        """GET /api/admin/leave/requests returns all leave requests for admin"""
        response = requests.get(f"{BASE_URL}/api/admin/leave/requests", headers=admin_headers)
        assert response.status_code == 200, f"Get leave requests failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of leave requests"
        print(f"Admin can see {len(data)} leave requests")
    
    def test_create_leave_request(self, employee_headers):
        """POST /api/leave/requests creates a new leave request"""
        # Create a leave request for next week
        start_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=8)).strftime("%Y-%m-%d")
        
        leave_data = {
            "leave_type": "VACATION",
            "is_custom_type": False,
            "start_date": start_date,
            "end_date": end_date,
            "reason": "TEST_Regression test leave request"
        }
        response = requests.post(f"{BASE_URL}/api/leave/requests", json=leave_data, headers=employee_headers)
        assert response.status_code == 200, f"Create leave request failed: {response.text}"
        data = response.json()
        assert "id" in data, "Response missing id"
        assert "message" in data, "Response missing message"
        print(f"Created leave request: {data['id']} - {data['message']}")


class TestChatChannelsAPI:
    """Chat channels API tests"""
    
    def test_get_chat_channels(self, employee_headers):
        """GET /api/chat/channels returns channels list"""
        response = requests.get(f"{BASE_URL}/api/chat/channels", headers=employee_headers)
        assert response.status_code == 200, f"Get chat channels failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of channels"
        print(f"Found {len(data)} chat channels")
        
        # Check if default #general channel exists
        channel_names = [c.get("name", "") for c in data]
        if "general" in channel_names:
            print("Default #general channel exists")
    
    def test_get_channel_messages(self, employee_headers):
        """GET /api/chat/channels/{id}/messages returns messages"""
        # First get channels
        channels_response = requests.get(f"{BASE_URL}/api/chat/channels", headers=employee_headers)
        assert channels_response.status_code == 200
        channels = channels_response.json()
        
        if not channels:
            pytest.skip("No channels available for testing")
        
        channel_id = channels[0]["id"]
        
        # Get messages for first channel
        response = requests.get(
            f"{BASE_URL}/api/chat/channels/{channel_id}/messages",
            headers=employee_headers
        )
        assert response.status_code == 200, f"Get channel messages failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of messages"
        print(f"Channel {channels[0].get('name', channel_id)} has {len(data)} messages")


class TestAuthMe:
    """Test /auth/me endpoint"""
    
    def test_auth_me_admin(self, admin_headers):
        """GET /api/auth/me returns current admin user"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert response.status_code == 200, f"Auth me failed: {response.text}"
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "ADMIN"
        print(f"Auth me (admin): {data['name']}")
    
    def test_auth_me_employee(self, employee_headers):
        """GET /api/auth/me returns current employee user"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=employee_headers)
        assert response.status_code == 200, f"Auth me failed: {response.text}"
        data = response.json()
        assert data["email"] == EMPLOYEE_EMAIL
        assert data["role"] == "EMPLOYEE"
        print(f"Auth me (employee): {data['name']}")
    
    def test_auth_me_no_token(self):
        """GET /api/auth/me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestAdminEmployees:
    """Admin employee management tests"""
    
    def test_get_employees(self, admin_headers):
        """GET /api/admin/employees returns employees list"""
        response = requests.get(f"{BASE_URL}/api/admin/employees", headers=admin_headers)
        assert response.status_code == 200, f"Get employees failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of employees"
        print(f"Admin can see {len(data)} employees")
    
    def test_get_employees_requires_admin(self, employee_headers):
        """GET /api/admin/employees requires admin role"""
        response = requests.get(f"{BASE_URL}/api/admin/employees", headers=employee_headers)
        assert response.status_code == 403, f"Expected 403 for employee, got {response.status_code}"


class TestTimesheets:
    """Timesheet API tests"""
    
    def test_get_employee_timesheets(self, employee_headers):
        """GET /api/employee/timesheets returns employee's timesheets"""
        response = requests.get(f"{BASE_URL}/api/employee/timesheets", headers=employee_headers)
        assert response.status_code == 200, f"Get timesheets failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of timesheets"
        print(f"Employee has {len(data)} timesheets")
    
    def test_get_admin_timesheets(self, admin_headers):
        """GET /api/admin/timesheets returns all timesheets for admin"""
        response = requests.get(f"{BASE_URL}/api/admin/timesheets", headers=admin_headers)
        assert response.status_code == 200, f"Get admin timesheets failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of timesheets"
        print(f"Admin can see {len(data)} timesheets")


class TestProjects:
    """Projects API tests"""
    
    def test_get_projects(self, employee_headers):
        """GET /api/projects returns projects list"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=employee_headers)
        assert response.status_code == 200, f"Get projects failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of projects"
        print(f"Found {len(data)} projects")


class TestNotifications:
    """Notifications API tests"""
    
    def test_get_notifications(self, employee_headers):
        """GET /api/notifications returns notifications list"""
        response = requests.get(f"{BASE_URL}/api/notifications", headers=employee_headers)
        assert response.status_code == 200, f"Get notifications failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of notifications"
        print(f"Employee has {len(data)} notifications")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
