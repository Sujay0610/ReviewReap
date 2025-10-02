from fastapi import APIRouter, Request, HTTPException
from typing import Dict, Any
import json
import logging
from services.whatsapp_service import WhatsAppService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhook", tags=["webhooks"])

# Initialize WhatsApp service for webhook processing
whatsapp_service = WhatsAppService()

@router.get("/whatsapp")
async def whatsapp_webhook_verification(request: Request):
    """WhatsApp webhook verification endpoint"""
    try:
        # Get query parameters
        hub_mode = request.query_params.get('hub.mode')
        hub_token = request.query_params.get('hub.verify_token')
        hub_challenge = request.query_params.get('hub.challenge')
        
        # Verify the webhook (you should set a verify token in your WhatsApp app)
        # For now, we'll accept any verification request
        if hub_mode == 'subscribe':
            logger.info(f"WhatsApp webhook verification successful")
            return int(hub_challenge) if hub_challenge else 200
        else:
            logger.warning(f"WhatsApp webhook verification failed: invalid mode {hub_mode}")
            raise HTTPException(status_code=403, detail="Forbidden")
            
    except Exception as e:
        logger.error(f"WhatsApp webhook verification error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/whatsapp")
async def whatsapp_webhook_handler(request: Request):
    """WhatsApp webhook handler for receiving status updates"""
    try:
        # Get the raw body
        body = await request.body()
        
        # Parse JSON
        try:
            webhook_data = json.loads(body.decode('utf-8'))
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in WhatsApp webhook: {e}")
            raise HTTPException(status_code=400, detail="Invalid JSON")
        
        # Log the webhook data for debugging
        logger.info(f"Received WhatsApp webhook: {json.dumps(webhook_data, indent=2)}")
        
        # Process the webhook
        success = await whatsapp_service.process_webhook(webhook_data)
        
        if success:
            return {"status": "success"}
        else:
            logger.error("Failed to process WhatsApp webhook")
            raise HTTPException(status_code=500, detail="Failed to process webhook")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"WhatsApp webhook handler error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test-whatsapp")
async def test_whatsapp_webhook():
    """Test endpoint to simulate WhatsApp webhook data"""
    # Sample webhook data for testing
    test_webhook_data = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "15550559999",
                                "phone_number_id": "PHONE_NUMBER_ID"
                            },
                            "statuses": [
                                {
                                    "id": "wamid.test123",
                                    "status": "delivered",
                                    "timestamp": "1234567890",
                                    "recipient_id": "15551234567"
                                }
                            ]
                        },
                        "field": "messages"
                    }
                ]
            }
        ]
    }
    
    try:
        success = await whatsapp_service.process_webhook(test_webhook_data)
        return {
            "message": "Test webhook processed",
            "success": success,
            "test_data": test_webhook_data
        }
    except Exception as e:
        logger.error(f"Test webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Email webhook endpoints (for Phase 4)
@router.post("/email/resend")
async def resend_webhook_handler(request: Request):
    """Resend email webhook handler (Phase 4)"""
    # Placeholder for Phase 4 implementation
    logger.info("Resend webhook received (not implemented yet)")
    return {"status": "received", "message": "Email webhooks will be implemented in Phase 4"}

@router.get("/health")
async def webhook_health_check():
    """Health check endpoint for webhooks"""
    return {
        "status": "healthy",
        "webhooks": {
            "whatsapp": "active",
            "email": "planned_for_phase_4"
        }
    }