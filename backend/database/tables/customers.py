from sqlalchemy import Column, String, DateTime, Date, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.base import Base
import uuid

class CustomerTable(Base):
    __tablename__ = "customers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("orgs.id"), nullable=False)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    customer_id = Column(String, nullable=True)  # Generic customer/order/transaction ID
    service_date = Column(Date, nullable=True)  # Generic service/purchase/interaction date
    google_review_link = Column(String, nullable=True)
    meta = Column(JSONB, nullable=True)
    is_valid = Column(String, default='true', nullable=False)
    validation_errors = Column(JSONB, default=lambda: [], nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    campaign = relationship("CampaignTable", back_populates="customers")
    conversations = relationship("ConversationTable", back_populates="customer")
    # messages = relationship("MessageTable", back_populates="customer")
    # reviews = relationship("ReviewTable", back_populates="customer")
    # ai_responses = relationship("AIResponseTable", back_populates="customer")