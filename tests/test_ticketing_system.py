"""
Test suite for CORtracker Ticketing System
Tests: Ticket CRUD, Comments, Attachments, SLA tracking, Admin stats
"""
import pytest
import requests
import os
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@company.com"
ADMIN_PASSWORD = "password123"
EMPLOYEE_EMAIL = "employee@test.com"
EMPLOYEE_PASSWORD = "password123"

# Test data storage
test_data = {
    "admin_token": None,
    "employee_token": None,
    "admin_id": None,
    "employee_id": None,
    "created_ticket_id": None,
    "created_ticket_number": None,
    "created_comment_id": None
}


class TestAuthSetup:
    """Setup authentication for tests"""
    
    def test_admin_login(self):
        """Login as admin to get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        test_data["admin_token"] = data["access_token"]
        test_data["admin_id"] = data["user"]["id"]
        print(f"Admin login successful: {data['user']['name']}")
    
    def test_employee_login_or_create(self):
        """Login as employee or create if not exists"""
        # Try login first
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            test_data["employee_token"] = data["access_token"]
            test_data["employee_id"] = data["user"]["id"]
            print(f"Employee login successful: {data['user']['name']}")
        else:
            # Create employee account
            response = requests.post(f"{BASE_URL}/api/auth/signup", json={
                "name": "Test Employee",
                "email": EMPLOYEE_EMAIL,
                "password": EMPLOYEE_PASSWORD,
                "role": "EMPLOYEE"
            })
            assert response.status_code == 200, f"Employee signup failed: {response.text}"
            data = response.json()
            test_data["employee_token"] = data["access_token"]
            test_data["employee_id"] = data["user"]["id"]
            print(f"Employee created: {data['user']['name']}")


class TestTicketCreation:
    """Test ticket creation endpoints"""
    
    def test_create_ticket_as_employee(self):
        """Employee creates a new support ticket"""
        assert test_data["employee_token"], "Employee token required"
        
        response = requests.post(
            f"{BASE_URL}/api/tickets",
            headers={"Authorization": f"Bearer {test_data['employee_token']}"},
            json={
                "subject": "TEST_Ticket: Computer not starting",
                "description": "My computer won't turn on. I've tried pressing the power button multiple times but nothing happens.",
                "category": "IT_SUPPORT",
                "priority": "HIGH"
            }
        )
        
        assert response.status_code == 200, f"Create ticket failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "id" in data
        assert "ticket_number" in data
        assert data["ticket_number"].startswith("TKT-")
        assert data["subject"] == "TEST_Ticket: Computer not starting"
        assert data["category"] == "IT_SUPPORT"
        assert data["priority"] == "HIGH"
        assert data["status"] == "OPEN"
        assert data["sla_due_at"] is not None  # SLA should be calculated
        
        test_data["created_ticket_id"] = data["id"]
        test_data["created_ticket_number"] = data["ticket_number"]
        print(f"Ticket created: {data['ticket_number']}")
    
    def test_create_ticket_all_categories(self):
        """Test creating tickets with all category types"""
        assert test_data["employee_token"], "Employee token required"
        
        categories = ["HR", "PAYROLL", "FACILITIES", "TIME_ATTENDANCE", "BENEFITS", "OTHER"]
        
        for category in categories:
            response = requests.post(
                f"{BASE_URL}/api/tickets",
                headers={"Authorization": f"Bearer {test_data['employee_token']}"},
                json={
                    "subject": f"TEST_Ticket: {category} issue",
                    "description": f"This is a test ticket for {category} category with sufficient description length.",
                    "category": category,
                    "priority": "MEDIUM"
                }
            )
            assert response.status_code == 200, f"Create {category} ticket failed: {response.text}"
            print(f"Created ticket for category: {category}")
    
    def test_create_ticket_all_priorities(self):
        """Test creating tickets with all priority levels"""
        assert test_data["employee_token"], "Employee token required"
        
        priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"]
        
        for priority in priorities:
            response = requests.post(
                f"{BASE_URL}/api/tickets",
                headers={"Authorization": f"Bearer {test_data['employee_token']}"},
                json={
                    "subject": f"TEST_Ticket: {priority} priority test",
                    "description": f"This is a test ticket with {priority} priority to verify SLA calculation.",
                    "category": "OTHER",
                    "priority": priority
                }
            )
            assert response.status_code == 200, f"Create {priority} ticket failed: {response.text}"
            data = response.json()
            assert data["priority"] == priority
            print(f"Created ticket with priority: {priority}")
    
    def test_create_ticket_validation_short_subject(self):
        """Test validation - subject too short"""
        assert test_data["employee_token"], "Employee token required"
        
        response = requests.post(
            f"{BASE_URL}/api/tickets",
            headers={"Authorization": f"Bearer {test_data['employee_token']}"},
            json={
                "subject": "Hi",  # Too short (min 5)
                "description": "This is a valid description with enough characters.",
                "category": "IT_SUPPORT",
                "priority": "MEDIUM"
            }
        )
        assert response.status_code == 422, "Should reject short subject"
    
    def test_create_ticket_validation_short_description(self):
        """Test validation - description too short"""
        assert test_data["employee_token"], "Employee token required"
        
        response = requests.post(
            f"{BASE_URL}/api/tickets",
            headers={"Authorization": f"Bearer {test_data['employee_token']}"},
            json={
                "subject": "Valid subject here",
                "description": "Short",  # Too short (min 10)
                "category": "IT_SUPPORT",
                "priority": "MEDIUM"
            }
        )
        assert response.status_code == 422, "Should reject short description"


class TestTicketRetrieval:
    """Test ticket retrieval endpoints"""
    
    def test_employee_get_own_tickets(self):
        """Employee can see their own tickets"""
        assert test_data["employee_token"], "Employee token required"
        
        response = requests.get(
            f"{BASE_URL}/api/tickets",
            headers={"Authorization": f"Bearer {test_data['employee_token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Employee should have tickets"
        
        # Verify all tickets belong to employee
        for ticket in data:
            assert ticket["created_by"] == test_data["employee_id"]
        
        print(f"Employee sees {len(data)} tickets")
    
    def test_admin_get_all_tickets(self):
        """Admin can see all tickets"""
        assert test_data["admin_token"], "Admin token required"
        
        response = requests.get(
            f"{BASE_URL}/api/tickets",
            headers={"Authorization": f"Bearer {test_data['admin_token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Admin sees {len(data)} tickets")
    
    def test_get_specific_ticket(self):
        """Get a specific ticket by ID"""
        assert test_data["employee_token"], "Employee token required"
        assert test_data["created_ticket_id"], "Ticket ID required"
        
        response = requests.get(
            f"{BASE_URL}/api/tickets/{test_data['created_ticket_id']}",
            headers={"Authorization": f"Bearer {test_data['employee_token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_data["created_ticket_id"]
        assert data["ticket_number"] == test_data["created_ticket_number"]
        print(f"Retrieved ticket: {data['ticket_number']}")
    
    def test_filter_tickets_by_status(self):
        """Filter tickets by status"""
        assert test_data["admin_token"], "Admin token required"
        
        response = requests.get(
            f"{BASE_URL}/api/tickets?status=OPEN",
            headers={"Authorization": f"Bearer {test_data['admin_token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        for ticket in data:
            assert ticket["status"] == "OPEN"
        print(f"Found {len(data)} OPEN tickets")
    
    def test_filter_tickets_by_category(self):
        """Filter tickets by category"""
        assert test_data["admin_token"], "Admin token required"
        
        response = requests.get(
            f"{BASE_URL}/api/tickets?category=IT_SUPPORT",
            headers={"Authorization": f"Bearer {test_data['admin_token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        for ticket in data:
            assert ticket["category"] == "IT_SUPPORT"
        print(f"Found {len(data)} IT_SUPPORT tickets")
    
    def test_filter_tickets_by_priority(self):
        """Filter tickets by priority"""
        assert test_data["admin_token"], "Admin token required"
        
        response = requests.get(
            f"{BASE_URL}/api/tickets?priority=HIGH",
            headers={"Authorization": f"Bearer {test_data['admin_token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        for ticket in data:
            assert ticket["priority"] == "HIGH"
        print(f"Found {len(data)} HIGH priority tickets")


class TestTicketUpdate:
    """Test ticket update endpoints"""
    
    def test_admin_update_ticket_status(self):
        """Admin can update ticket status"""
        assert test_data["admin_token"], "Admin token required"
        assert test_data["created_ticket_id"], "Ticket ID required"
        
        response = requests.put(
            f"{BASE_URL}/api/tickets/{test_data['created_ticket_id']}",
            headers={"Authorization": f"Bearer {test_data['admin_token']}"},
            json={"status": "IN_PROGRESS"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "IN_PROGRESS"
        print("Ticket status updated to IN_PROGRESS")
    
    def test_admin_update_ticket_priority(self):
        """Admin can update ticket priority"""
        assert test_data["admin_token"], "Admin token required"
        assert test_data["created_ticket_id"], "Ticket ID required"
        
        response = requests.put(
            f"{BASE_URL}/api/tickets/{test_data['created_ticket_id']}",
            headers={"Authorization": f"Bearer {test_data['admin_token']}"},
            json={"priority": "URGENT"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["priority"] == "URGENT"
        print("Ticket priority updated to URGENT")
    
    def test_admin_assign_ticket(self):
        """Admin can assign ticket to themselves"""
        assert test_data["admin_token"], "Admin token required"
        assert test_data["admin_id"], "Admin ID required"
        assert test_data["created_ticket_id"], "Ticket ID required"
        
        response = requests.put(
            f"{BASE_URL}/api/tickets/{test_data['created_ticket_id']}",
            headers={"Authorization": f"Bearer {test_data['admin_token']}"},
            json={"assigned_to": [test_data["admin_id"]]}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert test_data["admin_id"] in data["assigned_to"]
        assert len(data["assigned_names"]) > 0
        print(f"Ticket assigned to: {data['assigned_names']}")
    
    def test_admin_update_ticket_category(self):
        """Admin can update ticket category"""
        assert test_data["admin_token"], "Admin token required"
        assert test_data["created_ticket_id"], "Ticket ID required"
        
        response = requests.put(
            f"{BASE_URL}/api/tickets/{test_data['created_ticket_id']}",
            headers={"Authorization": f"Bearer {test_data['admin_token']}"},
            json={"category": "FACILITIES"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "FACILITIES"
        print("Ticket category updated to FACILITIES")
    
    def test_employee_cannot_update_status(self):
        """Employee cannot update ticket status"""
        assert test_data["employee_token"], "Employee token required"
        assert test_data["created_ticket_id"], "Ticket ID required"
        
        response = requests.put(
            f"{BASE_URL}/api/tickets/{test_data['created_ticket_id']}",
            headers={"Authorization": f"Bearer {test_data['employee_token']}"},
            json={"status": "RESOLVED"}
        )
        
        # Employee can access their own ticket but status change should not apply
        # The API allows access but only admin fields are updated
        assert response.status_code == 200
        data = response.json()
        # Status should NOT be changed by employee
        assert data["status"] != "RESOLVED" or data["status"] == "IN_PROGRESS"


class TestTicketComments:
    """Test ticket comment endpoints"""
    
    def test_admin_add_comment(self):
        """Admin can add a comment to ticket"""
        assert test_data["admin_token"], "Admin token required"
        assert test_data["created_ticket_id"], "Ticket ID required"
        
        response = requests.post(
            f"{BASE_URL}/api/tickets/{test_data['created_ticket_id']}/comments",
            headers={"Authorization": f"Bearer {test_data['admin_token']}"},
            json={
                "content": "TEST_Comment: We are looking into this issue. Please provide more details about when this started.",
                "is_internal": False
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["content"].startswith("TEST_Comment")
        assert data["user_role"] == "ADMIN"
        assert data["is_internal"] == False
        test_data["created_comment_id"] = data["id"]
        print("Admin comment added")
    
    def test_admin_add_internal_note(self):
        """Admin can add internal note (hidden from employee)"""
        assert test_data["admin_token"], "Admin token required"
        assert test_data["created_ticket_id"], "Ticket ID required"
        
        response = requests.post(
            f"{BASE_URL}/api/tickets/{test_data['created_ticket_id']}/comments",
            headers={"Authorization": f"Bearer {test_data['admin_token']}"},
            json={
                "content": "TEST_Internal: This user has had similar issues before. Check hardware logs.",
                "is_internal": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_internal"] == True
        print("Internal note added")
    
    def test_employee_add_comment(self):
        """Employee can add a comment to their ticket"""
        assert test_data["employee_token"], "Employee token required"
        assert test_data["created_ticket_id"], "Ticket ID required"
        
        response = requests.post(
            f"{BASE_URL}/api/tickets/{test_data['created_ticket_id']}/comments",
            headers={"Authorization": f"Bearer {test_data['employee_token']}"},
            json={
                "content": "TEST_Comment: The issue started yesterday morning after a power outage.",
                "is_internal": False
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["user_role"] == "EMPLOYEE"
        print("Employee comment added")
    
    def test_employee_cannot_add_internal_note(self):
        """Employee cannot add internal notes"""
        assert test_data["employee_token"], "Employee token required"
        assert test_data["created_ticket_id"], "Ticket ID required"
        
        response = requests.post(
            f"{BASE_URL}/api/tickets/{test_data['created_ticket_id']}/comments",
            headers={"Authorization": f"Bearer {test_data['employee_token']}"},
            json={
                "content": "TEST_Comment: Trying to add internal note",
                "is_internal": True  # Should be ignored for employee
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        # Internal flag should be False for employee
        assert data["is_internal"] == False
        print("Employee internal note correctly converted to regular comment")
    
    def test_get_comments_as_admin(self):
        """Admin can see all comments including internal"""
        assert test_data["admin_token"], "Admin token required"
        assert test_data["created_ticket_id"], "Ticket ID required"
        
        response = requests.get(
            f"{BASE_URL}/api/tickets/{test_data['created_ticket_id']}/comments",
            headers={"Authorization": f"Bearer {test_data['admin_token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Admin should see internal notes
        has_internal = any(c.get("is_internal") for c in data)
        assert has_internal, "Admin should see internal notes"
        print(f"Admin sees {len(data)} comments (including internal)")
    
    def test_get_comments_as_employee(self):
        """Employee cannot see internal comments"""
        assert test_data["employee_token"], "Employee token required"
        assert test_data["created_ticket_id"], "Ticket ID required"
        
        response = requests.get(
            f"{BASE_URL}/api/tickets/{test_data['created_ticket_id']}/comments",
            headers={"Authorization": f"Bearer {test_data['employee_token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Employee should NOT see internal notes
        for comment in data:
            assert comment.get("is_internal") == False, "Employee should not see internal notes"
        print(f"Employee sees {len(data)} comments (no internal)")


class TestAdminTicketStats:
    """Test admin ticket statistics endpoint"""
    
    def test_get_ticket_stats(self):
        """Admin can get ticket statistics"""
        assert test_data["admin_token"], "Admin token required"
        
        response = requests.get(
            f"{BASE_URL}/api/admin/tickets/stats",
            headers={"Authorization": f"Bearer {test_data['admin_token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "by_status" in data
        assert "active_total" in data
        assert "sla_breached" in data
        assert "unassigned" in data
        assert "by_category" in data
        assert "by_priority" in data
        
        # Validate by_status structure
        assert "open" in data["by_status"]
        assert "in_progress" in data["by_status"]
        assert "waiting_on_user" in data["by_status"]
        assert "resolved" in data["by_status"]
        assert "closed" in data["by_status"]
        
        print(f"Stats: Active={data['active_total']}, Unassigned={data['unassigned']}, SLA Breached={data['sla_breached']}")
    
    def test_employee_cannot_access_stats(self):
        """Employee cannot access admin stats"""
        assert test_data["employee_token"], "Employee token required"
        
        response = requests.get(
            f"{BASE_URL}/api/admin/tickets/stats",
            headers={"Authorization": f"Bearer {test_data['employee_token']}"}
        )
        
        assert response.status_code == 403, "Employee should not access admin stats"


class TestTicketResolution:
    """Test ticket resolution flow"""
    
    def test_resolve_ticket(self):
        """Admin can resolve a ticket"""
        assert test_data["admin_token"], "Admin token required"
        assert test_data["created_ticket_id"], "Ticket ID required"
        
        response = requests.put(
            f"{BASE_URL}/api/tickets/{test_data['created_ticket_id']}",
            headers={"Authorization": f"Bearer {test_data['admin_token']}"},
            json={"status": "RESOLVED"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "RESOLVED"
        assert data.get("resolved_at") is not None
        print("Ticket resolved successfully")
    
    def test_close_ticket(self):
        """Admin can close a ticket"""
        assert test_data["admin_token"], "Admin token required"
        assert test_data["created_ticket_id"], "Ticket ID required"
        
        response = requests.put(
            f"{BASE_URL}/api/tickets/{test_data['created_ticket_id']}",
            headers={"Authorization": f"Bearer {test_data['admin_token']}"},
            json={"status": "CLOSED"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "CLOSED"
        print("Ticket closed successfully")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_tickets(self):
        """Delete test tickets created during testing"""
        assert test_data["admin_token"], "Admin token required"
        
        # Get all tickets
        response = requests.get(
            f"{BASE_URL}/api/tickets",
            headers={"Authorization": f"Bearer {test_data['admin_token']}"}
        )
        
        if response.status_code == 200:
            tickets = response.json()
            deleted_count = 0
            
            for ticket in tickets:
                if ticket.get("subject", "").startswith("TEST_"):
                    del_response = requests.delete(
                        f"{BASE_URL}/api/tickets/{ticket['id']}",
                        headers={"Authorization": f"Bearer {test_data['admin_token']}"}
                    )
                    if del_response.status_code == 200:
                        deleted_count += 1
            
            print(f"Cleaned up {deleted_count} test tickets")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
