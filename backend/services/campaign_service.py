from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta
import re
from supabase import Client
from models.campaign import (
    Campaign, CampaignCreate, CampaignUpdate, CampaignList, CampaignStats,
    CampaignWithStats, Message, MessageCreate, MessagePreview, CampaignPreview,
    CampaignStatus, ChannelType, MessageStatus
)
from models.guest import Guest
from services.ai_service import ai_service
from dependencies import get_supabase

class CampaignService:
    def __init__(self):
        self.supabase: Client = get_supabase()
    
    async def create_campaign(self, campaign_data: CampaignCreate, org_id: UUID, user_id: UUID) -> Campaign:
        """Create a new campaign"""
        campaign_dict = campaign_data.model_dump(exclude={'guest_ids'})
        campaign_dict.update({
            'org_id': str(org_id),
            'user_id': str(user_id),
            'status': CampaignStatus.DRAFT.value
        })
        
        result = self.supabase.table('campaigns').insert(campaign_dict).execute()
        
        if not result.data:
            raise Exception("Failed to create campaign")
        
        campaign = Campaign(**result.data[0])
        
        # If guest_ids provided, associate guests with campaign
        if campaign_data.guest_ids:
            await self._associate_guests_with_campaign(campaign.id, campaign_data.guest_ids)
        
        return campaign
    
    async def get_campaigns(self, org_id: UUID, page: int = 1, per_page: int = 20) -> CampaignList:
        """Get paginated list of campaigns for an organization"""
        offset = (page - 1) * per_page
        
        # Get total count
        count_result = self.supabase.table('campaigns').select('id', count='exact').eq('org_id', str(org_id)).execute()
        total = count_result.count or 0
        
        # Get campaigns
        result = self.supabase.table('campaigns').select('*').eq('org_id', str(org_id)).order('created_at', desc=True).range(offset, offset + per_page - 1).execute()
        
        campaigns = [Campaign(**row) for row in result.data]
        total_pages = (total + per_page - 1) // per_page
        
        return CampaignList(
            campaigns=campaigns,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
    
    async def get_campaign(self, campaign_id: UUID, org_id: UUID) -> Optional[Campaign]:
        """Get a specific campaign"""
        result = self.supabase.table('campaigns').select('*').eq('id', str(campaign_id)).eq('org_id', str(org_id)).execute()
        
        if not result.data:
            return None
        
        return Campaign(**result.data[0])
    
    async def get_campaign_with_stats(self, campaign_id: UUID, org_id: UUID) -> Optional[CampaignWithStats]:
        """Get campaign with statistics"""
        campaign = await self.get_campaign(campaign_id, org_id)
        if not campaign:
            return None
        
        stats = await self._get_campaign_stats(campaign_id)
        
        return CampaignWithStats(
            **campaign.model_dump(),
            stats=stats
        )
    
    async def update_campaign(self, campaign_id: UUID, campaign_data: CampaignUpdate, org_id: UUID) -> Optional[Campaign]:
        """Update a campaign"""
        update_dict = campaign_data.model_dump(exclude_unset=True)
        update_dict['updated_at'] = datetime.utcnow().isoformat()
        
        result = self.supabase.table('campaigns').update(update_dict).eq('id', str(campaign_id)).eq('org_id', str(org_id)).execute()
        
        if not result.data:
            return None
        
        return Campaign(**result.data[0])
    
    async def delete_campaign(self, campaign_id: UUID, org_id: UUID) -> bool:
        """Delete a campaign"""
        result = self.supabase.table('campaigns').delete().eq('id', str(campaign_id)).eq('org_id', str(org_id)).execute()
        return len(result.data) > 0
    
    async def preview_campaign_messages(self, campaign_id: UUID, org_id: UUID) -> CampaignPreview:
        """Preview messages that will be generated for a campaign"""
        campaign = await self.get_campaign(campaign_id, org_id)
        if not campaign:
            raise Exception("Campaign not found")
        
        # Get guests associated with this campaign
        guests_result = self.supabase.table('guests').select('*').eq('campaign_id', str(campaign_id)).execute()
        guests = [Guest(**row) for row in guests_result.data]
        
        messages = []
        for guest in guests:
            content = await self._generate_message_content(campaign.message_template, guest, campaign.ai_enabled)
            messages.append(MessagePreview(
                guest_id=guest.id,
                guest_name=guest.name,
                content=content,
                channel=campaign.channel
            ))
        
        return CampaignPreview(
            campaign_id=campaign.id,
            campaign_name=campaign.name,
            total_messages=len(messages),
            messages=messages
        )
    
    async def _associate_guests_with_campaign(self, campaign_id: UUID, guest_ids: List[UUID]):
        """Associate guests with a campaign"""
        for guest_id in guest_ids:
            self.supabase.table('guests').update({'campaign_id': str(campaign_id)}).eq('id', str(guest_id)).execute()
    
    async def _get_campaign_stats(self, campaign_id: UUID) -> CampaignStats:
        """Get statistics for a campaign"""
        # Get total guests
        guests_result = self.supabase.table('guests').select('id', count='exact').eq('campaign_id', str(campaign_id)).execute()
        total_guests = guests_result.count or 0
        
        # Get message statistics
        messages_result = self.supabase.table('messages').select('status').eq('campaign_id', str(campaign_id)).execute()
        
        messages_sent = 0
        messages_delivered = 0
        messages_read = 0
        
        for message in messages_result.data:
            status = message['status']
            if status in ['sent', 'delivered', 'read']:
                messages_sent += 1
            if status in ['delivered', 'read']:
                messages_delivered += 1
            if status == 'read':
                messages_read += 1
        
        response_rate = (messages_read / messages_sent * 100) if messages_sent > 0 else 0.0
        
        return CampaignStats(
            total_guests=total_guests,
            messages_sent=messages_sent,
            messages_delivered=messages_delivered,
            messages_read=messages_read,
            response_rate=response_rate
        )
    
    async def _generate_message_content(self, template: str, guest: Guest, ai_enabled: bool = False) -> str:
        """Generate message content from template and guest data"""
        if ai_enabled:
            try:
                # Use AI service to generate personalized message
                ai_content = await ai_service.generate_personalized_message(guest, "review_request")
                return ai_content
            except Exception as e:
                # Fall back to template interpolation if AI fails
                print(f"AI generation failed, falling back to template: {e}")
        
        # Template variable interpolation
        content = template
        
        # Define template variables
        variables = {
            'name': guest.name or 'Guest',
            'room_type': guest.room_type or 'Room',
            'checkin_date': guest.checkin_date.strftime('%B %d, %Y') if guest.checkin_date else 'your stay',
            'checkout_date': guest.checkout_date.strftime('%B %d, %Y') if guest.checkout_date else 'your departure',
            'booking_id': guest.booking_id or 'your booking',
            'review_link': guest.google_review_link or 'https://g.page/r/your-hotel-review'
        }
        
        # Replace template variables
        for key, value in variables.items():
            content = content.replace(f'{{{{{key}}}}}', str(value))
        
        return content
    
    def get_template_variables(self) -> List[Dict[str, str]]:
        """Get list of available template variables"""
        return [
            {'variable': '{{name}}', 'description': 'Guest name'},
            {'variable': '{{room_type}}', 'description': 'Room type'},
            {'variable': '{{checkin_date}}', 'description': 'Check-in date'},
            {'variable': '{{checkout_date}}', 'description': 'Check-out date'},
            {'variable': '{{booking_id}}', 'description': 'Booking reference'},
            {'variable': '{{review_link}}', 'description': 'Google review link'}
        ]
    
    async def create_messages_for_campaign(self, campaign_id: UUID, org_id: UUID) -> List[Message]:
        """Create messages for all guests in a campaign"""
        campaign = await self.get_campaign(campaign_id, org_id)
        if not campaign:
            raise Exception("Campaign not found")
        
        # Get guests associated with this campaign
        guests_result = self.supabase.table('guests').select('*').eq('campaign_id', str(campaign_id)).execute()
        guests = [Guest(**row) for row in guests_result.data]
        
        messages = []
        for guest in guests:
            content = await self._generate_message_content(campaign.message_template, guest, campaign.ai_enabled)
            
            # Calculate scheduled time based on checkout date and delay
            scheduled_at = None
            if guest.checkout_date and campaign.delay_hours:
                scheduled_at = datetime.combine(guest.checkout_date, datetime.min.time()) + timedelta(hours=campaign.delay_hours)
            
            message_data = MessageCreate(
                guest_id=guest.id,
                campaign_id=campaign.id,
                content=content,
                channel=campaign.channel,
                scheduled_at=scheduled_at,
                ai_generated=campaign.ai_enabled
            )
            
            message_dict = message_data.model_dump()
            message_dict['status'] = MessageStatus.PENDING.value
            
            result = self.supabase.table('messages').insert(message_dict).execute()
            
            if result.data:
                messages.append(Message(**result.data[0]))
        
        return messages