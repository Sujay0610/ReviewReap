from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client, create_client
from dependencies import get_supabase
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()
security = HTTPBearer()

# Auth client for JWT verification (uses anon key)
auth_supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_ANON_KEY")
)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user from JWT token"""
    try:
        # Get user from token using auth client
        user_response = auth_supabase.auth.get_user(credentials.credentials)
        
        if user_response.user is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        return user_response.user
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

async def get_current_user_org(credentials: HTTPAuthorizationCredentials = Depends(security), supabase: Client = Depends(get_supabase)):
    """Get current user's organization ID"""
    try:
        # Get user from token using auth client
        user_response = auth_supabase.auth.get_user(credentials.credentials)
        
        if user_response.user is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        user = user_response.user
        
        # Get user's organization using service role client
        profile_response = supabase.table('users').select('org_id').eq('id', user.id).single().execute()
        
        if not profile_response.data or not profile_response.data.get('org_id'):
            raise HTTPException(status_code=400, detail="User not associated with an organization")
        
        return {
            'user': user,
            'org_id': profile_response.data['org_id']
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

async def get_current_user_org_id(supabase: Client, user_id: str) -> str:
    """Get organization ID for a given user ID"""
    try:
        # Get user's organization
        profile_response = supabase.table('users').select('org_id').eq('id', user_id).single().execute()
        
        if not profile_response.data or not profile_response.data.get('org_id'):
            raise Exception("User not associated with an organization")
        
        return profile_response.data['org_id']
    except Exception as e:
        raise Exception(f"Failed to get user organization: {str(e)}")