from supabase import create_client, Client
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import os
from dotenv import load_dotenv
import logging
import jwt

load_dotenv()
logger = logging.getLogger(__name__)
security = HTTPBearer()

# Supabase client for authentication
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_ANON_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables")

auth_supabase: Client = create_client(supabase_url, supabase_key)

def get_supabase() -> Client:
    """Get Supabase client instance"""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    
    return create_client(url, key)

# Dependency to get current user from Supabase JWT
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user from JWT token"""
    try:
        print(f"DEBUG: Received token: {credentials.credentials[:50]}...")
        
        # Get JWT secret from environment
        jwt_secret = os.getenv("JWT_SECRET_KEY")
        if not jwt_secret:
            logger.error("JWT_SECRET_KEY not found in environment variables")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Server configuration error",
            )
        
        # Verify and decode the JWT token
        decoded_token = jwt.decode(
            credentials.credentials, 
            jwt_secret, 
            algorithms=["HS256"], 
            audience="authenticated"
        )
        
        print(f"DEBUG: JWT payload: {decoded_token}")
        
        # Extract user information from the token
        user_id = decoded_token.get('sub')
        if not user_id:
            print("DEBUG: No user ID found in token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        print(f"DEBUG: User authenticated: {user_id}")
        # Return user info from the token
        return {
            'id': user_id,
            'email': decoded_token.get('email'),
            'role': decoded_token.get('role', 'authenticated'),
            'aud': decoded_token.get('aud'),
            'exp': decoded_token.get('exp')
        }
        
    except jwt.ExpiredSignatureError as e:
        print(f"DEBUG: Token expired: {str(e)}")
        logger.error("JWT token has expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        print(f"DEBUG: Invalid token: {str(e)}")
        logger.error(f"Invalid JWT token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        print(f"DEBUG: Authentication failed: {str(e)}")
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Optional dependency for routes that can work with or without authentication
async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))):
    if credentials is None:
        return None
    try:
        user = auth_supabase.auth.get_user(credentials.credentials)
        return user.user if user and user.user else None
    except:
        return None