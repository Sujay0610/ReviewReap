from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from uuid import UUID
from models.conversation import (
    Conversation, ConversationCreate, ConversationUpdate, ConversationList,
    ConversationMessage, ConversationMessageCreate,
    SentimentAnalysisResult, AutoResponseRequest, AutoResponseResult,
    ConversationStatus
)
from services.conversation_service import ConversationService
from dependencies import get_current_user, get_supabase
from supabase import Client

router = APIRouter(prefix="/conversations", tags=["conversations"])

def get_conversation_service(supabase: Client = Depends(get_supabase)) -> ConversationService:
    return ConversationService(supabase)

@router.get("/", response_model=ConversationList)
async def get_conversations(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    status: Optional[ConversationStatus] = None,
    current_user: dict = Depends(get_current_user),
    service: ConversationService = Depends(get_conversation_service)
):
    """Get paginated list of conversations"""
    try:
        return await service.get_conversations(
            user_id=current_user['id'],
            page=page,
            per_page=per_page,
            status=status
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{conversation_id}", response_model=Conversation)
async def get_conversation(
    conversation_id: UUID,
    current_user: dict = Depends(get_current_user),
    service: ConversationService = Depends(get_conversation_service)
):
    """Get a specific conversation with messages"""
    try:
        conversation = await service.get_conversation(conversation_id, current_user['id'])
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conversation
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=Conversation)
async def create_conversation(
    conversation_data: ConversationCreate,
    current_user: dict = Depends(get_current_user),
    service: ConversationService = Depends(get_conversation_service)
):
    """Create a new conversation"""
    try:
        return await service.create_conversation(conversation_data, current_user['id'])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{conversation_id}", response_model=Conversation)
async def update_conversation(
    conversation_id: UUID,
    update_data: ConversationUpdate,
    current_user: dict = Depends(get_current_user),
    service: ConversationService = Depends(get_conversation_service)
):
    """Update conversation status or sentiment"""
    try:
        conversation = await service.update_conversation(conversation_id, update_data, current_user['id'])
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conversation
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{conversation_id}/messages", response_model=ConversationMessage)
async def add_message(
    conversation_id: UUID,
    message_data: ConversationMessageCreate,
    current_user: dict = Depends(get_current_user),
    service: ConversationService = Depends(get_conversation_service)
):
    """Add a message to a conversation"""
    try:
        # Ensure the conversation_id matches
        message_data.conversation_id = conversation_id
        return await service.add_message(message_data, current_user['id'])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/analyze-sentiment", response_model=SentimentAnalysisResult)
async def analyze_sentiment(
    message_content: str,
    current_user: dict = Depends(get_current_user),
    service: ConversationService = Depends(get_conversation_service)
):
    """Analyze sentiment of a message"""
    try:
        return await service.analyze_sentiment(message_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auto-response", response_model=AutoResponseResult)
async def generate_auto_response(
    request: AutoResponseRequest,
    current_user: dict = Depends(get_current_user),
    service: ConversationService = Depends(get_conversation_service)
):
    """Generate an automated response to a guest message"""
    try:
        return await service.generate_auto_response(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/overview")
async def get_conversation_analytics(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
    service: ConversationService = Depends(get_conversation_service)
):
    """Get conversation analytics for the dashboard"""
    try:
        return await service.get_conversation_analytics(current_user['id'], days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Webhook endpoint for receiving guest replies (WhatsApp, Email, etc.)
@router.post("/webhook/guest-reply")
async def handle_guest_reply(
    guest_id: UUID,
    channel: str,
    message_content: str,
    message_type: str = "text",
    service: ConversationService = Depends(get_conversation_service)
):
    """Handle incoming guest replies from external channels"""
    try:
        # Find or create conversation
        from models.conversation import ConversationCreate, ConversationMessageCreate, MessageSender, MessageType
        
        # This would typically be called by webhook handlers
        # For now, we'll create a basic implementation
        
        # Try to find existing active conversation
        # If not found, create new one
        conversation_data = ConversationCreate(
            guest_id=guest_id,
            channel=channel
        )
        
        # Add the guest message
        message_data = ConversationMessageCreate(
            conversation_id=UUID('00000000-0000-0000-0000-000000000000'),  # Will be updated
            sender=MessageSender.GUEST,
            content=message_content,
            message_type=MessageType(message_type)
        )
        
        # This endpoint would need proper authentication for webhook sources
        # For now, return success
        return {"status": "received", "message": "Guest reply processed"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))