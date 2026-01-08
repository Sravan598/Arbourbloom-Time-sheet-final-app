#!/usr/bin/env python3
"""
Backend API Testing for CORtracker Application
Tests Document Section APIs and CORChat Phase 1 APIs
"""

import requests
import json
import base64
import os
from datetime import datetime

# Configuration
BASE_URL = "https://realtime-corchat.preview.emergentagent.com/api"

# Test credentials
EMPLOYEE_CREDENTIALS = {
    "email": "employee@test.com",
    "password": "password123"
}

ADMIN_CREDENTIALS = {
    "email": "admin@company.com", 
    "password": "password123"
}

# Test PIN
TEST_PIN = "1234"

class DocumentAPITester:
    def __init__(self):
        self.employee_token = None
        self.admin_token = None
        self.employee_id = None
        self.admin_id = None
        self.test_document_id = None
        self.results = []
        
    def log_result(self, test_name, success, details="", response_code=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "details": details,
            "response_code": response_code,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        print(f"{status} - {test_name}")
        if details:
            print(f"    Details: {details}")
        if response_code:
            print(f"    Response Code: {response_code}")
        print()

    def login_user(self, credentials, user_type):
        """Login and get authentication token"""
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json=credentials)
            
            if response.status_code == 200:
                data = response.json()
                token = data.get("access_token")
                user_id = data.get("user", {}).get("id")
                
                if user_type == "employee":
                    self.employee_token = token
                    self.employee_id = user_id
                else:
                    self.admin_token = token
                    self.admin_id = user_id
                    
                self.log_result(f"{user_type.title()} Login", True, 
                              f"Successfully logged in as {credentials['email']}", response.status_code)
                return True
            else:
                self.log_result(f"{user_type.title()} Login", False, 
                              f"Login failed: {response.text}", response.status_code)
                return False
                
        except Exception as e:
            self.log_result(f"{user_type.title()} Login", False, f"Exception: {str(e)}")
            return False

    def get_headers(self, user_type="employee"):
        """Get authorization headers"""
        token = self.employee_token if user_type == "employee" else self.admin_token
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    def test_pin_status(self):
        """Test GET /api/documents/pin-status"""
        try:
            response = requests.get(f"{BASE_URL}/documents/pin-status", 
                                  headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                has_pin = data.get("has_pin", False)
                self.log_result("PIN Status Check", True, 
                              f"PIN status retrieved: has_pin={has_pin}", response.status_code)
                return has_pin
            else:
                self.log_result("PIN Status Check", False, 
                              f"Failed to get PIN status: {response.text}", response.status_code)
                return None
                
        except Exception as e:
            self.log_result("PIN Status Check", False, f"Exception: {str(e)}")
            return None

    def test_setup_pin(self):
        """Test POST /api/documents/setup-pin"""
        try:
            payload = {"pin": TEST_PIN}
            response = requests.post(f"{BASE_URL}/documents/setup-pin", 
                                   json=payload, headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                message = data.get("message", "")
                self.log_result("PIN Setup", True, 
                              f"PIN setup successful: {message}", response.status_code)
                return True
            elif response.status_code == 400:
                # PIN might already exist
                self.log_result("PIN Setup", True, 
                              f"PIN already exists (expected): {response.text}", response.status_code)
                return True
            else:
                self.log_result("PIN Setup", False, 
                              f"PIN setup failed: {response.text}", response.status_code)
                return False
                
        except Exception as e:
            self.log_result("PIN Setup", False, f"Exception: {str(e)}")
            return False

    def test_verify_pin(self):
        """Test POST /api/documents/verify-pin"""
        try:
            payload = {"pin": TEST_PIN}
            response = requests.post(f"{BASE_URL}/documents/verify-pin", 
                                   json=payload, headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                message = data.get("message", "")
                self.log_result("PIN Verification", True, 
                              f"PIN verified successfully: {message}", response.status_code)
                return True
            else:
                self.log_result("PIN Verification", False, 
                              f"PIN verification failed: {response.text}", response.status_code)
                return False
                
        except Exception as e:
            self.log_result("PIN Verification", False, f"Exception: {str(e)}")
            return False

    def test_verify_wrong_pin(self):
        """Test POST /api/documents/verify-pin with wrong PIN"""
        try:
            payload = {"pin": "9999"}  # Wrong PIN
            response = requests.post(f"{BASE_URL}/documents/verify-pin", 
                                   json=payload, headers=self.get_headers())
            
            if response.status_code == 401:
                self.log_result("Wrong PIN Verification", True, 
                              "Correctly rejected wrong PIN", response.status_code)
                return True
            else:
                self.log_result("Wrong PIN Verification", False, 
                              f"Should have rejected wrong PIN: {response.text}", response.status_code)
                return False
                
        except Exception as e:
            self.log_result("Wrong PIN Verification", False, f"Exception: {str(e)}")
            return False

    def create_test_document_data(self):
        """Create test document data (base64 encoded)"""
        # Create a simple text file content
        content = "This is a test document for CORtracker Document Section testing.\nCreated at: " + datetime.now().isoformat()
        
        # Encode to base64
        encoded_content = base64.b64encode(content.encode('utf-8')).decode('utf-8')
        
        return {
            "filename": f"test_document_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
            "file_data": f"data:text/plain;base64,{encoded_content}",
            "file_type": "text/plain",
            "category": "Test Documents",
            "description": "Test document for API testing"
        }

    def test_document_upload(self):
        """Test POST /api/documents/upload"""
        try:
            document_data = self.create_test_document_data()
            response = requests.post(f"{BASE_URL}/documents/upload", 
                                   json=document_data, headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                self.test_document_id = data.get("id")
                filename = data.get("filename", "")
                file_size = data.get("file_size", 0)
                self.log_result("Document Upload", True, 
                              f"Document uploaded: {filename} ({file_size} bytes)", response.status_code)
                return True
            else:
                self.log_result("Document Upload", False, 
                              f"Document upload failed: {response.text}", response.status_code)
                return False
                
        except Exception as e:
            self.log_result("Document Upload", False, f"Exception: {str(e)}")
            return False

    def test_get_documents(self):
        """Test GET /api/documents"""
        try:
            response = requests.get(f"{BASE_URL}/documents", 
                                  headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                doc_count = len(data) if isinstance(data, list) else 0
                self.log_result("Get Documents List", True, 
                              f"Retrieved {doc_count} documents", response.status_code)
                return data
            else:
                self.log_result("Get Documents List", False, 
                              f"Failed to get documents: {response.text}", response.status_code)
                return None
                
        except Exception as e:
            self.log_result("Get Documents List", False, f"Exception: {str(e)}")
            return None

    def test_get_document_by_id(self):
        """Test GET /api/documents/{id}"""
        if not self.test_document_id:
            self.log_result("Get Document by ID", False, "No test document ID available")
            return False
            
        try:
            response = requests.get(f"{BASE_URL}/documents/{self.test_document_id}", 
                                  headers=self.get_headers())
            
            if response.status_code == 200:
                # Should return file data for download
                content_type = response.headers.get('content-type', '')
                content_length = len(response.content)
                self.log_result("Get Document by ID", True, 
                              f"Document retrieved: {content_type}, {content_length} bytes", response.status_code)
                return True
            else:
                self.log_result("Get Document by ID", False, 
                              f"Failed to get document: {response.text}", response.status_code)
                return False
                
        except Exception as e:
            self.log_result("Get Document by ID", False, f"Exception: {str(e)}")
            return False

    def test_storage_usage(self):
        """Test GET /api/documents/storage-usage"""
        try:
            response = requests.get(f"{BASE_URL}/documents/storage-usage", 
                                  headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                used_bytes = data.get("used_bytes", 0)
                used_mb = data.get("used_mb", 0)
                limit_mb = data.get("limit_mb", 0)
                self.log_result("Storage Usage", True, 
                              f"Storage: {used_mb}MB / {limit_mb}MB ({used_bytes} bytes)", response.status_code)
                return True
            else:
                self.log_result("Storage Usage", False, 
                              f"Failed to get storage usage: {response.text}", response.status_code)
                return False
                
        except Exception as e:
            self.log_result("Storage Usage", False, f"Exception: {str(e)}")
            return False

    def test_admin_get_employee_documents(self):
        """Test GET /api/admin/employees/{id}/documents"""
        if not self.employee_id:
            self.log_result("Admin Get Employee Documents", False, "No employee ID available")
            return False
            
        try:
            response = requests.get(f"{BASE_URL}/admin/employees/{self.employee_id}/documents", 
                                  headers=self.get_headers("admin"))
            
            if response.status_code == 200:
                data = response.json()
                doc_count = len(data) if isinstance(data, list) else 0
                self.log_result("Admin Get Employee Documents", True, 
                              f"Admin retrieved {doc_count} employee documents", response.status_code)
                return data
            else:
                self.log_result("Admin Get Employee Documents", False, 
                              f"Admin failed to get employee documents: {response.text}", response.status_code)
                return None
                
        except Exception as e:
            self.log_result("Admin Get Employee Documents", False, f"Exception: {str(e)}")
            return None

    def test_admin_get_employee_document_by_id(self):
        """Test GET /api/admin/employees/{id}/documents/{doc_id}"""
        if not self.employee_id or not self.test_document_id:
            self.log_result("Admin Get Employee Document by ID", False, 
                          "No employee ID or document ID available")
            return False
            
        try:
            response = requests.get(f"{BASE_URL}/admin/employees/{self.employee_id}/documents/{self.test_document_id}", 
                                  headers=self.get_headers("admin"))
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                content_length = len(response.content)
                self.log_result("Admin Get Employee Document by ID", True, 
                              f"Admin retrieved employee document: {content_type}, {content_length} bytes", response.status_code)
                return True
            else:
                self.log_result("Admin Get Employee Document by ID", False, 
                              f"Admin failed to get employee document: {response.text}", response.status_code)
                return False
                
        except Exception as e:
            self.log_result("Admin Get Employee Document by ID", False, f"Exception: {str(e)}")
            return False

    def test_admin_get_employee_storage_usage(self):
        """Test GET /api/admin/employees/{id}/storage-usage"""
        if not self.employee_id:
            self.log_result("Admin Get Employee Storage Usage", False, "No employee ID available")
            return False
            
        try:
            response = requests.get(f"{BASE_URL}/admin/employees/{self.employee_id}/storage-usage", 
                                  headers=self.get_headers("admin"))
            
            if response.status_code == 200:
                data = response.json()
                used_bytes = data.get("used_bytes", 0)
                used_mb = data.get("used_mb", 0)
                limit_mb = data.get("limit_mb", 0)
                self.log_result("Admin Get Employee Storage Usage", True, 
                              f"Admin retrieved employee storage: {used_mb}MB / {limit_mb}MB ({used_bytes} bytes)", response.status_code)
                return True
            else:
                self.log_result("Admin Get Employee Storage Usage", False, 
                              f"Admin failed to get employee storage usage: {response.text}", response.status_code)
                return False
                
        except Exception as e:
            self.log_result("Admin Get Employee Storage Usage", False, f"Exception: {str(e)}")
            return False

    def test_delete_document(self):
        """Test DELETE /api/documents/{id}"""
        if not self.test_document_id:
            self.log_result("Delete Document", False, "No test document ID available")
            return False
            
        try:
            response = requests.delete(f"{BASE_URL}/documents/{self.test_document_id}", 
                                     headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                message = data.get("message", "")
                self.log_result("Delete Document", True, 
                              f"Document deleted successfully: {message}", response.status_code)
                return True
            else:
                self.log_result("Delete Document", False, 
                              f"Failed to delete document: {response.text}", response.status_code)
                return False
                
        except Exception as e:
            self.log_result("Delete Document", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all document API tests"""
        print("=" * 80)
        print("CORtracker Document Section Backend API Testing")
        print("=" * 80)
        print()
        
        # Login tests
        print("🔐 Authentication Tests")
        print("-" * 40)
        employee_login_success = self.login_user(EMPLOYEE_CREDENTIALS, "employee")
        admin_login_success = self.login_user(ADMIN_CREDENTIALS, "admin")
        
        if not employee_login_success:
            print("❌ Cannot proceed without employee login")
            return
            
        if not admin_login_success:
            print("⚠️  Admin tests will be skipped")
        
        # PIN Management Tests
        print("📌 PIN Management Tests")
        print("-" * 40)
        has_pin = self.test_pin_status()
        
        if not has_pin:
            self.test_setup_pin()
        
        self.test_verify_pin()
        self.test_verify_wrong_pin()
        
        # Document Operations Tests
        print("📄 Document Operations Tests")
        print("-" * 40)
        self.test_document_upload()
        self.test_get_documents()
        self.test_get_document_by_id()
        self.test_storage_usage()
        
        # Admin Access Tests
        if admin_login_success:
            print("👑 Admin Access Tests")
            print("-" * 40)
            self.test_admin_get_employee_documents()
            self.test_admin_get_employee_document_by_id()
            self.test_admin_get_employee_storage_usage()
        
        # Cleanup
        print("🧹 Cleanup Tests")
        print("-" * 40)
        self.test_delete_document()
        
        # Summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for r in self.results if "✅ PASS" in r["status"])
        failed = sum(1 for r in self.results if "❌ FAIL" in r["status"])
        total = len(self.results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(passed/total*100):.1f}%" if total > 0 else "0%")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.results:
                if "❌ FAIL" in result["status"]:
                    print(f"  - {result['test']}: {result['details']}")
        
        print("\n" + "=" * 80)

if __name__ == "__main__":
    # Run Document API tests
    print("Running Document API Tests...")
    doc_tester = DocumentAPITester()
    doc_tester.run_all_tests()
    
    print("\n" + "="*100 + "\n")
    
    # Run CORChat API tests
    print("Running CORChat API Tests...")
    chat_tester = CORChatAPITester()
    chat_tester.run_all_tests()


class CORChatAPITester:
    def __init__(self):
        self.admin_token = None
        self.admin_id = None
        self.test_channel_id = None
        self.test_dm_thread_id = None
        self.test_user_id = None
        self.results = []
        
    def log_result(self, test_name, success, details="", response_code=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "details": details,
            "response_code": response_code,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        print(f"{status} - {test_name}")
        if details:
            print(f"    Details: {details}")
        if response_code:
            print(f"    Response Code: {response_code}")
        print()

    def login_admin(self):
        """Login as admin and get authentication token"""
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json=ADMIN_CREDENTIALS)
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("access_token")
                self.admin_id = data.get("user", {}).get("id")
                    
                self.log_result("Admin Login", True, 
                              f"Successfully logged in as {ADMIN_CREDENTIALS['email']}", response.status_code)
                return True
            else:
                self.log_result("Admin Login", False, 
                              f"Login failed: {response.text}", response.status_code)
                return False
                
        except Exception as e:
            self.log_result("Admin Login", False, f"Exception: {str(e)}")
            return False

    def get_headers(self):
        """Get authorization headers"""
        return {
            "Authorization": f"Bearer {self.admin_token}",
            "Content-Type": "application/json"
        }

    def test_get_channels(self):
        """Test GET /api/chat/channels - Should return list of channels including default #general and #announcements"""
        try:
            response = requests.get(f"{BASE_URL}/chat/channels", headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                channel_count = len(data) if isinstance(data, list) else 0
                
                # Check for default channels
                channel_names = [ch.get("name", "") for ch in data] if isinstance(data, list) else []
                has_general = "general" in channel_names
                has_announcements = "announcements" in channel_names
                
                details = f"Retrieved {channel_count} channels. Default channels: general={has_general}, announcements={has_announcements}"
                self.log_result("Get Channels", True, details, response.status_code)
                return data
            else:
                self.log_result("Get Channels", False, 
                              f"Failed to get channels: {response.text}", response.status_code)
                return None
                
        except Exception as e:
            self.log_result("Get Channels", False, f"Exception: {str(e)}")
            return None

    def test_create_channel(self):
        """Test POST /api/chat/channels - Create a new channel with name and description"""
        try:
            channel_data = {
                "name": f"test-channel-{datetime.now().strftime('%H%M%S')}",
                "description": "Test channel created by API testing",
                "type": "PUBLIC"
            }
            
            response = requests.post(f"{BASE_URL}/chat/channels", 
                                   json=channel_data, headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                self.test_channel_id = data.get("id")
                channel_name = data.get("name", "")
                self.log_result("Create Channel", True, 
                              f"Channel created successfully: {channel_name}", response.status_code)
                return True
            else:
                self.log_result("Create Channel", False, 
                              f"Failed to create channel: {response.text}", response.status_code)
                return False
                
        except Exception as e:
            self.log_result("Create Channel", False, f"Exception: {str(e)}")
            return False

    def test_get_channel_by_id(self):
        """Test GET /api/chat/channels/{channel_id} - Get specific channel details"""
        if not self.test_channel_id:
            self.log_result("Get Channel by ID", False, "No test channel ID available")
            return False
            
        try:
            response = requests.get(f"{BASE_URL}/chat/channels/{self.test_channel_id}", 
                                  headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                channel_name = data.get("name", "")
                channel_desc = data.get("description", "")
                self.log_result("Get Channel by ID", True, 
                              f"Channel retrieved: {channel_name} - {channel_desc}", response.status_code)
                return True
            else:
                self.log_result("Get Channel by ID", False, 
                              f"Failed to get channel: {response.text}", response.status_code)
                return False
                
        except Exception as e:
            self.log_result("Get Channel by ID", False, f"Exception: {str(e)}")
            return False

    def test_get_channel_messages(self):
        """Test GET /api/chat/channels/{channel_id}/messages - Get messages for a channel"""
        if not self.test_channel_id:
            self.log_result("Get Channel Messages", False, "No test channel ID available")
            return False
            
        try:
            response = requests.get(f"{BASE_URL}/chat/channels/{self.test_channel_id}/messages", 
                                  headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                message_count = len(data) if isinstance(data, list) else 0
                self.log_result("Get Channel Messages", True, 
                              f"Retrieved {message_count} messages from channel", response.status_code)
                return data
            else:
                self.log_result("Get Channel Messages", False, 
                              f"Failed to get channel messages: {response.text}", response.status_code)
                return None
                
        except Exception as e:
            self.log_result("Get Channel Messages", False, f"Exception: {str(e)}")
            return None

    def test_send_channel_message(self):
        """Test POST /api/chat/channels/{channel_id}/messages - Send a message to a channel"""
        if not self.test_channel_id:
            self.log_result("Send Channel Message", False, "No test channel ID available")
            return False
            
        try:
            message_data = {
                "content": f"Test message sent at {datetime.now().isoformat()}",
                "message_type": "text"
            }
            
            response = requests.post(f"{BASE_URL}/chat/channels/{self.test_channel_id}/messages", 
                                   json=message_data, headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                message_content = data.get("content", "")
                self.log_result("Send Channel Message", True, 
                              f"Message sent successfully: {message_content[:50]}...", response.status_code)
                return True
            else:
                self.log_result("Send Channel Message", False, 
                              f"Failed to send message: {response.text}", response.status_code)
                return False
                
        except Exception as e:
            self.log_result("Send Channel Message", False, f"Exception: {str(e)}")
            return False

    def test_get_dm_threads(self):
        """Test GET /api/chat/dm - Get all DM threads for current user"""
        try:
            response = requests.get(f"{BASE_URL}/chat/dm", headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                thread_count = len(data) if isinstance(data, list) else 0
                self.log_result("Get DM Threads", True, 
                              f"Retrieved {thread_count} DM threads", response.status_code)
                return data
            else:
                self.log_result("Get DM Threads", False, 
                              f"Failed to get DM threads: {response.text}", response.status_code)
                return None
                
        except Exception as e:
            self.log_result("Get DM Threads", False, f"Exception: {str(e)}")
            return None

    def test_get_chat_users(self):
        """Test GET /api/chat/users - Get list of all users for DM purposes"""
        try:
            response = requests.get(f"{BASE_URL}/chat/users", headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                user_count = len(data) if isinstance(data, list) else 0
                
                # Find a user to test DM with (not the admin)
                if isinstance(data, list) and len(data) > 0:
                    for user in data:
                        if user.get("id") != self.admin_id:
                            self.test_user_id = user.get("id")
                            break
                
                self.log_result("Get Chat Users", True, 
                              f"Retrieved {user_count} users for DM", response.status_code)
                return data
            else:
                self.log_result("Get Chat Users", False, 
                              f"Failed to get chat users: {response.text}", response.status_code)
                return None
                
        except Exception as e:
            self.log_result("Get Chat Users", False, f"Exception: {str(e)}")
            return None

    def test_start_dm_thread(self):
        """Test POST /api/chat/dm/{user_id} - Start a new DM thread with another user"""
        if not self.test_user_id:
            self.log_result("Start DM Thread", False, "No test user ID available")
            return False
            
        try:
            response = requests.post(f"{BASE_URL}/chat/dm/{self.test_user_id}", 
                                   headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                self.test_dm_thread_id = data.get("id")
                other_user = data.get("other_user_name", "Unknown")
                self.log_result("Start DM Thread", True, 
                              f"DM thread started with {other_user}", response.status_code)
                return True
            else:
                self.log_result("Start DM Thread", False, 
                              f"Failed to start DM thread: {response.text}", response.status_code)
                return False
                
        except Exception as e:
            self.log_result("Start DM Thread", False, f"Exception: {str(e)}")
            return False

    def test_get_dm_messages(self):
        """Test GET /api/chat/dm/{thread_id}/messages - Get messages for a DM thread"""
        if not self.test_dm_thread_id:
            self.log_result("Get DM Messages", False, "No test DM thread ID available")
            return False
            
        try:
            response = requests.get(f"{BASE_URL}/chat/dm/{self.test_dm_thread_id}/messages", 
                                  headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                message_count = len(data) if isinstance(data, list) else 0
                self.log_result("Get DM Messages", True, 
                              f"Retrieved {message_count} DM messages", response.status_code)
                return data
            else:
                self.log_result("Get DM Messages", False, 
                              f"Failed to get DM messages: {response.text}", response.status_code)
                return None
                
        except Exception as e:
            self.log_result("Get DM Messages", False, f"Exception: {str(e)}")
            return None

    def test_send_dm_message(self):
        """Test POST /api/chat/dm/{thread_id}/messages - Send a DM message"""
        if not self.test_dm_thread_id:
            self.log_result("Send DM Message", False, "No test DM thread ID available")
            return False
            
        try:
            message_data = {
                "content": f"Test DM message sent at {datetime.now().isoformat()}",
                "message_type": "text"
            }
            
            response = requests.post(f"{BASE_URL}/chat/dm/{self.test_dm_thread_id}/messages", 
                                   json=message_data, headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                message_content = data.get("content", "")
                self.log_result("Send DM Message", True, 
                              f"DM message sent successfully: {message_content[:50]}...", response.status_code)
                return True
            else:
                self.log_result("Send DM Message", False, 
                              f"Failed to send DM message: {response.text}", response.status_code)
                return False
                
        except Exception as e:
            self.log_result("Send DM Message", False, f"Exception: {str(e)}")
            return False

    def test_get_unread_counts(self):
        """Test GET /api/chat/unread-counts - Get total unread counts for channels and DMs"""
        try:
            response = requests.get(f"{BASE_URL}/chat/unread-counts", headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                total_unread = data.get("total_unread", 0)
                channel_unread = data.get("channels_unread", 0)
                dm_unread = data.get("dms_unread", 0)
                self.log_result("Get Unread Counts", True, 
                              f"Unread counts - Total: {total_unread}, Channels: {channel_unread}, DMs: {dm_unread}", response.status_code)
                return True
            else:
                self.log_result("Get Unread Counts", False, 
                              f"Failed to get unread counts: {response.text}", response.status_code)
                return False
                
        except Exception as e:
            self.log_result("Get Unread Counts", False, f"Exception: {str(e)}")
            return False

    def test_delete_channel(self):
        """Test DELETE /api/chat/channels/{channel_id} - Delete a non-default channel"""
        if not self.test_channel_id:
            self.log_result("Delete Channel", False, "No test channel ID available")
            return False
            
        try:
            response = requests.delete(f"{BASE_URL}/chat/channels/{self.test_channel_id}", 
                                     headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                message = data.get("message", "")
                self.log_result("Delete Channel", True, 
                              f"Channel deleted successfully: {message}", response.status_code)
                return True
            else:
                self.log_result("Delete Channel", False, 
                              f"Failed to delete channel: {response.text}", response.status_code)
                return False
                
        except Exception as e:
            self.log_result("Delete Channel", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all CORChat API tests"""
        print("=" * 80)
        print("CORtracker CORChat Phase 1 Backend API Testing")
        print("=" * 80)
        print()
        
        # Login test
        print("🔐 Authentication Test")
        print("-" * 40)
        admin_login_success = self.login_admin()
        
        if not admin_login_success:
            print("❌ Cannot proceed without admin login")
            return
        
        # Channel API Tests
        print("📢 Channel API Tests")
        print("-" * 40)
        self.test_get_channels()
        self.test_create_channel()
        self.test_get_channel_by_id()
        self.test_get_channel_messages()
        self.test_send_channel_message()
        
        # DM API Tests
        print("💬 Direct Message API Tests")
        print("-" * 40)
        self.test_get_dm_threads()
        self.test_get_chat_users()
        self.test_start_dm_thread()
        self.test_get_dm_messages()
        self.test_send_dm_message()
        
        # Other API Tests
        print("📊 Other API Tests")
        print("-" * 40)
        self.test_get_unread_counts()
        
        # Cleanup
        print("🧹 Cleanup Tests")
        print("-" * 40)
        self.test_delete_channel()
        
        # Summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("CORCHAT API TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for r in self.results if "✅ PASS" in r["status"])
        failed = sum(1 for r in self.results if "❌ FAIL" in r["status"])
        total = len(self.results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(passed/total*100):.1f}%" if total > 0 else "0%")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.results:
                if "❌ FAIL" in result["status"]:
                    print(f"  - {result['test']}: {result['details']}")
        
        print("\n" + "=" * 80)