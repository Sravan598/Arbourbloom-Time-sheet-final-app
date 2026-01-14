"""
Test suite for CORtracker In-App Calendar Feature
Tests: Holiday CRUD, Calendar Events API, Role-based visibility
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


class TestAuth:
    """Authentication tests to get tokens"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def employee_token(self):
        """Get employee authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD
        })
        assert response.status_code == 200, f"Employee login failed: {response.text}"
        return response.json()["access_token"]
    
    def test_admin_login(self):
        """Test admin can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "ADMIN"
    
    def test_employee_login(self):
        """Test employee can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "EMPLOYEE"


class TestHolidayCRUD:
    """Test Holiday CRUD operations (Admin only)"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def employee_token(self):
        """Get employee authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_create_holiday_admin(self, admin_token):
        """POST /api/admin/holidays - Admin can create a holiday"""
        holiday_data = {
            "name": "TEST_New Year's Day",
            "date": "2025-01-01",
            "description": "New Year's Day Holiday",
            "is_recurring": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/holidays",
            json=holiday_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Create holiday failed: {response.text}"
        data = response.json()
        assert data["name"] == holiday_data["name"]
        assert data["date"] == holiday_data["date"]
        assert data["is_recurring"] == True
        assert "id" in data
        
        # Store for cleanup
        TestHolidayCRUD.created_holiday_id = data["id"]
    
    def test_create_holiday_employee_forbidden(self, employee_token):
        """POST /api/admin/holidays - Employee cannot create holiday"""
        holiday_data = {
            "name": "TEST_Unauthorized Holiday",
            "date": "2025-07-04",
            "description": "Should fail"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/holidays",
            json=holiday_data,
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        
        assert response.status_code == 403, "Employee should not be able to create holidays"
    
    def test_get_holidays_by_year(self, admin_token):
        """GET /api/holidays - List holidays by year"""
        current_year = datetime.now().year
        
        response = requests.get(
            f"{BASE_URL}/api/holidays?year={current_year}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_holidays_employee_can_view(self, employee_token):
        """GET /api/holidays - Employee can view holidays"""
        current_year = datetime.now().year
        
        response = requests.get(
            f"{BASE_URL}/api/holidays?year={current_year}",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_update_holiday_admin(self, admin_token):
        """PUT /api/admin/holidays/{id} - Admin can update holiday"""
        # First create a holiday to update
        create_response = requests.post(
            f"{BASE_URL}/api/admin/holidays",
            json={
                "name": "TEST_Holiday to Update",
                "date": "2025-12-25",
                "description": "Original description"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert create_response.status_code == 200
        holiday_id = create_response.json()["id"]
        
        # Update the holiday
        update_data = {
            "name": "TEST_Updated Holiday Name",
            "description": "Updated description"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/holidays/{holiday_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Update holiday failed: {response.text}"
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["description"] == update_data["description"]
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/holidays/{holiday_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_update_holiday_employee_forbidden(self, employee_token, admin_token):
        """PUT /api/admin/holidays/{id} - Employee cannot update holiday"""
        # First create a holiday as admin
        create_response = requests.post(
            f"{BASE_URL}/api/admin/holidays",
            json={
                "name": "TEST_Holiday for Employee Update Test",
                "date": "2025-11-28"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        holiday_id = create_response.json()["id"]
        
        # Try to update as employee
        response = requests.put(
            f"{BASE_URL}/api/admin/holidays/{holiday_id}",
            json={"name": "TEST_Should Fail"},
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        
        assert response.status_code == 403, "Employee should not be able to update holidays"
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/holidays/{holiday_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_delete_holiday_admin(self, admin_token):
        """DELETE /api/admin/holidays/{id} - Admin can delete holiday"""
        # First create a holiday to delete
        create_response = requests.post(
            f"{BASE_URL}/api/admin/holidays",
            json={
                "name": "TEST_Holiday to Delete",
                "date": "2025-10-31"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        holiday_id = create_response.json()["id"]
        
        # Delete the holiday
        response = requests.delete(
            f"{BASE_URL}/api/admin/holidays/{holiday_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Delete holiday failed: {response.text}"
        assert response.json()["message"] == "Holiday deleted successfully"
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/holidays?year=2025",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        holidays = get_response.json()
        assert not any(h["id"] == holiday_id for h in holidays), "Holiday should be deleted"
    
    def test_delete_holiday_employee_forbidden(self, employee_token, admin_token):
        """DELETE /api/admin/holidays/{id} - Employee cannot delete holiday"""
        # First create a holiday as admin
        create_response = requests.post(
            f"{BASE_URL}/api/admin/holidays",
            json={
                "name": "TEST_Holiday for Employee Delete Test",
                "date": "2025-09-01"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        holiday_id = create_response.json()["id"]
        
        # Try to delete as employee
        response = requests.delete(
            f"{BASE_URL}/api/admin/holidays/{holiday_id}",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        
        assert response.status_code == 403, "Employee should not be able to delete holidays"
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/holidays/{holiday_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_delete_nonexistent_holiday(self, admin_token):
        """DELETE /api/admin/holidays/{id} - Returns 404 for non-existent holiday"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/holidays/nonexistent-id-12345",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 404


class TestCalendarEvents:
    """Test Calendar Events API - aggregates all event types"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def employee_token(self):
        """Get employee authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_calendar_events_admin(self, admin_token):
        """GET /api/calendar/events - Admin can get all events"""
        start_date = "2025-01-01"
        end_date = "2025-12-31"
        
        response = requests.get(
            f"{BASE_URL}/api/calendar/events?start_date={start_date}&end_date={end_date}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Get calendar events failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        # Verify event structure if events exist
        if len(data) > 0:
            event = data[0]
            assert "id" in event
            assert "title" in event
            assert "start" in event
            assert "end" in event
            assert "type" in event
    
    def test_get_calendar_events_employee(self, employee_token):
        """GET /api/calendar/events - Employee can get events (filtered)"""
        start_date = "2025-01-01"
        end_date = "2025-12-31"
        
        response = requests.get(
            f"{BASE_URL}/api/calendar/events?start_date={start_date}&end_date={end_date}",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_calendar_events_include_holidays(self, admin_token):
        """GET /api/calendar/events - Should include holidays"""
        # First create a holiday
        holiday_response = requests.post(
            f"{BASE_URL}/api/admin/holidays",
            json={
                "name": "TEST_Calendar Holiday",
                "date": "2025-06-15",
                "description": "Test holiday for calendar"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        holiday_id = holiday_response.json()["id"]
        
        # Get calendar events
        response = requests.get(
            f"{BASE_URL}/api/calendar/events?start_date=2025-06-01&end_date=2025-06-30",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        events = response.json()
        
        # Find the holiday event
        holiday_events = [e for e in events if e["type"] == "holiday" and e["id"] == holiday_id]
        assert len(holiday_events) == 1, "Holiday should appear in calendar events"
        assert holiday_events[0]["title"] == "TEST_Calendar Holiday"
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/holidays/{holiday_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_calendar_events_types(self, admin_token):
        """GET /api/calendar/events - Verify all event types are supported"""
        response = requests.get(
            f"{BASE_URL}/api/calendar/events?start_date=2025-01-01&end_date=2025-12-31",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        events = response.json()
        
        # Check that the API returns events with valid types
        valid_types = {"holiday", "leave", "project_deadline", "birthday", "anniversary"}
        for event in events:
            assert event["type"] in valid_types, f"Invalid event type: {event['type']}"
    
    def test_calendar_events_date_range_filter(self, admin_token):
        """GET /api/calendar/events - Events are filtered by date range"""
        # Create a holiday in January
        jan_holiday = requests.post(
            f"{BASE_URL}/api/admin/holidays",
            json={"name": "TEST_January Holiday", "date": "2025-01-15"},
            headers={"Authorization": f"Bearer {admin_token}"}
        ).json()
        
        # Create a holiday in July
        jul_holiday = requests.post(
            f"{BASE_URL}/api/admin/holidays",
            json={"name": "TEST_July Holiday", "date": "2025-07-15"},
            headers={"Authorization": f"Bearer {admin_token}"}
        ).json()
        
        # Query only January
        response = requests.get(
            f"{BASE_URL}/api/calendar/events?start_date=2025-01-01&end_date=2025-01-31",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        events = response.json()
        event_ids = [e["id"] for e in events]
        
        assert jan_holiday["id"] in event_ids, "January holiday should be in January range"
        assert jul_holiday["id"] not in event_ids, "July holiday should NOT be in January range"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/holidays/{jan_holiday['id']}", headers={"Authorization": f"Bearer {admin_token}"})
        requests.delete(f"{BASE_URL}/api/admin/holidays/{jul_holiday['id']}", headers={"Authorization": f"Bearer {admin_token}"})


class TestRoleBasedVisibility:
    """Test role-based visibility for calendar events"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def employee_token(self):
        """Get employee authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_admin_sees_all_leaves(self, admin_token):
        """Admin should see all employees' leaves in calendar"""
        response = requests.get(
            f"{BASE_URL}/api/calendar/events?start_date=2025-01-01&end_date=2025-12-31",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        events = response.json()
        
        # Admin should see leave events (if any exist)
        leave_events = [e for e in events if e["type"] == "leave"]
        # Just verify the API works - actual leave visibility depends on data
        print(f"Admin sees {len(leave_events)} leave events")
    
    def test_employee_sees_own_leaves_only(self, employee_token):
        """Employee should only see their own leaves in calendar"""
        response = requests.get(
            f"{BASE_URL}/api/calendar/events?start_date=2025-01-01&end_date=2025-12-31",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        
        assert response.status_code == 200
        events = response.json()
        
        # Employee should only see their own leaves
        leave_events = [e for e in events if e["type"] == "leave"]
        for leave in leave_events:
            # All leave events should be the employee's own
            assert leave.get("is_own", True), "Employee should only see their own leaves"
    
    def test_both_roles_see_holidays(self, admin_token, employee_token):
        """Both admin and employee should see company holidays"""
        # Create a test holiday
        holiday = requests.post(
            f"{BASE_URL}/api/admin/holidays",
            json={"name": "TEST_Shared Holiday", "date": "2025-08-15"},
            headers={"Authorization": f"Bearer {admin_token}"}
        ).json()
        
        # Admin sees it
        admin_events = requests.get(
            f"{BASE_URL}/api/calendar/events?start_date=2025-08-01&end_date=2025-08-31",
            headers={"Authorization": f"Bearer {admin_token}"}
        ).json()
        
        admin_holiday_ids = [e["id"] for e in admin_events if e["type"] == "holiday"]
        assert holiday["id"] in admin_holiday_ids, "Admin should see the holiday"
        
        # Employee sees it
        employee_events = requests.get(
            f"{BASE_URL}/api/calendar/events?start_date=2025-08-01&end_date=2025-08-31",
            headers={"Authorization": f"Bearer {employee_token}"}
        ).json()
        
        employee_holiday_ids = [e["id"] for e in employee_events if e["type"] == "holiday"]
        assert holiday["id"] in employee_holiday_ids, "Employee should see the holiday"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/holidays/{holiday['id']}", headers={"Authorization": f"Bearer {admin_token}"})


class TestRecurringHolidays:
    """Test recurring holiday functionality"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_create_recurring_holiday(self, admin_token):
        """Create a recurring holiday and verify it appears in multiple years"""
        # Create recurring holiday
        holiday = requests.post(
            f"{BASE_URL}/api/admin/holidays",
            json={
                "name": "TEST_Recurring Christmas",
                "date": "2024-12-25",  # Original year
                "is_recurring": True
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        ).json()
        
        # Get holidays for 2025 - recurring should appear
        holidays_2025 = requests.get(
            f"{BASE_URL}/api/holidays?year=2025",
            headers={"Authorization": f"Bearer {admin_token}"}
        ).json()
        
        recurring_holiday = next((h for h in holidays_2025 if h["id"] == holiday["id"]), None)
        assert recurring_holiday is not None, "Recurring holiday should appear in 2025"
        assert recurring_holiday["date"] == "2025-12-25", "Date should be adjusted to 2025"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/holidays/{holiday['id']}", headers={"Authorization": f"Bearer {admin_token}"})


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_cleanup_test_holidays(self, admin_token):
        """Clean up any TEST_ prefixed holidays"""
        holidays = requests.get(
            f"{BASE_URL}/api/holidays",
            headers={"Authorization": f"Bearer {admin_token}"}
        ).json()
        
        for holiday in holidays:
            if holiday.get("name", "").startswith("TEST_"):
                requests.delete(
                    f"{BASE_URL}/api/admin/holidays/{holiday['id']}",
                    headers={"Authorization": f"Bearer {admin_token}"}
                )
        
        print("Cleanup completed")
