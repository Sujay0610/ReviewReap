from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from dependencies import get_supabase, get_current_user
from services.ai_service import ai_service
from models.guest import Guest

router = APIRouter(prefix="/ai", tags=["AI"])

# Pydantic models for API requests/responses
class AIConfigRequest(BaseModel):
    openai_api_key: str

class MessageGenerationRequest(BaseModel):
    guest_id: UUID
    message_type: str = "review_request"  # review_request, follow_up, custom

class MessageGenerationResponse(BaseModel):
    content: str
    ai_generated: bool
    cached: bool = False

class SentimentAnalysisRequest(BaseModel):
    message_content: str

class SentimentAnalysisResponse(BaseModel):
    sentiment: str
    confidence: float
    intent: str
    requires_human: bool

class AutoResponseRequest(BaseModel):
    guest_message: str
    sentiment: str
    guest_id: UUID

class AutoResponseResponse(BaseModel):
    response: str
    ai_generated: bool

class PromptTemplate(BaseModel):
    id: Optional[UUID] = None
    name: str
    template: str
    type: str  # review_request, follow_up, response, custom
    is_active: bool = True

class PromptTemplateCreate(BaseModel):
    name: str
    template: str
    type: str

class PromptTemplateUpdate(BaseModel):
    name: Optional[str] = None
    template: Optional[str] = None
    type: Optional[str] = None
    is_active: Optional[bool] = None

@router.post("/migrate")
async def run_migration():
    """Information about running database migration for AI integration tables"""
    return {
        "message": "AI integration migration information",
        "status": "manual_migration_required",
        "instructions": "Please run the SQL migration file '004_add_ai_integration.sql' manually in your Supabase dashboard",
        "migration_file": "backend/migrations/004_add_ai_integration.sql",
        "tables_to_create": [
            "ai_configurations",
            "ai_prompt_templates", 
            "ai_message_generations",
            "ai_sentiment_analyses"
        ],
        "note": "The migration creates tables for AI configuration, prompt templates, message generation tracking, and sentiment analysis."
    }

@router.post("/configure")
async def configure_ai(
    config: AIConfigRequest,
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Configure AI service with OpenAI API key"""
    try:
        # Configure AI service
        ai_service.configure_client(config.openai_api_key)
        
        # Store API key in organization settings
        org_update = {
            "openai_api_key": config.openai_api_key,
            "updated_at": "now()"
        }
        
        result = supabase.table('orgs').update(org_update).eq('id', str(current_user.org_id)).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update organization settings"
            )
        
        return {"message": "AI service configured successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to configure AI service: {str(e)}"
        )

@router.get("/configure")
async def get_ai_config(
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Get AI configuration for the organization"""
    try:
        # First get the user's org_id from the users table
        user_result = supabase.table('users').select('org_id').eq('id', current_user['id']).execute()
        
        if not user_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        org_id = user_result.data[0]['org_id']
        
        # Get organization settings - only query existing columns
        result = supabase.table('orgs').select('openai_api_key').eq('id', str(org_id)).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )
        
        org_data = result.data[0]
        
        # Return configuration with defaults for missing columns
        return {
            "ai_enabled": bool(org_data.get('openai_api_key')),  # AI enabled if API key exists
            "openai_api_key": "***" if org_data.get('openai_api_key') else None,
            "model": 'gpt-4o-mini',  # Default model
            "temperature": 0.7,  # Default temperature
            "max_tokens": 150,  # Default max tokens
            "system_prompt": 'You are a helpful assistant for hotel guest communication.'  # Default system prompt
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get AI configuration: {str(e)}"
        )

@router.post("/generate-message", response_model=MessageGenerationResponse)
async def generate_message(
    request: MessageGenerationRequest,
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Generate AI-powered personalized message for a guest"""
    try:
        # Get guest data
        guest_result = supabase.table('guests').select('*').eq('id', str(request.guest_id)).eq('org_id', str(current_user.org_id)).execute()
        
        if not guest_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Guest not found"
            )
        
        guest = Guest(**guest_result.data[0])
        
        # Generate message using AI service
        content = await ai_service.generate_personalized_message(guest, request.message_type)
        
        return MessageGenerationResponse(
            content=content,
            ai_generated=True,
            cached=False  # AI service handles caching internally
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate message: {str(e)}"
        )

@router.post("/analyze-sentiment", response_model=SentimentAnalysisResponse)
async def analyze_sentiment(
    request: SentimentAnalysisRequest,
    current_user = Depends(get_current_user)
):
    """Analyze sentiment and intent of guest message"""
    try:
        analysis = await ai_service.analyze_guest_reply(request.message_content)
        
        return SentimentAnalysisResponse(
            sentiment=analysis.get('sentiment', 'neutral'),
            confidence=analysis.get('confidence', 0.0),
            intent=analysis.get('intent', 'other'),
            requires_human=analysis.get('requires_human', True)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze sentiment: {str(e)}"
        )

@router.post("/generate-response", response_model=AutoResponseResponse)
async def generate_auto_response(
    request: AutoResponseRequest,
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Generate automated response to guest message"""
    try:
        # Get guest data
        guest_result = supabase.table('guests').select('*').eq('id', str(request.guest_id)).eq('org_id', str(current_user.org_id)).execute()
        
        if not guest_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Guest not found"
            )
        
        guest = Guest(**guest_result.data[0])
        
        # Generate response using AI service
        response = await ai_service.generate_auto_response(
            request.guest_message,
            request.sentiment,
            guest
        )
        
        return AutoResponseResponse(
            response=response,
            ai_generated=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate response: {str(e)}"
        )

@router.get("/prompts", response_model=List[PromptTemplate])
async def get_prompt_templates(
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Get all prompt templates for the organization"""
    try:
        # First get the user's org_id from the users table
        user_result = supabase.table('users').select('org_id').eq('id', current_user['id']).execute()
        
        if not user_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        org_id = user_result.data[0]['org_id']
        
        result = supabase.table('prompt_templates').select('*').eq('org_id', str(org_id)).eq('is_active', True).order('created_at', desc=True).execute()
        
        templates = [PromptTemplate(**row) for row in result.data]
        return templates
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get prompt templates: {str(e)}"
        )

@router.post("/prompts", response_model=PromptTemplate)
async def create_prompt_template(
    template_data: PromptTemplateCreate,
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Create a new prompt template"""
    try:
        template_dict = template_data.model_dump()
        template_dict['org_id'] = str(current_user.org_id)
        
        result = supabase.table('prompt_templates').insert(template_dict).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create prompt template"
            )
        
        return PromptTemplate(**result.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create prompt template: {str(e)}"
        )

@router.put("/prompts/{template_id}", response_model=PromptTemplate)
async def update_prompt_template(
    template_id: UUID,
    template_data: PromptTemplateUpdate,
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Update a prompt template"""
    try:
        update_dict = template_data.model_dump(exclude_unset=True)
        update_dict['updated_at'] = 'now()'
        
        result = supabase.table('prompt_templates').update(update_dict).eq('id', str(template_id)).eq('org_id', str(current_user.org_id)).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Prompt template not found"
            )
        
        return PromptTemplate(**result.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update prompt template: {str(e)}"
        )

@router.delete("/prompts/{template_id}")
async def delete_prompt_template(
    template_id: UUID,
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Delete a prompt template (soft delete by setting is_active to false)"""
    try:
        result = supabase.table('prompt_templates').update({'is_active': False, 'updated_at': 'now()'}).eq('id', str(template_id)).eq('org_id', str(current_user.org_id)).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Prompt template not found"
            )
        
        return {"message": "Prompt template deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete prompt template: {str(e)}"
        )

@router.get("/test")
async def test_ai_service(
    current_user = Depends(get_current_user)
):
    """Test AI service configuration"""
    try:
        if not ai_service.openai_client:
            return {"configured": False, "message": "AI service not configured"}
        
        # Test with a simple prompt
        test_response = await ai_service.openai_client.ChatCompletion.acreate(
            model="gpt-4o-mini",
            messages=[
                {"role": "user", "content": "Say 'AI service is working' in a friendly way."}
            ],
            max_tokens=20
        )
        
        return {
            "configured": True,
            "message": "AI service is working",
            "test_response": test_response.choices[0].message.content.strip()
        }
        
    except Exception as e:
        return {
            "configured": False,
            "message": f"AI service test failed: {str(e)}"
        }