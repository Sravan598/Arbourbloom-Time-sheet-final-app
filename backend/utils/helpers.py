"""
Utility Functions
Common helper functions used across the application
"""
import hashlib
import base64
import bcrypt
from datetime import datetime, timezone
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from config import ENCRYPTION_KEY


# ============== PASSWORD UTILITIES ==============

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    if not password or not hashed:
        return False
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False


# ============== ENCRYPTION UTILITIES ==============

def derive_tenant_key(tenant_id: str) -> bytes:
    """Derive a unique encryption key for each tenant from the master key"""
    salt = tenant_id.encode()
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(ENCRYPTION_KEY.encode()))
    return key


def get_tenant_cipher(tenant_id: str) -> Fernet:
    """Get a Fernet cipher for a specific tenant"""
    key = derive_tenant_key(tenant_id)
    return Fernet(key)


def encrypt_sensitive_data(tenant_id: str, data: str) -> str:
    """Encrypt sensitive data for a tenant"""
    if not data:
        return data
    cipher = get_tenant_cipher(tenant_id)
    encrypted = cipher.encrypt(data.encode())
    return base64.urlsafe_b64encode(encrypted).decode()


def decrypt_sensitive_data(tenant_id: str, encrypted_data: str) -> str:
    """Decrypt sensitive data for a tenant"""
    if not encrypted_data:
        return encrypted_data
    try:
        cipher = get_tenant_cipher(tenant_id)
        decoded = base64.urlsafe_b64decode(encrypted_data.encode())
        decrypted = cipher.decrypt(decoded)
        return decrypted.decode()
    except Exception:
        return None


def hash_sensitive_field(data: str) -> str:
    """Create a searchable hash of sensitive data (one-way)"""
    if not data:
        return None
    return hashlib.sha256(data.encode()).hexdigest()


# ============== DATE/TIME UTILITIES ==============

def get_utc_now() -> datetime:
    """Get current UTC datetime"""
    return datetime.now(timezone.utc)


def deserialize_datetime(obj: dict, fields: list) -> dict:
    """Convert ISO string datetime fields to datetime objects"""
    for field in fields:
        if field in obj and isinstance(obj[field], str):
            try:
                obj[field] = datetime.fromisoformat(obj[field].replace("Z", "+00:00"))
            except:
                pass
    return obj


def serialize_datetime(obj: dict, fields: list) -> dict:
    """Convert datetime objects to ISO strings"""
    for field in fields:
        if field in obj and isinstance(obj[field], datetime):
            obj[field] = obj[field].isoformat()
    return obj


# ============== FORMATTING UTILITIES ==============

def format_duration(minutes: int) -> str:
    """Format minutes into hours and minutes string"""
    if not minutes:
        return "0h 0m"
    hours = minutes // 60
    mins = minutes % 60
    return f"{hours}h {mins}m"


def sanitize_filename(filename: str) -> str:
    """Sanitize a filename for safe storage"""
    # Remove any path components
    filename = filename.replace("/", "_").replace("\\", "_")
    # Remove any special characters
    return "".join(c for c in filename if c.isalnum() or c in "._-")
