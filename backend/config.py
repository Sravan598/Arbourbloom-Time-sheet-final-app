"""
Application Configuration
Centralized configuration management for the HRMS application
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Database
MONGO_URL = os.environ.get('MONGO_URL') or 'mongodb://localhost:27017'
DB_NAME = os.environ.get('DB_NAME') or 'test_database'

# JWT
JWT_SECRET = os.environ.get('JWT_SECRET', 'aurborbloom-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24
JWT_EXPIRATION_HOURS = JWT_EXPIRY_HOURS  # Alias for backward compatibility

# Default Tenant
DEFAULT_TENANT_SLUG = "aurborbloom"

# Admin Signup Codes
ADMIN_SIGNUP_CODE = os.environ.get('ADMIN_SIGNUP_CODE', 'ARBORBLOOM-ADMIN-2025')
DEFAULT_SUPER_ADMIN_CODE = os.environ.get('SUPER_ADMIN_CODE', 'AURBORBLOOM-SUPER-2025')

# Encryption
ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY')
if not ENCRYPTION_KEY:
    import logging
    logging.warning("⚠️ ENCRYPTION_KEY not set in environment. Using fallback key - NOT SECURE FOR PRODUCTION!")
    ENCRYPTION_KEY = 'aurborbloom-fallback-key-32chars!'

# Rate Limiting
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 500  # requests per window per tenant

# File Upload
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB per file
MAX_COMMENT_UPLOAD_SIZE = 50 * 1024 * 1024  # 50MB total per comment
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/webm"}
ALLOWED_DOC_TYPES = {
    "application/pdf", 
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain", 
    "text/csv"
}
ALLOWED_FILE_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_DOC_TYPES | ALLOWED_VIDEO_TYPES

# Upload directories
UPLOAD_DIR = Path("/app/uploads/chat")
TICKET_UPLOAD_DIR = Path("/app/uploads/tickets")

# Emergent LLM Key (for AI Chatbot)
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# CORS Origins
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*')

# PDF Logo path
LOGO_PATH = ROOT_DIR / "assets" / "aurborbloom_logo.png"
