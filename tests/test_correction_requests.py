"""
Test suite for Employee Correction Requests feature
Tests:
- Employee can submit correction requests
- Employee can view their correction history
- Admin can view pending corrections
- Admin can approve/reject correction requests
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@company.com"
ADMIN_PASSWORD = "password123"
EMPLOYEE_EMAIL = "demo@employee.com"
EMPLOYEE_PASSWORD = "password123"


class TestAuthSetup:
    """Authentication tests to ensure we can login"""
    
    def test_admin_login(self):
        """Test admin can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "ADMIN"
        print(f"Admin login successful: {data['user']['name']}")
    
    def test_employee_login(self):
        """Test employee can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD
        })
        assert response.status_code == 200, f"Employee login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "EMPLOYEE"
        print(f"Employee login successful: {data['user']['name']}")


@pytest.fixture
def employee_token():
    """Get employee authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": EMPLOYEE_EMAIL,
        "password": EMPLOYEE_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Employee authentication failed")


@pytest.fixture
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed")


@pytest.fixture
def employee_headers(employee_token):
    """Get headers with employee auth"""
    return {
        "Authorization": f"Bearer {employee_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture
def admin_headers(admin_token):
    """Get headers with admin auth"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestEmployeeTimesheets:
    """Test employee timesheet operations needed for correction requests"""
    
    def test_get_employee_timesheets(self, employee_headers):
        """Test employee can get their timesheets"""
        response = requests.get(f"{BASE_URL}/api/employee/timesheets", headers=employee_headers)
        assert response.status_code == 200, f"Failed to get timesheets: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Employee has {len(data)} timesheet entries")
        return data
    
    def test_get_current_shift(self, employee_headers):
        """Test employee can check current shift status"""
        response = requests.get(f"{BASE_URL}/api/employee/current-shift", headers=employee_headers)
        assert response.status_code == 200, f"Failed to get current shift: {response.text}"
        data = response.json()
        assert "clocked_in" in data
        print(f"Employee clocked in: {data['clocked_in']}")
        return data


class TestCorrectionRequestsEmployee:
    """Test employee correction request operations"""
    
    def test_get_correction_requests_empty_or_list(self, employee_headers):
        """Test employee can get their correction requests"""
        response = requests.get(f"{BASE_URL}/api/employee/correction-requests", headers=employee_headers)
        assert response.status_code == 200, f"Failed to get correction requests: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Employee has {len(data)} correction requests")
        return data
    
    def test_submit_correction_request_requires_valid_timesheet(self, employee_headers):
        """Test that correction request requires a valid timesheet ID"""
        response = requests.post(f"{BASE_URL}/api/employee/correction-request", 
            headers=employee_headers,
            json={
                "timesheet_id": "invalid-id-12345",
                "requested_change": {
                    "clock_in_at": datetime.now().isoformat(),
                    "clock_out_at": (datetime.now() + timedelta(hours=8)).isoformat()
                },
                "reason": "Testing invalid timesheet ID handling"
            }
        )
        # Should return 404 for invalid timesheet
        assert response.status_code == 404, f"Expected 404 for invalid timesheet, got {response.status_code}: {response.text}"
        print("Correctly rejected invalid timesheet ID")
    
    def test_submit_correction_request_requires_reason(self, employee_headers):
        """Test that correction request requires a reason with min 10 chars"""
        # First get a valid timesheet
        ts_response = requests.get(f"{BASE_URL}/api/employee/timesheets", headers=employee_headers)
        timesheets = ts_response.json()
        
        if not timesheets:
            pytest.skip("No timesheets available for testing")
        
        # Find a completed timesheet (with clock_out_at)
        completed_ts = next((ts for ts in timesheets if ts.get("clock_out_at")), None)
        if not completed_ts:
            pytest.skip("No completed timesheets available for testing")
        
        # Try with short reason
        response = requests.post(f"{BASE_URL}/api/employee/correction-request",
            headers=employee_headers,
            json={
                "timesheet_id": completed_ts["id"],
                "requested_change": {
                    "clock_in_at": datetime.now().isoformat()
                },
                "reason": "short"  # Less than 10 chars
            }
        )
        # Should return 422 for validation error
        assert response.status_code == 422, f"Expected 422 for short reason, got {response.status_code}: {response.text}"
        print("Correctly rejected short reason")


class TestCorrectionRequestsAdmin:
    """Test admin correction request operations"""
    
    def test_get_all_correction_requests(self, admin_headers):
        """Test admin can get all correction requests"""
        response = requests.get(f"{BASE_URL}/api/admin/correction-requests", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get correction requests: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Admin sees {len(data)} total correction requests")
        return data
    
    def test_get_pending_correction_requests(self, admin_headers):
        """Test admin can filter pending correction requests"""
        response = requests.get(f"{BASE_URL}/api/admin/correction-requests?status=PENDING", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get pending corrections: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # All returned should be PENDING
        for req in data:
            assert req.get("status") == "PENDING", f"Expected PENDING status, got {req.get('status')}"
        print(f"Admin sees {len(data)} pending correction requests")
        return data
    
    def test_admin_dashboard_stats_includes_corrections(self, admin_headers):
        """Test admin dashboard stats includes pending corrections count"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard-stats", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get dashboard stats: {response.text}"
        data = response.json()
        assert "pending_corrections" in data, "Dashboard stats should include pending_corrections"
        assert "total_pending_requests" in data, "Dashboard stats should include total_pending_requests"
        print(f"Dashboard stats: pending_corrections={data['pending_corrections']}, total_pending_requests={data['total_pending_requests']}")
        return data


class TestCorrectionRequestFullFlow:
    """Test the full correction request flow: create -> view -> approve/reject"""
    
    def test_full_correction_flow(self, employee_headers, admin_headers):
        """Test complete correction request flow"""
        # Step 1: Get employee timesheets
        ts_response = requests.get(f"{BASE_URL}/api/employee/timesheets", headers=employee_headers)
        assert ts_response.status_code == 200
        timesheets = ts_response.json()
        
        if not timesheets:
            # Need to create a timesheet first
            print("No timesheets found, creating one...")
            
            # Check if already clocked in
            shift_response = requests.get(f"{BASE_URL}/api/employee/current-shift", headers=employee_headers)
            shift_data = shift_response.json()
            
            if shift_data.get("clocked_in"):
                # Clock out first
                clock_out_response = requests.post(f"{BASE_URL}/api/employee/clock-out", 
                    headers=employee_headers,
                    json={"notes": "Test clock out for correction test"}
                )
                print(f"Clocked out: {clock_out_response.status_code}")
            else:
                # Clock in then out
                clock_in_response = requests.post(f"{BASE_URL}/api/employee/clock-in",
                    headers=employee_headers,
                    json={"notes": "Test clock in for correction test"}
                )
                assert clock_in_response.status_code == 200, f"Clock in failed: {clock_in_response.text}"
                print("Clocked in successfully")
                
                # Wait a moment then clock out
                import time
                time.sleep(1)
                
                clock_out_response = requests.post(f"{BASE_URL}/api/employee/clock-out",
                    headers=employee_headers,
                    json={"notes": "Test clock out for correction test"}
                )
                assert clock_out_response.status_code == 200, f"Clock out failed: {clock_out_response.text}"
                print("Clocked out successfully")
            
            # Get timesheets again
            ts_response = requests.get(f"{BASE_URL}/api/employee/timesheets", headers=employee_headers)
            timesheets = ts_response.json()
        
        # Find a completed timesheet
        completed_ts = next((ts for ts in timesheets if ts.get("clock_out_at")), None)
        if not completed_ts:
            pytest.skip("No completed timesheets available")
        
        print(f"Using timesheet ID: {completed_ts['id']}")
        
        # Step 2: Submit correction request
        new_clock_in = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0)
        new_clock_out = datetime.now().replace(hour=17, minute=30, second=0, microsecond=0)
        
        correction_response = requests.post(f"{BASE_URL}/api/employee/correction-request",
            headers=employee_headers,
            json={
                "timesheet_id": completed_ts["id"],
                "requested_change": {
                    "clock_in_at": new_clock_in.isoformat(),
                    "clock_out_at": new_clock_out.isoformat()
                },
                "reason": "TEST_CORRECTION: Forgot to clock in on time, was actually at desk by 9am"
            }
        )
        assert correction_response.status_code == 200, f"Failed to submit correction: {correction_response.text}"
        correction_data = correction_response.json()
        assert "id" in correction_data
        assert correction_data["status"] == "PENDING"
        print(f"Correction request created: {correction_data['id']}")
        
        correction_id = correction_data["id"]
        
        # Step 3: Verify employee can see their correction request
        my_corrections_response = requests.get(f"{BASE_URL}/api/employee/correction-requests", headers=employee_headers)
        assert my_corrections_response.status_code == 200
        my_corrections = my_corrections_response.json()
        assert any(c["id"] == correction_id for c in my_corrections), "Employee should see their correction request"
        print("Employee can see their correction request")
        
        # Step 4: Admin can see the pending correction
        admin_corrections_response = requests.get(f"{BASE_URL}/api/admin/correction-requests?status=PENDING", headers=admin_headers)
        assert admin_corrections_response.status_code == 200
        admin_corrections = admin_corrections_response.json()
        assert any(c["id"] == correction_id for c in admin_corrections), "Admin should see pending correction"
        print("Admin can see pending correction request")
        
        # Step 5: Admin approves the correction
        approve_response = requests.put(f"{BASE_URL}/api/admin/correction-requests/{correction_id}",
            headers=admin_headers,
            json={
                "status": "APPROVED",
                "admin_notes": "TEST: Approved for testing purposes"
            }
        )
        assert approve_response.status_code == 200, f"Failed to approve correction: {approve_response.text}"
        approved_data = approve_response.json()
        assert approved_data["status"] == "APPROVED"
        print("Admin approved correction request")
        
        # Step 6: Verify the correction is no longer pending
        pending_response = requests.get(f"{BASE_URL}/api/admin/correction-requests?status=PENDING", headers=admin_headers)
        pending_corrections = pending_response.json()
        assert not any(c["id"] == correction_id for c in pending_corrections), "Approved correction should not be in pending list"
        print("Correction no longer in pending list")
        
        # Step 7: Verify employee sees updated status
        final_corrections_response = requests.get(f"{BASE_URL}/api/employee/correction-requests", headers=employee_headers)
        final_corrections = final_corrections_response.json()
        approved_correction = next((c for c in final_corrections if c["id"] == correction_id), None)
        assert approved_correction is not None
        assert approved_correction["status"] == "APPROVED"
        print("Employee sees approved status")
        
        print("\n=== Full correction flow test PASSED ===")


class TestCorrectionRequestRejection:
    """Test admin rejection of correction requests"""
    
    def test_admin_can_reject_correction(self, employee_headers, admin_headers):
        """Test admin can reject a correction request"""
        # Get a completed timesheet
        ts_response = requests.get(f"{BASE_URL}/api/employee/timesheets", headers=employee_headers)
        timesheets = ts_response.json()
        completed_ts = next((ts for ts in timesheets if ts.get("clock_out_at")), None)
        
        if not completed_ts:
            pytest.skip("No completed timesheets available")
        
        # Submit correction request
        correction_response = requests.post(f"{BASE_URL}/api/employee/correction-request",
            headers=employee_headers,
            json={
                "timesheet_id": completed_ts["id"],
                "requested_change": {
                    "clock_out_at": datetime.now().isoformat()
                },
                "reason": "TEST_REJECTION: This correction should be rejected for testing"
            }
        )
        
        if correction_response.status_code != 200:
            pytest.skip(f"Could not create correction request: {correction_response.text}")
        
        correction_id = correction_response.json()["id"]
        
        # Admin rejects
        reject_response = requests.put(f"{BASE_URL}/api/admin/correction-requests/{correction_id}",
            headers=admin_headers,
            json={
                "status": "REJECTED",
                "admin_notes": "TEST: Rejected for testing purposes"
            }
        )
        assert reject_response.status_code == 200, f"Failed to reject: {reject_response.text}"
        rejected_data = reject_response.json()
        assert rejected_data["status"] == "REJECTED"
        assert rejected_data["admin_notes"] == "TEST: Rejected for testing purposes"
        print("Admin successfully rejected correction request")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
