from sqlalchemy import Column, String, DateTime, Date, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.base import Base
import uuid

class GuestTable(Base):
    __tablename__ = "guests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("orgs.id"), nullable=False)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    checkin_date = Column(Date, nullable=True)
    checkout_date = Column(Date, nullable=True)
    booking_id = Column(String, nullable=True)
    room_type = Column(String, nullable=True)
    google_review_link = Column(String, nullable=True)
    meta = Column(JSONB, nullable=True)
    is_valid = Column(String, default='true', nullable=False)
    validation_errors = Column(JSONB, default=lambda: [], nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    campaign = relationship("CampaignTable", back_populates="guests")
    conversations = relationship("ConversationTable", back_populates="guest")
    # messages = relationship("MessageTable", back_populates="guest")
    # reviews = relationship("ReviewTable", back_populates="guest")
    # ai_responses = relationship("AIResponseTable", back_populates="guest")

class CampaignTable(Base):
    __tablename__ = "campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("orgs.id"), nullable=False)
    name = Column(String, nullable=False)
    channel = Column(String, nullable=False)  # 'whatsapp', 'email', 'both'
    message_template = Column(Text, nullable=False)
    ai_enabled = Column(String, default='false', nullable=False)
    delay_hours = Column(String, default='24', nullable=False)
    status = Column(String, default='draft', nullable=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    guests = relationship("GuestTable", back_populates="campaign")
    conversations = relationship("ConversationTable", back_populates="campaign")
    # messages = relationship("MessageTable", back_populates="campaign")