"""
Test suite for ticket comment attachments feature
Tests both admin and employee ability to add comments with file attachments
"""
import pytest
import requests
import os
import tempfile
from pathlib import Path

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://modular-refactor-25.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@company.com"
ADMIN_PASSWORD = "password123"
EMPLOYEE_EMAIL = "employee@test.com"
EMPLOYEE_PASSWORD = "password123"


@pytest.fixture(scope="module")
def session():
    """Shared requests session"""
    return requests.Session()


@pytest.fixture(scope="module")
def admin_token(session):
    """Get admin authentication token"""
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def employee_token(session):
    """Get employee authentication token"""
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": EMPLOYEE_EMAIL,
        "password": EMPLOYEE_PASSWORD
    })
    assert response.status_code == 200, f"Employee login failed: {response.text}"
    return response.json()["access_token"]


def get_existing_ticket(session, token):
    """Get an existing ticket for testing"""
    response = session.get(
        f"{BASE_URL}/api/tickets",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200, f"Failed to get tickets: {response.text}"
    tickets = response.json()
    if tickets:
        return tickets[0]["id"]
    return None


def create_test_ticket(session, token):
    """Create a test ticket for comment testing"""
    response = session.post(
        f"{BASE_URL}/api/tickets",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "subject": "TEST_Attachment Test Ticket",
            "description": "This ticket is for testing comment attachments",
            "category": "IT_SUPPORT",
            "priority": "MEDIUM"
        }
    )
    assert response.status_code == 200, f"Failed to create ticket: {response.text}"
    return response.json()["id"]


# ============== ADMIN TESTS ==============

class TestAdminLogin:
    """Admin authentication tests"""
    
    def test_admin_login(self, session):
        """Test admin can login successfully"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "ADMIN"


class TestAdminTickets:
    """Admin ticket management tests"""
    
    def test_admin_get_tickets(self, session, admin_token):
        """Test admin can get ticket list"""
        response = session.get(
            f"{BASE_URL}/api/tickets",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        tickets = response.json()
        assert isinstance(tickets, list)
    
    def test_admin_add_comment_without_attachment(self, session, admin_token):
        """Test admin can add a comment without attachments"""
        ticket_id = get_existing_ticket(session, admin_token)
        if not ticket_id:
            ticket_id = create_test_ticket(session, admin_token)
        
        response = session.post(
            f"{BASE_URL}/api/tickets/{ticket_id}/comments",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "content": "TEST_Admin comment without attachment",
                "is_internal": False
            }
        )
        assert response.status_code == 200, f"Failed to add comment: {response.text}"
        comment = response.json()
        assert comment["content"] == "TEST_Admin comment without attachment"
        assert comment["user_role"] == "ADMIN"
    
    def test_admin_add_comment_with_attachment(self, session, admin_token):
        """Test admin can add a comment with file attachment"""
        ticket_id = get_existing_ticket(session, admin_token)
        if not ticket_id:
            ticket_id = create_test_ticket(session, admin_token)
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("This is a test attachment from admin")
            test_file_path = f.name
        
        try:
            with open(test_file_path, 'rb') as f:
                response = session.post(
                    f"{BASE_URL}/api/tickets/{ticket_id}/comments-with-attachments",
                    headers={"Authorization": f"Bearer {admin_token}"},
                    data={
                        "content": "TEST_Admin comment with attachment",
                        "is_internal": "false"
                    },
                    files=[("files", ("test_admin_file.txt", f, "text/plain"))]
                )
            
            assert response.status_code == 200, f"Failed to add comment with attachment: {response.text}"
            comment = response.json()
            assert comment["content"] == "TEST_Admin comment with attachment"
            assert len(comment.get("attachments", [])) > 0, "Attachment not saved"
            assert comment["attachments"][0]["original_filename"] == "test_admin_file.txt"
        finally:
            os.unlink(test_file_path)
    
    def test_admin_add_internal_note_with_attachment(self, session, admin_token):
        """Test admin can add an internal note with attachment"""
        ticket_id = get_existing_ticket(session, admin_token)
        if not ticket_id:
            ticket_id = create_test_ticket(session, admin_token)
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("This is an internal note attachment")
            test_file_path = f.name
        
        try:
            with open(test_file_path, 'rb') as f:
                response = session.post(
                    f"{BASE_URL}/api/tickets/{ticket_id}/comments-with-attachments",
                    headers={"Authorization": f"Bearer {admin_token}"},
                    data={
                        "content": "TEST_Internal note with attachment",
                        "is_internal": "true"
                    },
                    files=[("files", ("internal_note.txt", f, "text/plain"))]
                )
            
            assert response.status_code == 200, f"Failed to add internal note: {response.text}"
            comment = response.json()
            assert comment["is_internal"] == True
            assert len(comment.get("attachments", [])) > 0
        finally:
            os.unlink(test_file_path)
    
    def test_admin_verify_attachments_in_comments(self, session, admin_token):
        """Test that attachments are visible in comment list"""
        ticket_id = get_existing_ticket(session, admin_token)
        if not ticket_id:
            ticket_id = create_test_ticket(session, admin_token)
        
        response = session.get(
            f"{BASE_URL}/api/tickets/{ticket_id}/comments",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get comments: {response.text}"
        comments = response.json()
        assert isinstance(comments, list)


# ============== EMPLOYEE TESTS ==============

class TestEmployeeLogin:
    """Employee authentication tests"""
    
    def test_employee_login(self, session):
        """Test employee can login successfully"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "EMPLOYEE"


class TestEmployeeTickets:
    """Employee ticket management tests"""
    
    def test_employee_get_tickets(self, session, employee_token):
        """Test employee can get their ticket list"""
        response = session.get(
            f"{BASE_URL}/api/tickets",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert response.status_code == 200
        tickets = response.json()
        assert isinstance(tickets, list)
    
    def test_employee_create_ticket(self, session, employee_token):
        """Test employee can create a ticket"""
        response = session.post(
            f"{BASE_URL}/api/tickets",
            headers={
                "Authorization": f"Bearer {employee_token}",
                "Content-Type": "application/json"
            },
            json={
                "subject": "TEST_Employee Attachment Test",
                "description": "Testing employee comment attachments",
                "category": "IT_SUPPORT",
                "priority": "MEDIUM"
            }
        )
        assert response.status_code == 200, f"Failed to create ticket: {response.text}"
        ticket = response.json()
        assert "id" in ticket
        assert "ticket_number" in ticket
    
    def test_employee_add_comment_without_attachment(self, session, employee_token):
        """Test employee can add a comment without attachments"""
        ticket_id = get_existing_ticket(session, employee_token)
        if not ticket_id:
            ticket_id = create_test_ticket(session, employee_token)
        
        response = session.post(
            f"{BASE_URL}/api/tickets/{ticket_id}/comments",
            headers={
                "Authorization": f"Bearer {employee_token}",
                "Content-Type": "application/json"
            },
            json={
                "content": "TEST_Employee comment without attachment"
            }
        )
        assert response.status_code == 200, f"Failed to add comment: {response.text}"
        comment = response.json()
        assert comment["content"] == "TEST_Employee comment without attachment"
        assert comment["user_role"] == "EMPLOYEE"
    
    def test_employee_add_comment_with_attachment(self, session, employee_token):
        """Test employee can add a comment with file attachment"""
        ticket_id = get_existing_ticket(session, employee_token)
        if not ticket_id:
            ticket_id = create_test_ticket(session, employee_token)
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("This is a test attachment from employee")
            test_file_path = f.name
        
        try:
            with open(test_file_path, 'rb') as f:
                response = session.post(
                    f"{BASE_URL}/api/tickets/{ticket_id}/comments-with-attachments",
                    headers={"Authorization": f"Bearer {employee_token}"},
                    data={
                        "content": "TEST_Employee comment with attachment",
                        "is_internal": "false"
                    },
                    files=[("files", ("employee_screenshot.txt", f, "text/plain"))]
                )
            
            assert response.status_code == 200, f"Failed to add comment with attachment: {response.text}"
            comment = response.json()
            assert comment["content"] == "TEST_Employee comment with attachment"
            assert len(comment.get("attachments", [])) > 0, "Attachment not saved"
            assert comment["attachments"][0]["original_filename"] == "employee_screenshot.txt"
        finally:
            os.unlink(test_file_path)
    
    def test_employee_add_multiple_attachments(self, session, employee_token):
        """Test employee can add multiple attachments in one comment"""
        ticket_id = get_existing_ticket(session, employee_token)
        if not ticket_id:
            ticket_id = create_test_ticket(session, employee_token)
        
        test_files = []
        for i in range(2):
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
                f.write(f"Test file {i+1} content")
                test_files.append(f.name)
        
        try:
            files_to_upload = []
            file_handles = []
            for i, path in enumerate(test_files):
                fh = open(path, 'rb')
                file_handles.append(fh)
                files_to_upload.append(("files", (f"file_{i+1}.txt", fh, "text/plain")))
            
            response = session.post(
                f"{BASE_URL}/api/tickets/{ticket_id}/comments-with-attachments",
                headers={"Authorization": f"Bearer {employee_token}"},
                data={
                    "content": "TEST_Comment with multiple attachments",
                    "is_internal": "false"
                },
                files=files_to_upload
            )
            
            for fh in file_handles:
                fh.close()
            
            assert response.status_code == 200, f"Failed to add comment with multiple attachments: {response.text}"
            comment = response.json()
            assert len(comment.get("attachments", [])) == 2, f"Expected 2 attachments, got {len(comment.get('attachments', []))}"
        finally:
            for path in test_files:
                os.unlink(path)
    
    def test_employee_verify_attachments_in_comments(self, session, employee_token):
        """Test that employee can see attachments in comment list"""
        ticket_id = get_existing_ticket(session, employee_token)
        if not ticket_id:
            ticket_id = create_test_ticket(session, employee_token)
        
        response = session.get(
            f"{BASE_URL}/api/tickets/{ticket_id}/comments",
            headers={"Authorization": f"Bearer {employee_token}"}
        )
        assert response.status_code == 200, f"Failed to get comments: {response.text}"
        comments = response.json()
        assert isinstance(comments, list)


# ============== EDGE CASE TESTS ==============

class TestEdgeCases:
    """Edge case tests for attachments"""
    
    def test_attachment_download_endpoint(self, session):
        """Test that attachment download endpoint exists"""
        response = session.get(f"{BASE_URL}/api/tickets/attachments/nonexistent.txt")
        assert response.status_code in [404, 401], f"Unexpected status: {response.status_code}"
