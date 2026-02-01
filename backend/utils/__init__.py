"""
Utils Package
Common utility functions and helpers
"""
# Import from local modules
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.helpers import (
    hash_password,
    verify_password,
    encrypt_sensitive_data,
    decrypt_sensitive_data,
    hash_sensitive_field,
    get_utc_now,
    deserialize_datetime,
    serialize_datetime,
    format_duration,
    sanitize_filename
)

from utils.auth import (
    create_token,
    decode_token,
    get_current_user,
    require_admin,
    require_super_admin,
    require_employee,
    get_tenant_id
)

__all__ = [
    # Password utilities
    "hash_password",
    "verify_password",
    # Encryption utilities
    "encrypt_sensitive_data",
    "decrypt_sensitive_data",
    "hash_sensitive_field",
    # Date/time utilities
    "get_utc_now",
    "deserialize_datetime",
    "serialize_datetime",
    # Formatting utilities
    "format_duration",
    "sanitize_filename",
    # Auth utilities
    "create_token",
    "decode_token",
    "get_current_user",
    "require_admin",
    "require_super_admin",
    "require_employee",
    "get_tenant_id"
]
