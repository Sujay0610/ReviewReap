from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum

class ReviewSource(str, Enum):
    GOOGLE = "google"
    BOOKING = "booking"
    TRIPADVISOR = "tripadvisor"
    MAKEMYTRIP = "makemytrip"
    MANUAL = "manual"

class ReviewBase(BaseModel):
    rating: int
    text: Optional[str] = None
    author_name: Optional[str] = None
    review_date: Optional[datetime] = None
    source: ReviewSource = ReviewSource.GOOGLE

class ReviewCreate(ReviewBase):
    guest_id: Optional[UUID] = None
    google_review_id: Optional[str] = None

class ReviewUpdate(BaseModel):
    rating: Optional[int] = None
    text: Optional[str] = None
    author_name: Optional[str] = None
    review_date: Optional[datetime] = None
    response_text: Optional[str] = None
    response_date: Optional[datetime] = None

class Review(ReviewBase):
    id: UUID
    guest_id: Optional[UUID] = None
    google_review_id: Optional[str] = None
    response_text: Optional[str] = None
    response_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ReviewList(BaseModel):
    reviews: List[Review]
    total: int
    page: int
    per_page: int
    total_pages: int

class ReviewAnalytics(BaseModel):
    total_reviews: int
    average_rating: float
    rating_distribution: dict[int, int]  # rating -> count
    recent_reviews: List[Review]
    response_rate: float
    avg_response_time_hours: Optional[float] = None

# Google Business Profile models
class GoogleBusinessProfileBase(BaseModel):
    place_id: str
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None

class GoogleBusinessProfileCreate(GoogleBusinessProfileBase):
    pass

class GoogleBusinessProfileUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    last_synced_at: Optional[datetime] = None

class GoogleBusinessProfile(GoogleBusinessProfileBase):
    id: UUID
    org_id: UUID
    rating: Optional[float] = None
    review_count: Optional[int] = None
    last_synced_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class GoogleBusinessProfileList(BaseModel):
    profiles: List[GoogleBusinessProfile]
    total: int

# Review response models
class ReviewResponseCreate(BaseModel):
    response_text: str
    review_id: UUID

class ReviewResponseGenerate(BaseModel):
    review_id: UUID
    tone: Optional[str] = "professional"  # professional, friendly, apologetic
    include_contact: bool = False

# Google API connection models
class GoogleAPIConfig(BaseModel):
    api_key: str
    place_id: str

class GoogleConnectionStatus(BaseModel):
    connected: bool
    place_id: Optional[str] = None
    business_name: Optional[str] = None
    last_sync: Optional[datetime] = None
    error_message: Optional[str] = None