from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from datetime import date, datetime
from uuid import UUID

class CustomerBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    customer_id: Optional[str] = None  # Generic customer/order/transaction ID
    service_date: Optional[date] = None  # Generic service/purchase/interaction date
    google_review_link: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None

class CustomerCreate(CustomerBase):
    campaign_id: Optional[UUID] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    customer_id: Optional[str] = None
    service_date: Optional[date] = None
    google_review_link: Optional[str] = None
    campaign_id: Optional[UUID] = None
    meta: Optional[Dict[str, Any]] = None

class Customer(CustomerBase):
    id: UUID
    org_id: UUID
    campaign_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CustomerList(BaseModel):
    customers: list[Customer]
    total: int
    page: int
    per_page: int
    total_pages: int