from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import date, datetime
from uuid import UUID

class GuestBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    checkin_date: Optional[date] = None
    checkout_date: Optional[date] = None
    booking_id: Optional[str] = None
    room_type: Optional[str] = None
    google_review_link: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None

class GuestCreate(GuestBase):
    campaign_id: Optional[UUID] = None

class GuestUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    checkin_date: Optional[date] = None
    checkout_date: Optional[date] = None
    booking_id: Optional[str] = None
    room_type: Optional[str] = None
    google_review_link: Optional[str] = None
    campaign_id: Optional[UUID] = None
    meta: Optional[Dict[str, Any]] = None

class Guest(GuestBase):
    id: UUID
    org_id: UUID
    campaign_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class GuestList(BaseModel):
    guests: list[Guest]
    total: int
    page: int
    per_page: int
    total_pages: int