from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from uuid import UUID
from models.review import (
    ReviewList, ReviewAnalytics, GoogleAPIConfig, GoogleConnectionStatus,
    ReviewResponseCreate, ReviewResponseGenerate
)
from services.google_reviews_service import GoogleReviewsService
from services.ai_service import AIService
from dependencies import get_current_user, get_supabase
from supabase import Client
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/google", tags=["google-reviews"])

async def get_user_org_id(current_user: dict, supabase: Client) -> UUID:
    """Get the organization ID for the current user"""
    try:
        result = supabase.table('users').select('org_id').eq('id', current_user['id']).single().execute()
        if not result.data or not result.data.get('org_id'):
            raise HTTPException(status_code=400, detail="User not associated with an organization")
        return UUID(result.data['org_id'])
    except Exception as e:
        logger.error(f"Error getting user org_id: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get user organization")

@router.post("/connect")
async def connect_google_api(
    config: GoogleAPIConfig,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Connect Google My Business API for the organization
    """
    try:
        org_id = await get_user_org_id(current_user, supabase)
        ai_service = AIService(supabase)
        google_service = GoogleReviewsService(ai_service)
        
        result = await google_service.configure_google_api(
            org_id=org_id,
            api_key=config.api_key,
            place_id=config.place_id
        )
        
        if result["success"]:
            return {
                "message": "Google API connected successfully",
                "business_info": result["business_info"]
            }
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except Exception as e:
        logger.error(f"Error connecting Google API: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/connection-status", response_model=GoogleConnectionStatus)
async def get_connection_status(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Get Google API connection status for the organization
    """
    try:
        org_id = await get_user_org_id(current_user, supabase)
        ai_service = AIService(supabase)
        google_service = GoogleReviewsService(ai_service)
        
        status = await google_service.get_connection_status(
            org_id=org_id
        )
        
        return GoogleConnectionStatus(**status)
        
    except Exception as e:
        logger.error(f"Error getting connection status: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/profiles")
async def list_business_profiles(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    List Google Business profiles for the organization
    """
    try:
        result = supabase.table("google_business_profiles").select(
            "*"
        ).eq("org_id", current_user["org_id"]).execute()
        
        return {
            "profiles": result.data,
            "total": len(result.data)
        }
        
    except Exception as e:
        logger.error(f"Error listing business profiles: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/sync")
async def sync_reviews(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Sync reviews from Google My Business API
    """
    try:
        org_id = await get_user_org_id(current_user, supabase)
        ai_service = AIService(supabase)
        google_service = GoogleReviewsService(ai_service)
        
        result = await google_service.sync_reviews(
            org_id=org_id
        )
        
        if result["success"]:
            return {
                "message": "Reviews synced successfully",
                "new_reviews": result["new_reviews"],
                "updated_reviews": result["updated_reviews"],
                "total_processed": result["total_processed"]
            }
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except Exception as e:
        logger.error(f"Error syncing reviews: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/reviews", response_model=ReviewList)
async def get_reviews(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    rating_filter: Optional[int] = Query(None, ge=1, le=5),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Get paginated list of Google reviews for the organization
    """
    try:
        org_id = await get_user_org_id(current_user, supabase)
        ai_service = AIService(supabase)
        google_service = GoogleReviewsService(ai_service)
        
        reviews = await google_service.get_reviews(
            org_id=org_id,
            page=page,
            per_page=per_page,
            rating_filter=rating_filter
        )
        
        return ReviewList(**result)
        
    except Exception as e:
        logger.error(f"Error getting reviews: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/reviews/analytics", response_model=ReviewAnalytics)
async def get_review_analytics(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Get review analytics for the organization
    """
    try:
        org_id = await get_user_org_id(current_user, supabase)
        ai_service = AIService(supabase)
        google_service = GoogleReviewsService(ai_service)
        
        analytics = await google_service.get_review_analytics(
            org_id=org_id,
            days=days
        )
        
        if "error" in analytics:
            raise HTTPException(status_code=400, detail=analytics["error"])
        
        # Get recent reviews for the analytics
        recent_reviews_result = await google_service.get_reviews(
            org_id=UUID(current_user["org_id"]),
            page=1,
            per_page=5
        )
        
        analytics["recent_reviews"] = recent_reviews_result["reviews"]
        
        return ReviewAnalytics(**analytics)
        
    except Exception as e:
        logger.error(f"Error getting review analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/reviews/{review_id}/generate-response")
async def generate_review_response(
    review_id: UUID,
    request: ReviewResponseGenerate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Generate AI response for a review
    """
    try:
        org_id = await get_user_org_id(current_user, supabase)
        ai_service = AIService(supabase)
        google_service = GoogleReviewsService(ai_service)
        
        result = await google_service.generate_review_response(
            org_id=org_id,
            review_id=review_id,
            tone=request.tone,
            custom_instructions=request.custom_instructions
        )
        
        if result["success"]:
            return {
                "response_text": result["response_text"]
            }
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except Exception as e:
        logger.error(f"Error generating review response: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/reviews/{review_id}/respond")
async def respond_to_review(
    review_id: UUID,
    request: ReviewResponseCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Respond to a Google review
    """
    try:
        org_id = await get_user_org_id(current_user, supabase)
        ai_service = AIService(supabase)
        google_service = GoogleReviewsService(ai_service)
        
        result = await google_service.respond_to_review(
            org_id=org_id,
            review_id=review_id,
            response_text=request.response_text
        )
        
        if result["success"]:
            return {"message": result["message"]}
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except Exception as e:
        logger.error(f"Error responding to review: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Additional endpoint for getting individual review details
@router.get("/reviews/{review_id}")
async def get_review_details(
    review_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Get detailed information about a specific review
    """
    try:
        org_id = await get_user_org_id(current_user, supabase)
        ai_service = AIService(supabase)
        google_service = GoogleReviewsService(ai_service)
        
        review = await google_service.get_review_details(
            org_id=org_id,
            review_id=review_id
        )
        
        if "error" in review:
            raise HTTPException(status_code=400, detail=review["error"])
        
        return review
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting review details: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")