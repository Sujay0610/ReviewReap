from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum

class ChannelType(str, Enum):
    WHATSAPP = "whatsapp"
    EMAIL = "email"
    BOTH = "both"

class CampaignStatus(str, Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class CampaignBase(BaseModel):
    name: str
    channel: ChannelType
    message_template: str
    ai_enabled: bool = False
    delay_hours: int = 24
    scheduled_at: Optional[datetime] = None

class CampaignCreate(CampaignBase):
    guest_ids: Optional[List[UUID]] = None

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    channel: Optional[ChannelType] = None
    message_template: Optional[str] = None
    ai_enabled: Optional[bool] = None
    delay_hours: Optional[int] = None
    status: Optional[CampaignStatus] = None
    scheduled_at: Optional[datetime] = None

class Campaign(CampaignBase):
    id: UUID
    org_id: UUID
    user_id: UUID
    status: CampaignStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CampaignList(BaseModel):
    campaigns: List[Campaign]
    total: int
    page: int
    per_page: int
    total_pages: int

class CampaignStats(BaseModel):
    total_guests: int
    messages_sent: int
    messages_delivered: int
    messages_read: int
    response_rate: float

class CampaignWithStats(Campaign):
    stats: CampaignStats

# Message models
class MessageStatus(str, Enum):
    PENDING = "pending"
    QUEUED = "queued"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"
    CANCELLED = "cancelled"

class MessageBase(BaseModel):
    content: str
    channel: ChannelType
    scheduled_at: Optional[datetime] = None

class MessageCreate(MessageBase):
    guest_id: UUID
    campaign_id: UUID
    ai_generated: bool = False

class Message(MessageBase):
    id: UUID
    guest_id: UUID
    campaign_id: UUID
    status: MessageStatus
    provider_msg_id: Optional[str] = None
    ai_generated: bool
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class MessagePreview(BaseModel):
    guest_id: UUID
    guest_name: str
    content: str
    channel: ChannelType

class CampaignPreview(BaseModel):
    campaign_id: UUID
    campaign_name: str
    total_messages: int
    messages: List[MessagePreview]