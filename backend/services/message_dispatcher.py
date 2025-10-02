import asyncio
from typing import List, Optional
from datetime import datetime, timedelta
from uuid import UUID
import logging
from supabase import Client
from models.campaign import Campaign, Message, MessageStatus, CampaignStatus, ChannelType
from services.whatsapp_service import WhatsAppService
from services.email_service import EmailService
from dependencies import get_supabase

logger = logging.getLogger(__name__)

class RateLimiter:
    """Rate limiter for WhatsApp API calls"""
    
    def __init__(self, max_requests: int = 80, time_window: int = 60):
        self.max_requests = max_requests  # WhatsApp allows 80 requests per minute
        self.time_window = time_window
        self.requests = []
    
    async def acquire(self):
        """Acquire permission to make a request"""
        now = datetime.utcnow()
        
        # Remove old requests outside the time window
        self.requests = [req_time for req_time in self.requests 
                        if (now - req_time).total_seconds() < self.time_window]
        
        # Check if we can make a request
        if len(self.requests) >= self.max_requests:
            # Calculate wait time
            oldest_request = min(self.requests)
            wait_time = self.time_window - (now - oldest_request).total_seconds()
            if wait_time > 0:
                logger.info(f"Rate limit reached, waiting {wait_time:.2f} seconds")
                await asyncio.sleep(wait_time)
                return await self.acquire()
        
        # Record this request
        self.requests.append(now)
        return True

class MessageDispatcher:
    """Service for dispatching messages with rate limiting and retry logic"""
    
    def __init__(self):
        self.supabase: Optional[Client] = None
        self.whatsapp_service = WhatsAppService()
        self.email_service = EmailService()
        self.rate_limiter = RateLimiter()
        self.is_running = False
        self.max_retries = 3
        self.retry_delays = [60, 300, 900]  # 1min, 5min, 15min
    
    def configure_whatsapp(self, access_token: str, phone_number_id: str):
        """Configure WhatsApp service"""
        if not self.supabase:
            self.supabase = get_supabase()
        self.whatsapp_service.configure_client(access_token, phone_number_id)
    
    def configure_email(self, api_key: str):
        """Configure email service"""
        if not self.supabase:
            self.supabase = get_supabase()
        self.email_service.configure_client(api_key)
    
    async def start_campaign(self, campaign_id: UUID, org_id: UUID) -> bool:
        """Start a campaign by updating its status and queuing messages"""
        if not self.supabase:
            self.supabase = get_supabase()
            
        try:
            # Update campaign status to active
            campaign_update = {
                'status': CampaignStatus.ACTIVE.value,
                'started_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table('campaigns').update(campaign_update).eq('id', str(campaign_id)).eq('org_id', str(org_id)).execute()
            
            if not result.data:
                return False
            
            # Queue messages for dispatch
            await self._queue_campaign_messages(campaign_id)
            
            logger.info(f"Campaign {campaign_id} started successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start campaign {campaign_id}: {e}")
            return False
    
    async def stop_campaign(self, campaign_id: UUID, org_id: UUID) -> bool:
        """Stop a campaign by updating its status and cancelling pending messages"""
        if not self.supabase:
            self.supabase = get_supabase()
            
        try:
            # Update campaign status to cancelled
            campaign_update = {
                'status': CampaignStatus.CANCELLED.value,
                'completed_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table('campaigns').update(campaign_update).eq('id', str(campaign_id)).eq('org_id', str(org_id)).execute()
            
            if not result.data:
                return False
            
            # Cancel pending messages
            message_update = {
                'status': MessageStatus.CANCELLED.value,
                'updated_at': datetime.utcnow().isoformat()
            }
            
            self.supabase.table('messages').update(message_update).eq('campaign_id', str(campaign_id)).in_('status', [MessageStatus.PENDING.value, MessageStatus.QUEUED.value]).execute()
            
            logger.info(f"Campaign {campaign_id} stopped successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to stop campaign {campaign_id}: {e}")
            return False
    
    async def pause_campaign(self, campaign_id: UUID, org_id: UUID) -> bool:
        """Pause a campaign by updating its status"""
        if not self.supabase:
            self.supabase = get_supabase()
            
        try:
            campaign_update = {
                'status': CampaignStatus.PAUSED.value,
                'updated_at': datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table('campaigns').update(campaign_update).eq('id', str(campaign_id)).eq('org_id', str(org_id)).execute()
            
            logger.info(f"Campaign {campaign_id} paused successfully")
            return len(result.data) > 0
            
        except Exception as e:
            logger.error(f"Failed to pause campaign {campaign_id}: {e}")
            return False
    
    async def resume_campaign(self, campaign_id: UUID, org_id: UUID) -> bool:
        """Resume a paused campaign"""
        if not self.supabase:
            self.supabase = get_supabase()
            
        try:
            campaign_update = {
                'status': CampaignStatus.ACTIVE.value,
                'updated_at': datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table('campaigns').update(campaign_update).eq('id', str(campaign_id)).eq('org_id', str(org_id)).execute()
            
            logger.info(f"Campaign {campaign_id} resumed successfully")
            return len(result.data) > 0
            
        except Exception as e:
            logger.error(f"Failed to resume campaign {campaign_id}: {e}")
            return False
    
    async def process_message_queue(self):
        """Background task to process queued messages"""
        if self.is_running:
            return
        
        if not self.supabase:
            self.supabase = get_supabase()
            
        self.is_running = True
        logger.info("Message dispatcher started")
        
        try:
            while self.is_running:
                await self._process_pending_messages()
                await asyncio.sleep(10)  # Check every 10 seconds
        except Exception as e:
            logger.error(f"Message dispatcher error: {e}")
        finally:
            self.is_running = False
            logger.info("Message dispatcher stopped")
    
    def stop_dispatcher(self):
        """Stop the message dispatcher"""
        self.is_running = False
    
    async def _queue_campaign_messages(self, campaign_id: UUID):
        """Queue all messages for a campaign"""
        if not self.supabase:
            self.supabase = get_supabase()
            
        # Update pending messages to queued status
        message_update = {
            'status': MessageStatus.QUEUED.value,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        self.supabase.table('messages').update(message_update).eq('campaign_id', str(campaign_id)).eq('status', MessageStatus.PENDING.value).execute()
    
    async def _process_pending_messages(self):
        """Process queued messages that are ready to be sent"""
        if not self.supabase:
            self.supabase = get_supabase()
            
        try:
            # Get messages that are ready to be sent
            now = datetime.utcnow().isoformat()
            
            # Query for queued messages that are scheduled for now or earlier
            messages_result = self.supabase.table('messages').select('*, campaigns!inner(status, channel)').eq('status', MessageStatus.QUEUED.value).lte('scheduled_at', now).limit(10).execute()
            
            if not messages_result.data:
                return
            
            for message_data in messages_result.data:
                campaign_data = message_data['campaigns']
                
                # Skip if campaign is not active
                if campaign_data['status'] != CampaignStatus.ACTIVE.value:
                    continue
                
                message_id = UUID(message_data['id'])
                channel = ChannelType(campaign_data['channel'])
                
                # Apply rate limiting
                await self.rate_limiter.acquire()
                
                # Dispatch message based on channel
                success = await self._dispatch_message(message_id, channel)
                
                if not success:
                    await self._handle_message_failure(message_id)
                
                # Small delay between messages
                await asyncio.sleep(1)
                
        except Exception as e:
            logger.error(f"Error processing pending messages: {e}")
    
    async def _dispatch_message(self, message_id: UUID, channel: ChannelType) -> bool:
        """Dispatch a single message based on its channel"""
        try:
            if channel == ChannelType.WHATSAPP:
                return await self.whatsapp_service.send_message(message_id)
            elif channel == ChannelType.EMAIL:
                return await self.email_service.send_message(message_id)
            elif channel == ChannelType.BOTH:
                # Send via both channels
                whatsapp_success = await self.whatsapp_service.send_message(message_id)
                email_success = await self.email_service.send_message(message_id)
                return whatsapp_success and email_success
            else:
                logger.error(f"Unknown channel type: {channel}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to dispatch message {message_id}: {e}")
            return False
    
    async def _handle_message_failure(self, message_id: UUID):
        """Handle message failure with retry logic"""
        if not self.supabase:
            self.supabase = get_supabase()
            
        try:
            # Get current retry count
            message_result = self.supabase.table('messages').select('retry_count').eq('id', str(message_id)).execute()
            
            if not message_result.data:
                return
            
            retry_count = message_result.data[0].get('retry_count', 0)
            
            if retry_count < self.max_retries:
                # Schedule retry
                retry_delay = self.retry_delays[min(retry_count, len(self.retry_delays) - 1)]
                scheduled_at = datetime.utcnow() + timedelta(seconds=retry_delay)
                
                update_data = {
                    'status': MessageStatus.QUEUED.value,
                    'retry_count': retry_count + 1,
                    'scheduled_at': scheduled_at.isoformat(),
                    'updated_at': datetime.utcnow().isoformat()
                }
                
                self.supabase.table('messages').update(update_data).eq('id', str(message_id)).execute()
                
                logger.info(f"Message {message_id} scheduled for retry {retry_count + 1} in {retry_delay} seconds")
            else:
                # Max retries reached, mark as failed
                update_data = {
                    'status': MessageStatus.FAILED.value,
                    'failed_at': datetime.utcnow().isoformat(),
                    'error_message': 'Max retries exceeded',
                    'updated_at': datetime.utcnow().isoformat()
                }
                
                self.supabase.table('messages').update(update_data).eq('id', str(message_id)).execute()
                
                logger.error(f"Message {message_id} failed after {self.max_retries} retries")
                
        except Exception as e:
            logger.error(f"Error handling message failure for {message_id}: {e}")

# Global dispatcher instance
message_dispatcher = MessageDispatcher()