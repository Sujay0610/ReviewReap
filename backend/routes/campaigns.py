from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any
from uuid import UUID
from models.campaign import (
    Campaign, CampaignCreate, CampaignUpdate, CampaignList,
    CampaignWithStats, CampaignPreview, Message
)
from services.campaign_service import CampaignService
# from dependencies import get_current_user, get_current_org  # TODO: Implement when auth is ready

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])

@router.post("/", response_model=Campaign)
async def create_campaign(
    campaign_data: CampaignCreate,
    # current_user: dict = Depends(get_current_user),  # TODO: Add when auth is ready
    # current_org: dict = Depends(get_current_org)     # TODO: Add when auth is ready
):
    """Create a new campaign"""
    try:
        campaign_service = CampaignService()
        # TODO: Replace with actual org_id and user_id from auth
        from uuid import uuid4
        mock_org_id = uuid4()
        mock_user_id = uuid4()
        campaign = await campaign_service.create_campaign(
            campaign_data=campaign_data,
            org_id=mock_org_id,
            user_id=mock_user_id
        )
        return campaign
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=CampaignList)
async def get_campaigns(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    # current_org = Depends(get_current_org)  # TODO: Add when auth is ready
):
    """Get paginated list of campaigns"""
    try:
        campaign_service = CampaignService()
        # TODO: Replace with actual org_id from auth
        from uuid import uuid4
        mock_org_id = uuid4()
        campaigns = await campaign_service.get_campaigns(
            org_id=mock_org_id,
            page=page,
            per_page=per_page
        )
        return campaigns
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{campaign_id}", response_model=CampaignWithStats)
async def get_campaign(
    campaign_id: UUID,
    # current_org = Depends(get_current_org)  # TODO: Add when auth is ready
):
    """Get a specific campaign with statistics"""
    try:
        campaign_service = CampaignService()
        # TODO: Replace with actual org_id from auth
        from uuid import uuid4
        mock_org_id = uuid4()
        campaign = await campaign_service.get_campaign_with_stats(
            campaign_id=campaign_id,
            org_id=mock_org_id
        )
        
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        return campaign
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{campaign_id}", response_model=Campaign)
async def update_campaign(
    campaign_id: UUID,
    campaign_data: CampaignUpdate,
    # current_org = Depends(get_current_org)  # TODO: Add when auth is ready
):
    """Update a campaign"""
    try:
        campaign_service = CampaignService()
        # TODO: Replace with actual org_id from auth
        from uuid import uuid4
        mock_org_id = uuid4()
        campaign = await campaign_service.update_campaign(
            campaign_id=campaign_id,
            campaign_data=campaign_data,
            org_id=mock_org_id
        )
        
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        return campaign
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: UUID,
    # current_org = Depends(get_current_org)  # TODO: Add when auth is ready
):
    """Delete a campaign"""
    try:
        campaign_service = CampaignService()
        # TODO: Replace with actual org_id from auth
        from uuid import uuid4
        mock_org_id = uuid4()
        deleted = await campaign_service.delete_campaign(
            campaign_id=campaign_id,
            org_id=mock_org_id
        )
        
        if not deleted:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        return {"message": "Campaign deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{campaign_id}/preview", response_model=CampaignPreview)
async def preview_campaign_messages(
    campaign_id: UUID,
    # current_org = Depends(get_current_org)  # TODO: Add when auth is ready
):
    """Preview messages that will be generated for a campaign"""
    try:
        campaign_service = CampaignService()
        # TODO: Replace with actual org_id from auth
        from uuid import uuid4
        mock_org_id = uuid4()
        preview = await campaign_service.preview_campaign_messages(
            campaign_id=campaign_id,
            org_id=mock_org_id
        )
        return preview
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/template/variables")
async def get_template_variables():
    """Get list of available template variables"""
    try:
        campaign_service = CampaignService()
        variables = campaign_service.get_template_variables()
        return {"variables": variables}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{campaign_id}/messages", response_model=List[Message])
async def create_campaign_messages(
    campaign_id: UUID,
    # current_org = Depends(get_current_org)  # TODO: Add when auth is ready
):
    """Create messages for all guests in a campaign"""
    try:
        campaign_service = CampaignService()
        # TODO: Replace with actual org_id from auth
        from uuid import uuid4
        mock_org_id = uuid4()
        messages = await campaign_service.create_messages_for_campaign(
            campaign_id=campaign_id,
            org_id=mock_org_id
        )
        return messages
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{campaign_id}/schedule")
async def schedule_campaign(
    campaign_id: UUID,
    # current_org = Depends(get_current_org)  # TODO: Add when auth is ready
):
    """Schedule a campaign to start"""
    try:
        campaign_service = CampaignService()
        
        # TODO: Replace with actual org_id from auth
        from uuid import uuid4
        mock_org_id = uuid4()
        
        # Update campaign status to scheduled
        campaign_data = CampaignUpdate(status="scheduled")
        campaign = await campaign_service.update_campaign(
            campaign_id=campaign_id,
            campaign_data=campaign_data,
            org_id=mock_org_id
        )
        
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # Create messages for the campaign
        messages = await campaign_service.create_messages_for_campaign(
            campaign_id=campaign_id,
            org_id=mock_org_id
        )
        
        return {
            "message": "Campaign scheduled successfully",
            "campaign": campaign,
            "messages_created": len(messages)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))