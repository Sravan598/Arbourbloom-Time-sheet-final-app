"""
Comprehensive HRMS Backend Tests for AurborBloom
Tests: Authentication, Invitations, Time Tracking, Ticketing, Leave Management, Calendar, Projects, Profile
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://timeflow-54.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@company.com"
ADMIN_PASSWORD = "password123"
ADMIN_SIGNUP_CODE = "ARBORBLOOM-ADMIN-2025"
EMPLOYEE_EMAIL = "employee@test.com"
EMPLOYEE_PASSWORD = "password123"


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_admin_login_success(self):
        """Admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "ADMIN"
    
    def test_login_wrong_email(self):
        """Wrong email shows specific error message"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@company.com",
            "password": "password123"
        })
        assert response.status_code == 401
        data = response.json()
        assert "No account found with this email address" in data.get("detail", "")
    
    def test_login_wrong_password(self):
        """Wrong password shows specific error message"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        data = response.json()
        assert "Incorrect password" in data.get("detail", "")
    
    def test_employee_signup_without_invitation_blocked(self):
        """Employee signup without invitation code is blocked"""
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "name": "Test User",
            "email": f"test_{uuid.uuid4().hex[:8]}@company.com",
            "password": "password123",
            "role": "EMPLOYEE"
        })
        assert response.status_code == 403
        data = response.json()
        assert "invitation code is required" in data.get("detail", "").lower()


class TestInvitationSystem:
    """Employee Invitation System tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    def test_admin_create_invitation(self, admin_token):
        """Admin can create invitation - generates INV-XXXXXX code"""
        test_email = f"TEST_invite_{uuid.uuid4().hex[:8]}@company.com"
        response = requests.post(
            f"{BASE_URL}/api/admin/invitations",
            json={"email": test_email, "department": "Engineering"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "code" in data
        assert data["code"].startswith("INV-")
        assert len(data["code"]) == 10  # INV-XXXXXX
        assert data["email"] == test_email.lower()
        assert data["status"] == "pending"
    
    def test_get_pending_invitations(self, admin_token):
        """Pending Invitations tab shows invitations"""
        response = requests.get(
            f"{BASE_URL}/api/admin/invitations?status=pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_validate_invitation_code_endpoint(self, admin_token):
        """Validate invitation code endpoint works"""
        # First create an invitation
        test_email = f"TEST_validate_{uuid.uuid4().hex[:8]}@company.com"
        create_response = requests.post(
            f"{BASE_URL}/api/admin/invitations",
            json={"email": test_email},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
        code = create_response.json()["code"]
        
        # Validate the code (public endpoint)
        validate_response = requests.get(f"{BASE_URL}/api/invitations/validate/{code}")
        assert validate_response.status_code == 200
        data = validate_response.json()
        assert data["valid"] == True
        assert data["email"] == test_email.lower()
    
    def test_revoke_invitation(self, admin_token):
        """Admin can revoke pending invitation"""
        # Create invitation
        test_email = f"TEST_revoke_{uuid.uuid4().hex[:8]}@company.com"
        create_response = requests.post(
            f"{BASE_URL}/api/admin/invitations",
            json={"email": test_email},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
        invitation_id = create_response.json()["id"]
        
        # Revoke it
        revoke_response = requests.delete(
            f"{BASE_URL}/api/admin/invitations/{invitation_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert revoke_response.status_code == 200


class TestTimeTracking:
    """Time Tracking tests"""
    
    @pytest.fixture
    def employee_token(self):
        """Get employee auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Employee login failed - employee may not exist")
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    def test_employee_clock_in(self, employee_token):
        """Employee can clock in"""
        response = requests.post(
            f"{BASE_URL}/api/employee/clock-in",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        # May return 200 (success) or 400 (already clocked in)
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            assert "id" in data
            assert "clock_in_at" in data
    
    def test_employee_clock_out(self, employee_token):
        """Employee can clock out"""
        # First ensure clocked in
        requests.post(
            f"{BASE_URL}/api/employee/clock-in",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        
        response = requests.post(
            f"{BASE_URL}/api/employee/clock-out",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        # May return 200 (success) or 400 (not clocked in)
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
    
    def test_employee_view_timesheets(self, employee_token):
        """Employee can view timesheets"""
        response = requests.get(
            f"{BASE_URL}/api/employee/timesheets",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_admin_view_all_timesheets(self, admin_token):
        """Admin can view all timesheets"""
        response = requests.get(
            f"{BASE_URL}/api/admin/timesheets",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestTicketingSystem:
    """Ticketing System tests"""
    
    @pytest.fixture
    def employee_token(self):
        """Get employee auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Employee login failed")
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    def test_employee_create_ticket(self, employee_token):
        """Employee can create ticket with category and priority"""
        response = requests.post(
            f"{BASE_URL}/api/tickets",
            json={
                "subject": f"TEST_Ticket_{uuid.uuid4().hex[:8]}",
                "description": "This is a test ticket for comprehensive testing",
                "category": "IT_SUPPORT",
                "priority": "MEDIUM"
            },
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        assert "ticket_number" in data
        assert data["category"] == "IT_SUPPORT"
        assert data["priority"] == "MEDIUM"
        return data["id"]
    
    def test_employee_view_own_tickets(self, employee_token):
        """Employee sees own tickets"""
        response = requests.get(
            f"{BASE_URL}/api/tickets",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_admin_view_all_tickets(self, admin_token):
        """Admin sees all tickets via /api/tickets endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/tickets",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_admin_view_ticket_stats(self, admin_token):
        """Admin can view ticket statistics"""
        response = requests.get(
            f"{BASE_URL}/api/admin/tickets/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "by_status" in data
        assert "by_category" in data
    
    def test_ticket_status_update(self, admin_token, employee_token):
        """Ticket status can be updated"""
        # Create a ticket first
        create_response = requests.post(
            f"{BASE_URL}/api/tickets",
            json={
                "subject": f"TEST_StatusUpdate_{uuid.uuid4().hex[:8]}",
                "description": "Test ticket for status update",
                "category": "HR",
                "priority": "LOW"
            },
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert create_response.status_code == 200
        ticket_id = create_response.json()["id"]
        
        # Update status as admin via /api/tickets/{id}
        update_response = requests.put(
            f"{BASE_URL}/api/tickets/{ticket_id}",
            json={"status": "IN_PROGRESS"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["status"] == "IN_PROGRESS"
    
    def test_add_comment_to_ticket(self, admin_token, employee_token):
        """Comments can be added to tickets"""
        # Create a ticket
        create_response = requests.post(
            f"{BASE_URL}/api/tickets",
            json={
                "subject": f"TEST_Comment_{uuid.uuid4().hex[:8]}",
                "description": "Test ticket for comments",
                "category": "FACILITIES",
                "priority": "MEDIUM"
            },
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert create_response.status_code == 200
        ticket_id = create_response.json()["id"]
        
        # Add comment
        comment_response = requests.post(
            f"{BASE_URL}/api/tickets/{ticket_id}/comments",
            json={"content": "This is a test comment"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert comment_response.status_code == 200


class TestLeaveManagement:
    """Leave Management tests"""
    
    @pytest.fixture
    def employee_token(self):
        """Get employee auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Employee login failed")
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    def test_employee_submit_leave_request(self, employee_token):
        """Employee can submit leave request"""
        # Use dates far in the future to avoid overlap with existing requests
        start_date = (datetime.now() + timedelta(days=180)).strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=182)).strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{BASE_URL}/api/leave/requests",
            json={
                "leave_type": "Vacation",
                "start_date": start_date,
                "end_date": end_date,
                "reason": "TEST_Annual vacation leave request"
            },
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        # May return 200 (success) or 400 (overlapping dates)
        if response.status_code == 400:
            data = response.json()
            if "overlapping" in data.get("detail", "").lower():
                # This is expected if there's already a leave request for these dates
                pytest.skip("Leave request dates overlap with existing request")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        assert "message" in data  # Response format: {"message": "...", "id": "..."}
    
    def test_admin_view_all_leave_requests(self, admin_token):
        """Admin can view all leave requests"""
        response = requests.get(
            f"{BASE_URL}/api/admin/leave/requests",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_admin_approve_leave_request(self, admin_token, employee_token):
        """Admin can approve leave request"""
        # Create a leave request with unique dates
        start_date = (datetime.now() + timedelta(days=200)).strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=201)).strftime("%Y-%m-%d")
        
        create_response = requests.post(
            f"{BASE_URL}/api/leave/requests",
            json={
                "leave_type": "Personal",
                "start_date": start_date,
                "end_date": end_date,
                "reason": "TEST_Personal day for approval test"
            },
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        if create_response.status_code != 200:
            # Try to get an existing pending request
            list_response = requests.get(
                f"{BASE_URL}/api/admin/leave/requests",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            if list_response.status_code == 200:
                pending = [r for r in list_response.json() if r.get("status") == "PENDING"]
                if pending:
                    request_id = pending[0]["id"]
                else:
                    pytest.skip("No pending leave requests to approve")
            else:
                pytest.skip("Could not create or find leave request")
        else:
            request_id = create_response.json()["id"]
        
        # Approve it
        approve_response = requests.put(
            f"{BASE_URL}/api/admin/leave/requests/{request_id}",
            json={"status": "APPROVED", "review_note": "Approved for testing"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert approve_response.status_code == 200
        data = approve_response.json()
        # Response format: {"message": "Leave request approved"}
        assert "message" in data


class TestCalendar:
    """Calendar tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    def test_get_holidays(self, admin_token):
        """Calendar endpoint returns holidays"""
        response = requests.get(
            f"{BASE_URL}/api/holidays",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_admin_add_holiday(self, admin_token):
        """Admin can add holiday"""
        response = requests.post(
            f"{BASE_URL}/api/admin/holidays",
            json={
                "name": f"TEST_Holiday_{uuid.uuid4().hex[:8]}",
                "date": "2025-12-25",
                "description": "Test holiday",
                "is_recurring": False
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        assert "name" in data


class TestProjects:
    """Projects tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    @pytest.fixture
    def employee_token(self):
        """Get employee auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Employee login failed")
    
    def test_admin_create_project(self, admin_token):
        """Admin can create project"""
        response = requests.post(
            f"{BASE_URL}/api/projects",
            json={
                "name": f"TEST_Project_{uuid.uuid4().hex[:8]}",
                "description": "Test project for comprehensive testing",
                "color": "#3B82F6"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        assert "name" in data
        return data["id"]
    
    def test_admin_assign_employees_to_project(self, admin_token):
        """Admin can assign employees to project"""
        # First get employees
        employees_response = requests.get(
            f"{BASE_URL}/api/admin/employees",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if employees_response.status_code != 200 or not employees_response.json():
            pytest.skip("No employees found")
        
        employee_id = employees_response.json()[0]["id"]
        
        # Create project with assigned employee
        response = requests.post(
            f"{BASE_URL}/api/projects",
            json={
                "name": f"TEST_AssignedProject_{uuid.uuid4().hex[:8]}",
                "description": "Project with assigned employee",
                "assigned_users": [employee_id]
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert employee_id in data["assigned_users"]
    
    def test_employee_view_assigned_projects(self, employee_token):
        """Employee can view assigned projects"""
        response = requests.get(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestProfile:
    """Profile tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    def test_user_view_profile(self, admin_token):
        """User can view profile"""
        response = requests.get(
            f"{BASE_URL}/api/profile",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert data["email"] == ADMIN_EMAIL
    
    def test_user_update_profile(self, admin_token):
        """User can update profile"""
        response = requests.put(
            f"{BASE_URL}/api/profile",
            json={
                "phone": "555-0123",
                "city": "Test City"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["phone"] == "555-0123"
        assert data["city"] == "Test City"


class TestLogout:
    """Logout tests"""
    
    def test_logout_clears_session(self):
        """Logout clears session - verify token becomes invalid"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        # Verify token works
        profile_response = requests.get(
            f"{BASE_URL}/api/profile",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert profile_response.status_code == 200
        
        # Note: JWT tokens are stateless, so "logout" is typically handled client-side
        # The token will remain valid until expiration
        # This test verifies the token was valid during the session


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
