from typing import Optional, Dict, Any
import httpx
import json
from datetime import datetime
from uuid import UUID
from supabase import Client
from models.campaign import Message, MessageStatus
from dependencies import get_supabase
import logging

logger = logging.getLogger(__name__)

class WhatsAppClient:
    """WhatsApp Business API client for sending messages"""
    
    def __init__(self, access_token: str, phone_number_id: str):
        self.access_token = access_token
        self.phone_number_id = phone_number_id
        self.base_url = "https://graph.facebook.com/v18.0"
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
    
    async def send_text_message(self, to: str, message: str) -> Dict[str, Any]:
        """Send a text message via WhatsApp Business API"""
        url = f"{self.base_url}/{self.phone_number_id}/messages"
        
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {
                "body": message
            }
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=self.headers, json=payload)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            logger.error(f"WhatsApp API error: {e}")
            raise Exception(f"Failed to send WhatsApp message: {str(e)}")
    
    async def send_template_message(self, to: str, template_name: str, params: list) -> Dict[str, Any]:
        """Send a template message via WhatsApp Business API"""
        url = f"{self.base_url}/{self.phone_number_id}/messages"
        
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {
                    "code": "en_US"
                },
                "components": [
                    {
                        "type": "body",
                        "parameters": [{"type": "text", "text": param} for param in params]
                    }
                ]
            }
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=self.headers, json=payload)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            logger.error(f"WhatsApp API error: {e}")
            raise Exception(f"Failed to send WhatsApp template message: {str(e)}")

class WhatsAppService:
    """Service for managing WhatsApp message dispatch and tracking"""
    
    def __init__(self):
        self.supabase: Client = get_supabase()
        self.client: Optional[WhatsAppClient] = None
    
    def configure_client(self, access_token: str, phone_number_id: str):
        """Configure WhatsApp client with API credentials"""
        self.client = WhatsAppClient(access_token, phone_number_id)
    
    async def send_message(self, message_id: UUID) -> bool:
        """Send a specific message via WhatsApp"""
        if not self.client:
            raise Exception("WhatsApp client not configured")
        
        # Get message details
        message_result = self.supabase.table('messages').select('*, guests(*)').eq('id', str(message_id)).execute()
        
        if not message_result.data:
            raise Exception("Message not found")
        
        message_data = message_result.data[0]
        guest_data = message_data['guests']
        
        if not guest_data.get('phone'):
            await self._update_message_status(message_id, MessageStatus.FAILED, "No phone number available")
            return False
        
        try:
            # Send message via WhatsApp API
            response = await self.client.send_text_message(
                to=guest_data['phone'],
                message=message_data['content']
            )
            
            # Update message status
            provider_msg_id = response.get('messages', [{}])[0].get('id')
            await self._update_message_status(
                message_id, 
                MessageStatus.SENT, 
                provider_msg_id=provider_msg_id
            )
            
            # Log event
            await self._log_message_event(message_id, 'sent', response)
            
            logger.info(f"WhatsApp message sent successfully: {message_id}")
            return True
            
        except Exception as e:
            await self._update_message_status(message_id, MessageStatus.FAILED, str(e))
            await self._log_message_event(message_id, 'failed', {'error': str(e)})
            logger.error(f"Failed to send WhatsApp message {message_id}: {e}")
            return False
    
    async def process_webhook(self, webhook_data: Dict[str, Any]) -> bool:
        """Process WhatsApp webhook for delivery status updates"""
        try:
            entry = webhook_data.get('entry', [])[0]
            changes = entry.get('changes', [])[0]
            value = changes.get('value', {})
            
            # Handle status updates
            if 'statuses' in value:
                for status in value['statuses']:
                    await self._handle_status_update(status)
            
            # Handle incoming messages (for read receipts)
            if 'messages' in value:
                for message in value['messages']:
                    await self._handle_incoming_message(message)
            
            return True
            
        except Exception as e:
            logger.error(f"Error processing WhatsApp webhook: {e}")
            return False
    
    async def _update_message_status(self, message_id: UUID, status: MessageStatus, 
                                   error_message: Optional[str] = None, 
                                   provider_msg_id: Optional[str] = None):
        """Update message status in database"""
        update_data = {
            'status': status.value,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        if status == MessageStatus.SENT:
            update_data['sent_at'] = datetime.utcnow().isoformat()
        elif status == MessageStatus.DELIVERED:
            update_data['delivered_at'] = datetime.utcnow().isoformat()
        elif status == MessageStatus.READ:
            update_data['read_at'] = datetime.utcnow().isoformat()
        elif status == MessageStatus.FAILED:
            update_data['failed_at'] = datetime.utcnow().isoformat()
            if error_message:
                update_data['error_message'] = error_message
        
        if provider_msg_id:
            update_data['provider_msg_id'] = provider_msg_id
        
        self.supabase.table('messages').update(update_data).eq('id', str(message_id)).execute()
    
    async def _log_message_event(self, message_id: UUID, event_type: str, payload: Dict[str, Any]):
        """Log message event for tracking"""
        event_data = {
            'message_id': str(message_id),
            'event_type': event_type,
            'payload': payload,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        self.supabase.table('events').insert(event_data).execute()
    
    async def _handle_status_update(self, status_data: Dict[str, Any]):
        """Handle WhatsApp status update from webhook"""
        provider_msg_id = status_data.get('id')
        status = status_data.get('status')
        
        if not provider_msg_id or not status:
            return
        
        # Find message by provider_msg_id
        message_result = self.supabase.table('messages').select('id').eq('provider_msg_id', provider_msg_id).execute()
        
        if not message_result.data:
            return
        
        message_id = UUID(message_result.data[0]['id'])
        
        # Map WhatsApp status to our status
        status_mapping = {
            'sent': MessageStatus.SENT,
            'delivered': MessageStatus.DELIVERED,
            'read': MessageStatus.READ,
            'failed': MessageStatus.FAILED
        }
        
        if status in status_mapping:
            await self._update_message_status(message_id, status_mapping[status])
            await self._log_message_event(message_id, status, status_data)
    
    async def _handle_incoming_message(self, message_data: Dict[str, Any]):
        """Handle incoming message (for read receipts)"""
        # This could be used for handling replies or read receipts
        # For now, we'll just log it
        logger.info(f"Received incoming WhatsApp message: {message_data}")