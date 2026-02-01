"""
Authentication Utilities
JWT token management and user authentication
"""
import jwt
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Import from local modules
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRY_HOURS, DEFAULT_TENANT_SLUG
from database import db

security = HTTPBearer(auto_error=False)


def create_token(user_id: str, email: str, role: str, tenant_id: str) -> str:
    """Create a JWT token for a user"""
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "tenant_id": tenant_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get the current authenticated user from JWT token"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    payload = decode_token(credentials.credentials)
    
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")
    
    # Add tenant_id from token to user object
    user["tenant_id"] = payload.get("tenant_id", DEFAULT_TENANT_SLUG)
    
    return user


async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Require the current user to be an admin"""
    user = await get_current_user(credentials)
    
    if user.get("role") not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return user


async def require_super_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Require the current user to be a super admin"""
    user = await get_current_user(credentials)
    
    if user.get("role") != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Super Admin access required")
    
    return user


async def require_employee(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Require the current user to be an employee"""
    user = await get_current_user(credentials)
    
    if user.get("role") not in ["EMPLOYEE"]:
        raise HTTPException(status_code=403, detail="Employee access required")
    
    return user


def get_tenant_id(current_user: dict) -> str:
    """Extract tenant_id from current user"""
    return current_user.get("tenant_id", DEFAULT_TENANT_SLUG)
