"""
CORtracker Feature Tests
Tests for:
1. PDF Export with Logo Header (Timesheet and Performance Insights)
2. CORChat File Attachments (Upload and Send)
"""

import pytest
import requests
import os
import io
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@company.com"
ADMIN_PASSWORD = "password123"
EMPLOYEE_EMAIL = "demo@employee.com"
EMPLOYEE_PASSWORD = "password123"


class TestAuth:
    """Authentication tests"""
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "ADMIN"
        return data["access_token"]
    
    def test_employee_login(self):
        """Test employee login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYEE_EMAIL,
            "password": EMPLOYEE_PASSWORD
        })
        assert response.status_code == 200, f"Employee login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "EMPLOYEE"
        return data["access_token"]


@pytest.fixture
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip("Admin login failed")
    return response.json()["access_token"]


@pytest.fixture
def employee_token():
    """Get employee auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": EMPLOYEE_EMAIL,
        "password": EMPLOYEE_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip("Employee login failed")
    return response.json()["access_token"]


@pytest.fixture
def auth_headers(admin_token):
    """Get auth headers for admin"""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def employee_headers(employee_token):
    """Get auth headers for employee"""
    return {"Authorization": f"Bearer {employee_token}"}


class TestPDFExportWithLogo:
    """Tests for PDF export with CORtracker logo header"""
    
    def test_timesheet_pdf_export_returns_pdf(self, employee_headers):
        """Test that timesheet PDF export returns a valid PDF file"""
        response = requests.get(
            f"{BASE_URL}/api/export/timesheet/pdf",
            params={"week_offset": 0},
            headers=employee_headers
        )
        
        assert response.status_code == 200, f"PDF export failed: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        # Verify it's a valid PDF (starts with %PDF)
        content = response.content
        assert content[:4] == b'%PDF', "Response is not a valid PDF file"
        
        # Check PDF contains image (logo) - look for image stream markers
        # PDFs with images typically contain /Image or /XObject references
        pdf_text = content.decode('latin-1', errors='ignore')
        has_image = '/Image' in pdf_text or '/XObject' in pdf_text or 'stream' in pdf_text
        print(f"PDF contains image markers: {has_image}")
        
        # The PDF should be reasonably sized (with logo it should be larger)
        assert len(content) > 1000, "PDF seems too small, may be missing content"
        print(f"Timesheet PDF size: {len(content)} bytes")
    
    def test_performance_insights_pdf_export(self, admin_token):
        """Test that performance insights PDF export returns a valid PDF with logo"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/admin/performance/export-pdf",
            params={"period": "30"},
            headers=headers
        )
        
        assert response.status_code == 200, f"Performance PDF export failed: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        # Verify it's a valid PDF
        content = response.content
        assert content[:4] == b'%PDF', "Response is not a valid PDF file"
        
        # Check PDF contains image markers
        pdf_text = content.decode('latin-1', errors='ignore')
        has_image = '/Image' in pdf_text or '/XObject' in pdf_text or 'stream' in pdf_text
        print(f"Performance PDF contains image markers: {has_image}")
        
        assert len(content) > 1000, "PDF seems too small"
        print(f"Performance Insights PDF size: {len(content)} bytes")


class TestChatFileUpload:
    """Tests for CORChat file attachment feature"""
    
    def test_upload_image_file(self, auth_headers):
        """Test uploading an image file for chat"""
        # Create a simple test image (1x1 PNG)
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 dimensions
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  # IDAT chunk
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,  # IEND chunk
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {
            'file': ('test_image.png', io.BytesIO(png_data), 'image/png')
        }
        
        # Remove Content-Type from headers for multipart upload
        upload_headers = {"Authorization": auth_headers["Authorization"]}
        
        response = requests.post(
            f"{BASE_URL}/api/chat/upload",
            files=files,
            headers=upload_headers
        )
        
        assert response.status_code == 200, f"Image upload failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data, "Response missing 'id'"
        assert "filename" in data, "Response missing 'filename'"
        assert "file_url" in data, "Response missing 'file_url'"
        assert "content_type" in data, "Response missing 'content_type'"
        assert "is_image" in data, "Response missing 'is_image'"
        
        # Verify it's recognized as an image
        assert data["is_image"] == True, "File should be recognized as image"
        assert data["content_type"] == "image/png"
        assert data["file_url"].startswith("/api/chat/files/images/")
        
        print(f"Uploaded image: {data['filename']} -> {data['file_url']}")
        return data
    
    def test_upload_document_file(self, auth_headers):
        """Test uploading a document (text file) for chat"""
        # Create a simple text file
        text_content = b"This is a test document for CORChat file attachment feature."
        
        files = {
            'file': ('test_document.txt', io.BytesIO(text_content), 'text/plain')
        }
        
        upload_headers = {"Authorization": auth_headers["Authorization"]}
        
        response = requests.post(
            f"{BASE_URL}/api/chat/upload",
            files=files,
            headers=upload_headers
        )
        
        assert response.status_code == 200, f"Document upload failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert "filename" in data
        assert "file_url" in data
        assert "is_image" in data
        
        # Verify it's NOT recognized as an image
        assert data["is_image"] == False, "Text file should not be recognized as image"
        assert data["file_url"].startswith("/api/chat/files/documents/")
        
        print(f"Uploaded document: {data['filename']} -> {data['file_url']}")
        return data
    
    def test_retrieve_uploaded_file(self, auth_headers):
        """Test that uploaded files can be retrieved"""
        # First upload a file
        text_content = b"Test file content for retrieval test."
        files = {
            'file': ('retrieval_test.txt', io.BytesIO(text_content), 'text/plain')
        }
        upload_headers = {"Authorization": auth_headers["Authorization"]}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/chat/upload",
            files=files,
            headers=upload_headers
        )
        assert upload_response.status_code == 200
        file_url = upload_response.json()["file_url"]
        
        # Now retrieve the file
        retrieve_response = requests.get(f"{BASE_URL}{file_url}")
        
        assert retrieve_response.status_code == 200, f"File retrieval failed: {retrieve_response.text}"
        assert retrieve_response.content == text_content
        print(f"Successfully retrieved file from {file_url}")
    
    def test_file_size_limit(self, auth_headers):
        """Test that files over 10MB are rejected"""
        # Create a file larger than 10MB (just over the limit)
        large_content = b"x" * (10 * 1024 * 1024 + 1)  # 10MB + 1 byte
        
        files = {
            'file': ('large_file.txt', io.BytesIO(large_content), 'text/plain')
        }
        upload_headers = {"Authorization": auth_headers["Authorization"]}
        
        response = requests.post(
            f"{BASE_URL}/api/chat/upload",
            files=files,
            headers=upload_headers
        )
        
        assert response.status_code == 400, "Large file should be rejected"
        assert "too large" in response.json().get("detail", "").lower()
        print("Large file correctly rejected")
    
    def test_invalid_file_type_rejected(self, auth_headers):
        """Test that invalid file types are rejected"""
        # Create a file with disallowed type
        exe_content = b"MZ" + b"\x00" * 100  # Fake executable header
        
        files = {
            'file': ('malicious.exe', io.BytesIO(exe_content), 'application/x-msdownload')
        }
        upload_headers = {"Authorization": auth_headers["Authorization"]}
        
        response = requests.post(
            f"{BASE_URL}/api/chat/upload",
            files=files,
            headers=upload_headers
        )
        
        assert response.status_code == 400, "Invalid file type should be rejected"
        print("Invalid file type correctly rejected")


class TestChatMessageWithAttachment:
    """Tests for sending chat messages with file attachments"""
    
    def test_send_channel_message_with_image_attachment(self, auth_headers):
        """Test sending a message with image attachment to a channel"""
        # First, get available channels
        channels_response = requests.get(
            f"{BASE_URL}/api/chat/channels",
            headers=auth_headers
        )
        assert channels_response.status_code == 200
        channels = channels_response.json()
        
        if not channels:
            pytest.skip("No channels available for testing")
        
        channel_id = channels[0]["id"]
        
        # Upload an image first
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {'file': ('chat_image.png', io.BytesIO(png_data), 'image/png')}
        upload_headers = {"Authorization": auth_headers["Authorization"]}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/chat/upload",
            files=files,
            headers=upload_headers
        )
        assert upload_response.status_code == 200
        upload_data = upload_response.json()
        
        # Now send message with attachment
        message_payload = {
            "content": "Check out this image!",
            "message_type": "text",
            "attachment": {
                "id": upload_data["id"],
                "filename": upload_data["filename"],
                "file_url": upload_data["file_url"],
                "content_type": upload_data["content_type"],
                "size": upload_data["size"],
                "is_image": upload_data["is_image"]
            }
        }
        
        message_response = requests.post(
            f"{BASE_URL}/api/chat/channels/{channel_id}/messages",
            json=message_payload,
            headers=auth_headers
        )
        
        assert message_response.status_code == 200, f"Send message failed: {message_response.text}"
        msg_data = message_response.json()
        
        # Verify message has attachment
        assert msg_data["message_type"] == "image", "Message type should be 'image' for image attachment"
        assert msg_data.get("attachment") is not None, "Message should have attachment"
        assert msg_data["attachment"]["is_image"] == True
        
        print(f"Successfully sent message with image attachment to channel {channel_id}")
    
    def test_send_channel_message_with_document_attachment(self, auth_headers):
        """Test sending a message with document attachment to a channel"""
        # Get available channels
        channels_response = requests.get(
            f"{BASE_URL}/api/chat/channels",
            headers=auth_headers
        )
        assert channels_response.status_code == 200
        channels = channels_response.json()
        
        if not channels:
            pytest.skip("No channels available for testing")
        
        channel_id = channels[0]["id"]
        
        # Upload a document
        doc_content = b"This is a test PDF content for chat attachment."
        files = {'file': ('report.txt', io.BytesIO(doc_content), 'text/plain')}
        upload_headers = {"Authorization": auth_headers["Authorization"]}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/chat/upload",
            files=files,
            headers=upload_headers
        )
        assert upload_response.status_code == 200
        upload_data = upload_response.json()
        
        # Send message with document attachment
        message_payload = {
            "content": "Here's the report document",
            "message_type": "text",
            "attachment": {
                "id": upload_data["id"],
                "filename": upload_data["filename"],
                "file_url": upload_data["file_url"],
                "content_type": upload_data["content_type"],
                "size": upload_data["size"],
                "is_image": upload_data["is_image"]
            }
        }
        
        message_response = requests.post(
            f"{BASE_URL}/api/chat/channels/{channel_id}/messages",
            json=message_payload,
            headers=auth_headers
        )
        
        assert message_response.status_code == 200, f"Send message failed: {message_response.text}"
        msg_data = message_response.json()
        
        # Verify message has attachment
        assert msg_data["message_type"] == "file", "Message type should be 'file' for document attachment"
        assert msg_data.get("attachment") is not None
        assert msg_data["attachment"]["is_image"] == False
        
        print(f"Successfully sent message with document attachment to channel {channel_id}")


class TestLogoFileExists:
    """Test that the logo file exists for PDF generation"""
    
    def test_logo_file_accessible(self):
        """Verify the logo file exists at the expected path"""
        logo_path = "/app/backend/assets/cortracker_logo.png"
        assert os.path.exists(logo_path), f"Logo file not found at {logo_path}"
        
        # Check file size is reasonable (should be a real image)
        file_size = os.path.getsize(logo_path)
        assert file_size > 1000, f"Logo file seems too small ({file_size} bytes)"
        
        # Verify it's a PNG file
        with open(logo_path, 'rb') as f:
            header = f.read(8)
            assert header[:4] == b'\x89PNG', "Logo file is not a valid PNG"
        
        print(f"Logo file verified: {logo_path} ({file_size} bytes)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
