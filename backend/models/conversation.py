from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from enum import Enum

class ConversationStatus(str, Enum):
    ACTIVE = "active"
    RESOLVED = "resolved"
    ESCALATED = "escalated"

class MessageSender(str, Enum):
    GUEST = "guest"
    SYSTEM = "system"
    AGENT = "agent"

class SentimentType(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"

class MessageType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    DOCUMENT = "document"

class ConversationMessageBase(BaseModel):
    conversation_id: UUID
    sender: MessageSender
    content: str
    message_type: MessageType = MessageType.TEXT
    sentiment: Optional[SentimentType] = None
    is_automated: bool = False

class ConversationMessageCreate(ConversationMessageBase):
    pass

class ConversationMessage(ConversationMessageBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class ConversationBase(BaseModel):
    guest_id: UUID
    campaign_id: Optional[UUID] = None
    channel: str  # 'whatsapp', 'email'
    status: ConversationStatus = ConversationStatus.ACTIVE
    sentiment: Optional[SentimentType] = None

class ConversationCreate(ConversationBase):
    pass

class ConversationUpdate(BaseModel):
    status: Optional[ConversationStatus] = None
    sentiment: Optional[SentimentType] = None

class Conversation(ConversationBase):
    id: UUID
    last_message_at: Optional[datetime] = None
    created_at: datetime
    messages: List[ConversationMessage] = []

    class Config:
        from_attributes = True

class ConversationList(BaseModel):
    conversations: List[Conversation]
    total: int
    page: int
    per_page: int
    total_pages: int

class SentimentAnalysisResult(BaseModel):
    sentiment: SentimentType
    confidence: float = Field(ge=0.0, le=1.0)
    intent: str
    requires_human: bool

class AutoResponseRequest(BaseModel):
    guest_message: str
    sentiment: SentimentType
    guest_data: dict
    conversation_id: UUID

class AutoResponseResult(BaseModel):
    response: str
    should_send: bool
    escalate: bool = False