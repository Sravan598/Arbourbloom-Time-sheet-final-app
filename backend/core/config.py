import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')


class Settings:
    # MongoDB
    MONGO_URL: str = os.environ['MONGO_URL']
    DB_NAME: str = os.environ['DB_NAME']
    
    # JWT
    JWT_SECRET: str = os.environ.get('JWT_SECRET', 'cortracker-secret-key-change-in-production')
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # File Upload
    UPLOAD_DIR: Path = Path("/app/uploads/chat")
    TICKET_UPLOAD_DIR: Path = Path("/app/uploads/tickets")
    MAX_FILE_SIZE: int = 25 * 1024 * 1024  # 25MB per file
    MAX_COMMENT_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB total per comment
    
    # Allowed file types
    ALLOWED_IMAGE_TYPES: set = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    ALLOWED_VIDEO_TYPES: set = {"video/mp4", "video/quicktime", "video/webm"}
    ALLOWED_DOC_TYPES: set = {
        "application/pdf", "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain", "text/csv"
    }
    ALLOWED_FILE_TYPES: set = ALLOWED_IMAGE_TYPES | ALLOWED_DOC_TYPES | ALLOWED_VIDEO_TYPES
    
    # PDF
    LOGO_PATH: Path = ROOT_DIR / "assets" / "aurborbloom_logo.png"
    
    # Admin signup code
    ADMIN_SIGNUP_CODE: str = "ARBORBLOOM-ADMIN-2025"


settings = Settings()

# Ensure upload directories exist
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.TICKET_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
