"""
Test suite for Employee Invitation System
Tests:
- Admin can create invitation from Employees page
- Invitation code is generated and displayed
- Admin can view pending invitations
- Admin can revoke pending invitations
- Signup page requires invitation code for employee registration
- Signup page validates invitation code
- Employee can signup with valid invitation code
- Employee cannot signup without invitation code
- Employee cannot signup with invalid/expired invitation code
- Admin signup still works with admin invite code
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestInvitationSystem:
    """Test suite for the Employee Invitation System"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.admin_email = "admin@company.com"
        self.admin_password = "password123"
        self.admin_invite_code = "ARBORBLOOM-ADMIN-2025"
        self.test_employee_email = f"test_invite_{uuid.uuid4().hex[:8]}@company.com"
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_admin_token(self):
        """Get admin authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.admin_email,
            "password": self.admin_password
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
    
    # ============== BACKEND API TESTS ==============
    
    def test_01_api_health_check(self):
        """Test API is accessible"""
        response = self.session.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"API health check failed: {response.text}"
        print("✓ API health check passed")
    
    def test_02_admin_login(self):
        """Test admin can login"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.admin_email,
            "password": self.admin_password
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "ADMIN"
        print("✓ Admin login successful")
    
    def test_03_create_invitation(self):
        """Test admin can create an invitation"""
        token = self.get_admin_token()
        assert token, "Failed to get admin token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.post(f"{BASE_URL}/api/admin/invitations", json={
            "email": self.test_employee_email,
            "department": "Engineering",
            "expires_in_days": 7
        })
        
        assert response.status_code == 200, f"Create invitation failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data, "Response missing 'id'"
        assert "code" in data, "Response missing 'code'"
        assert "email" in data, "Response missing 'email'"
        assert "status" in data, "Response missing 'status'"
        
        # Verify code format (INV-XXXXXX)
        assert data["code"].startswith("INV-"), f"Invalid code format: {data['code']}"
        assert len(data["code"]) == 10, f"Invalid code length: {data['code']}"
        
        # Verify status is pending
        assert data["status"] == "pending", f"Expected status 'pending', got '{data['status']}'"
        
        # Verify email matches
        assert data["email"] == self.test_employee_email.lower()
        
        print(f"✓ Invitation created successfully with code: {data['code']}")
        return data["code"], data["id"]
    
    def test_04_list_invitations(self):
        """Test admin can list all invitations"""
        token = self.get_admin_token()
        assert token, "Failed to get admin token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/admin/invitations")
        
        assert response.status_code == 200, f"List invitations failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Listed {len(data)} invitations")
    
    def test_05_list_pending_invitations(self):
        """Test admin can filter pending invitations"""
        token = self.get_admin_token()
        assert token, "Failed to get admin token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/admin/invitations?status=pending")
        
        assert response.status_code == 200, f"List pending invitations failed: {response.text}"
        data = response.json()
        
        # All returned invitations should be pending
        for inv in data:
            assert inv["status"] == "pending", f"Expected pending status, got {inv['status']}"
        
        print(f"✓ Listed {len(data)} pending invitations")
    
    def test_06_validate_invitation_code(self):
        """Test public endpoint to validate invitation code"""
        # First create an invitation
        token = self.get_admin_token()
        assert token, "Failed to get admin token"
        
        test_email = f"validate_test_{uuid.uuid4().hex[:8]}@company.com"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        create_response = self.session.post(f"{BASE_URL}/api/admin/invitations", json={
            "email": test_email,
            "expires_in_days": 7
        })
        assert create_response.status_code == 200
        code = create_response.json()["code"]
        
        # Now validate the code (public endpoint - no auth needed)
        del self.session.headers["Authorization"]
        
        response = self.session.get(f"{BASE_URL}/api/invitations/validate/{code}")
        
        assert response.status_code == 200, f"Validate invitation failed: {response.text}"
        data = response.json()
        
        assert data["valid"] == True
        assert data["email"] == test_email.lower()
        
        print(f"✓ Invitation code {code} validated successfully")
    
    def test_07_validate_invalid_code(self):
        """Test validation fails for invalid code"""
        response = self.session.get(f"{BASE_URL}/api/invitations/validate/INVALID-CODE")
        
        assert response.status_code == 404, f"Expected 404 for invalid code, got {response.status_code}"
        print("✓ Invalid code correctly rejected")
    
    def test_08_revoke_invitation(self):
        """Test admin can revoke an invitation"""
        token = self.get_admin_token()
        assert token, "Failed to get admin token"
        
        test_email = f"revoke_test_{uuid.uuid4().hex[:8]}@company.com"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Create invitation
        create_response = self.session.post(f"{BASE_URL}/api/admin/invitations", json={
            "email": test_email,
            "expires_in_days": 7
        })
        assert create_response.status_code == 200
        invitation_id = create_response.json()["id"]
        code = create_response.json()["code"]
        
        # Revoke invitation
        revoke_response = self.session.delete(f"{BASE_URL}/api/admin/invitations/{invitation_id}")
        
        assert revoke_response.status_code == 200, f"Revoke invitation failed: {revoke_response.text}"
        
        # Verify code is no longer valid
        del self.session.headers["Authorization"]
        validate_response = self.session.get(f"{BASE_URL}/api/invitations/validate/{code}")
        assert validate_response.status_code == 404, "Revoked code should not be valid"
        
        print(f"✓ Invitation {invitation_id} revoked successfully")
    
    def test_09_signup_without_invitation_code_fails(self):
        """Test employee signup fails without invitation code"""
        response = self.session.post(f"{BASE_URL}/api/auth/signup", json={
            "name": "Test Employee",
            "email": f"no_code_{uuid.uuid4().hex[:8]}@company.com",
            "password": "password123",
            "role": "EMPLOYEE"
        })
        
        assert response.status_code == 403, f"Expected 403 without invite code, got {response.status_code}"
        data = response.json()
        assert "invitation code is required" in data.get("detail", "").lower() or "invitation" in data.get("detail", "").lower()
        
        print("✓ Signup without invitation code correctly rejected")
    
    def test_10_signup_with_invalid_code_fails(self):
        """Test employee signup fails with invalid invitation code"""
        response = self.session.post(f"{BASE_URL}/api/auth/signup", json={
            "name": "Test Employee",
            "email": f"invalid_code_{uuid.uuid4().hex[:8]}@company.com",
            "password": "password123",
            "role": "EMPLOYEE",
            "employee_invite_code": "INVALID-CODE"
        })
        
        assert response.status_code == 403, f"Expected 403 with invalid code, got {response.status_code}"
        
        print("✓ Signup with invalid invitation code correctly rejected")
    
    def test_11_signup_with_valid_invitation_code(self):
        """Test employee can signup with valid invitation code"""
        # First create an invitation as admin
        token = self.get_admin_token()
        assert token, "Failed to get admin token"
        
        test_email = f"valid_signup_{uuid.uuid4().hex[:8]}@company.com"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        create_response = self.session.post(f"{BASE_URL}/api/admin/invitations", json={
            "email": test_email,
            "department": "Sales",
            "expires_in_days": 7
        })
        assert create_response.status_code == 200
        code = create_response.json()["code"]
        
        # Now signup with the code (no auth needed)
        del self.session.headers["Authorization"]
        
        signup_response = self.session.post(f"{BASE_URL}/api/auth/signup", json={
            "name": "Test Valid Employee",
            "email": test_email,
            "password": "password123",
            "role": "EMPLOYEE",
            "employee_invite_code": code
        })
        
        assert signup_response.status_code == 200, f"Signup with valid code failed: {signup_response.text}"
        data = signup_response.json()
        
        assert "access_token" in data
        assert data["user"]["email"] == test_email.lower()
        assert data["user"]["role"] == "EMPLOYEE"
        
        print(f"✓ Employee signup with invitation code {code} successful")
    
    def test_12_invitation_marked_accepted_after_signup(self):
        """Test invitation status changes to accepted after signup"""
        # Create invitation
        token = self.get_admin_token()
        assert token, "Failed to get admin token"
        
        test_email = f"accepted_test_{uuid.uuid4().hex[:8]}@company.com"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        create_response = self.session.post(f"{BASE_URL}/api/admin/invitations", json={
            "email": test_email,
            "expires_in_days": 7
        })
        assert create_response.status_code == 200
        code = create_response.json()["code"]
        invitation_id = create_response.json()["id"]
        
        # Signup with the code
        del self.session.headers["Authorization"]
        signup_response = self.session.post(f"{BASE_URL}/api/auth/signup", json={
            "name": "Test Accepted Employee",
            "email": test_email,
            "password": "password123",
            "role": "EMPLOYEE",
            "employee_invite_code": code
        })
        assert signup_response.status_code == 200
        
        # Check invitation status as admin
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        list_response = self.session.get(f"{BASE_URL}/api/admin/invitations")
        assert list_response.status_code == 200
        
        invitations = list_response.json()
        target_inv = next((inv for inv in invitations if inv["id"] == invitation_id), None)
        
        assert target_inv is not None, "Invitation not found"
        assert target_inv["status"] == "accepted", f"Expected 'accepted' status, got '{target_inv['status']}'"
        
        print(f"✓ Invitation status correctly updated to 'accepted'")
    
    def test_13_cannot_reuse_accepted_invitation(self):
        """Test that accepted invitation code cannot be reused"""
        # Create and use an invitation
        token = self.get_admin_token()
        assert token, "Failed to get admin token"
        
        test_email = f"reuse_test_{uuid.uuid4().hex[:8]}@company.com"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        create_response = self.session.post(f"{BASE_URL}/api/admin/invitations", json={
            "email": test_email,
            "expires_in_days": 7
        })
        assert create_response.status_code == 200
        code = create_response.json()["code"]
        
        # First signup
        del self.session.headers["Authorization"]
        signup_response = self.session.post(f"{BASE_URL}/api/auth/signup", json={
            "name": "First User",
            "email": test_email,
            "password": "password123",
            "role": "EMPLOYEE",
            "employee_invite_code": code
        })
        assert signup_response.status_code == 200
        
        # Try to reuse the code
        another_email = f"reuse_attempt_{uuid.uuid4().hex[:8]}@company.com"
        reuse_response = self.session.post(f"{BASE_URL}/api/auth/signup", json={
            "name": "Second User",
            "email": another_email,
            "password": "password123",
            "role": "EMPLOYEE",
            "employee_invite_code": code
        })
        
        assert reuse_response.status_code == 403, f"Expected 403 for reused code, got {reuse_response.status_code}"
        
        print("✓ Accepted invitation code cannot be reused")
    
    def test_14_admin_signup_with_admin_code(self):
        """Test admin signup still works with admin invite code"""
        admin_email = f"admin_test_{uuid.uuid4().hex[:8]}@company.com"
        
        response = self.session.post(f"{BASE_URL}/api/auth/signup", json={
            "name": "Test Admin",
            "email": admin_email,
            "password": "password123",
            "role": "ADMIN",
            "admin_invite_code": self.admin_invite_code
        })
        
        assert response.status_code == 200, f"Admin signup failed: {response.text}"
        data = response.json()
        
        assert "access_token" in data
        assert data["user"]["role"] == "ADMIN"
        
        print(f"✓ Admin signup with code {self.admin_invite_code} successful")
    
    def test_15_admin_signup_with_wrong_code_fails(self):
        """Test admin signup fails with wrong admin code"""
        admin_email = f"admin_wrong_{uuid.uuid4().hex[:8]}@company.com"
        
        response = self.session.post(f"{BASE_URL}/api/auth/signup", json={
            "name": "Test Admin Wrong",
            "email": admin_email,
            "password": "password123",
            "role": "ADMIN",
            "admin_invite_code": "WRONG-ADMIN-CODE"
        })
        
        assert response.status_code == 403, f"Expected 403 for wrong admin code, got {response.status_code}"
        
        print("✓ Admin signup with wrong code correctly rejected")
    
    def test_16_duplicate_pending_invitation_fails(self):
        """Test cannot create duplicate pending invitation for same email"""
        token = self.get_admin_token()
        assert token, "Failed to get admin token"
        
        test_email = f"duplicate_test_{uuid.uuid4().hex[:8]}@company.com"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # First invitation
        first_response = self.session.post(f"{BASE_URL}/api/admin/invitations", json={
            "email": test_email,
            "expires_in_days": 7
        })
        assert first_response.status_code == 200
        
        # Second invitation for same email
        second_response = self.session.post(f"{BASE_URL}/api/admin/invitations", json={
            "email": test_email,
            "expires_in_days": 7
        })
        
        assert second_response.status_code == 400, f"Expected 400 for duplicate, got {second_response.status_code}"
        
        print("✓ Duplicate pending invitation correctly rejected")
    
    def test_17_cannot_invite_registered_email(self):
        """Test cannot create invitation for already registered email"""
        token = self.get_admin_token()
        assert token, "Failed to get admin token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Try to invite already registered admin email
        response = self.session.post(f"{BASE_URL}/api/admin/invitations", json={
            "email": self.admin_email,
            "expires_in_days": 7
        })
        
        assert response.status_code == 400, f"Expected 400 for registered email, got {response.status_code}"
        
        print("✓ Invitation for registered email correctly rejected")
    
    def test_18_email_mismatch_fails(self):
        """Test signup fails when email doesn't match invitation"""
        # Create invitation for specific email
        token = self.get_admin_token()
        assert token, "Failed to get admin token"
        
        invited_email = f"invited_{uuid.uuid4().hex[:8]}@company.com"
        different_email = f"different_{uuid.uuid4().hex[:8]}@company.com"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        create_response = self.session.post(f"{BASE_URL}/api/admin/invitations", json={
            "email": invited_email,
            "expires_in_days": 7
        })
        assert create_response.status_code == 200
        code = create_response.json()["code"]
        
        # Try to signup with different email
        del self.session.headers["Authorization"]
        signup_response = self.session.post(f"{BASE_URL}/api/auth/signup", json={
            "name": "Wrong Email User",
            "email": different_email,
            "password": "password123",
            "role": "EMPLOYEE",
            "employee_invite_code": code
        })
        
        assert signup_response.status_code == 403, f"Expected 403 for email mismatch, got {signup_response.status_code}"
        
        print("✓ Email mismatch correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
