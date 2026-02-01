"""
Application Configuration
Centralized configuration management for the HRMS application
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Database
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

# JWT
JWT_SECRET = os.environ.get('JWT_SECRET', 'aurborbloom-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

# Default Tenant
DEFAULT_TENANT_SLUG = "aurborbloom"

# Admin Signup Code
ADMIN_SIGNUP_CODE = os.environ.get('ADMIN_SIGNUP_CODE', 'ARBORBLOOM-ADMIN-2025')
DEFAULT_SUPER_ADMIN_CODE = os.environ.get('DEFAULT_SUPER_ADMIN_CODE', 'AURBORBLOOM-SUPER-2025')

# Encryption
ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY')
if not ENCRYPTION_KEY:
    import logging
    logging.warning("⚠️ ENCRYPTION_KEY not set in environment. Using fallback key - NOT SECURE FOR PRODUCTION!")
    ENCRYPTION_KEY = 'aurborbloom-fallback-key-32chars!'

# Rate Limiting
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 100  # requests per window per tenant

# File Upload
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_FILE_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain", "text/csv"
}

# Emergent LLM Key (for AI Chatbot)
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# CORS Origins
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*')
