from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List, Dict, Any
from uuid import UUID
from pydantic import BaseModel
from models.campaign import Message, MessageStatus
from services.message_dispatcher import message_dispatcher
from services.campaign_service import CampaignService
# from dependencies import get_current_user, get_current_org  # TODO: Implement when auth is ready

router = APIRouter(prefix="/api/campaigns", tags=["campaign-execution"])

class WhatsAppConfig(BaseModel):
    access_token: str
    phone_number_id: str

class EmailConfig(BaseModel):
    api_key: str

class CampaignExecutionResponse(BaseModel):
    message: str
    campaign_id: UUID
    status: str
    messages_queued: int = 0

@router.post("/configure-whatsapp")
async def configure_whatsapp(
    config: WhatsAppConfig,
    # current_user: dict = Depends(get_current_user),  # TODO: Add when auth is ready
):
    """Configure WhatsApp API credentials"""
    try:
        message_dispatcher.configure_whatsapp(
            access_token=config.access_token,
            phone_number_id=config.phone_number_id
        )
        return {"message": "WhatsApp configuration updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/configure-email")
async def configure_email(
    config: EmailConfig,
    # current_user: dict = Depends(get_current_user),  # TODO: Add when auth is ready
):
    """Configure email API credentials (Resend)"""
    try:
        message_dispatcher.configure_email(api_key=config.api_key)
        return {"message": "Email configuration updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{campaign_id}/start", response_model=CampaignExecutionResponse)
async def start_campaign(
    campaign_id: UUID,
    background_tasks: BackgroundTasks,
    # current_org = Depends(get_current_org)  # TODO: Add when auth is ready
):
    """Start a campaign and begin message dispatch"""
    try:
        # TODO: Replace with actual org_id from auth
        from uuid import uuid4
        mock_org_id = uuid4()
        
        # Start the campaign
        success = await message_dispatcher.start_campaign(campaign_id, mock_org_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Campaign not found or could not be started")
        
        # Start background message processing if not already running
        if not message_dispatcher.is_running:
            background_tasks.add_task(message_dispatcher.process_message_queue)
        
        # Get campaign details
        campaign_service = CampaignService()
        campaign = await campaign_service.get_campaign(campaign_id, mock_org_id)
        
        # Count queued messages
        messages_result = message_dispatcher.supabase.table('messages').select('id', count='exact').eq('campaign_id', str(campaign_id)).eq('status', MessageStatus.QUEUED.value).execute()
        messages_queued = messages_result.count or 0
        
        return CampaignExecutionResponse(
            message="Campaign started successfully",
            campaign_id=campaign_id,
            status="active",
            messages_queued=messages_queued
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{campaign_id}/stop", response_model=CampaignExecutionResponse)
async def stop_campaign(
    campaign_id: UUID,
    # current_org = Depends(get_current_org)  # TODO: Add when auth is ready
):
    """Stop a running campaign"""
    try:
        # TODO: Replace with actual org_id from auth
        from uuid import uuid4
        mock_org_id = uuid4()
        
        success = await message_dispatcher.stop_campaign(campaign_id, mock_org_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Campaign not found or could not be stopped")
        
        return CampaignExecutionResponse(
            message="Campaign stopped successfully",
            campaign_id=campaign_id,
            status="cancelled"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{campaign_id}/pause", response_model=CampaignExecutionResponse)
async def pause_campaign(
    campaign_id: UUID,
    # current_org = Depends(get_current_org)  # TODO: Add when auth is ready
):
    """Pause a running campaign"""
    try:
        # TODO: Replace with actual org_id from auth
        from uuid import uuid4
        mock_org_id = uuid4()
        
        success = await message_dispatcher.pause_campaign(campaign_id, mock_org_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Campaign not found or could not be paused")
        
        return CampaignExecutionResponse(
            message="Campaign paused successfully",
            campaign_id=campaign_id,
            status="paused"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{campaign_id}/resume", response_model=CampaignExecutionResponse)
async def resume_campaign(
    campaign_id: UUID,
    background_tasks: BackgroundTasks,
    # current_org = Depends(get_current_org)  # TODO: Add when auth is ready
):
    """Resume a paused campaign"""
    try:
        # TODO: Replace with actual org_id from auth
        from uuid import uuid4
        mock_org_id = uuid4()
        
        success = await message_dispatcher.resume_campaign(campaign_id, mock_org_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Campaign not found or could not be resumed")
        
        # Restart background processing if needed
        if not message_dispatcher.is_running:
            background_tasks.add_task(message_dispatcher.process_message_queue)
        
        return CampaignExecutionResponse(
            message="Campaign resumed successfully",
            campaign_id=campaign_id,
            status="active"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{campaign_id}/messages", response_model=List[Message])
async def get_campaign_messages(
    campaign_id: UUID,
    # current_org = Depends(get_current_org)  # TODO: Add when auth is ready
):
    """Get all messages for a campaign"""
    try:
        messages_result = message_dispatcher.supabase.table('messages').select('*').eq('campaign_id', str(campaign_id)).order('created_at', desc=True).execute()
        
        messages = [Message(**message) for message in messages_result.data]
        return messages
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/messages/{message_id}/events")
async def get_message_events(
    message_id: UUID,
    # current_user = Depends(get_current_user)  # TODO: Add when auth is ready
):
    """Get events for a specific message"""
    try:
        events_result = message_dispatcher.supabase.table('events').select('*').eq('message_id', str(message_id)).order('timestamp', desc=True).execute()
        
        return {"events": events_result.data}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/dispatcher/status")
async def get_dispatcher_status(
    # current_user = Depends(get_current_user)  # TODO: Add when auth is ready
):
    """Get message dispatcher status"""
    return {
        "is_running": message_dispatcher.is_running,
        "rate_limiter_requests": len(message_dispatcher.rate_limiter.requests)
    }

@router.post("/dispatcher/start")
async def start_dispatcher(
    background_tasks: BackgroundTasks,
    # current_user = Depends(get_current_user)  # TODO: Add when auth is ready
):
    """Manually start the message dispatcher"""
    if not message_dispatcher.is_running:
        background_tasks.add_task(message_dispatcher.process_message_queue)
        return {"message": "Message dispatcher started"}
    else:
        return {"message": "Message dispatcher is already running"}

@router.post("/dispatcher/stop")
async def stop_dispatcher(
    # current_user = Depends(get_current_user)  # TODO: Add when auth is ready
):
    """Manually stop the message dispatcher"""
    message_dispatcher.stop_dispatcher()
    return {"message": "Message dispatcher stopped"}