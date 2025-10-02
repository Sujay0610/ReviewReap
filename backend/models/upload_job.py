from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID
from enum import Enum

class UploadStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class UploadJobBase(BaseModel):
    filename: str
    status: UploadStatus = UploadStatus.PENDING
    total_rows: Optional[int] = None
    processed_rows: int = 0
    errors: Optional[List[Dict[str, Any]]] = None
    column_mapping: Optional[Dict[str, str]] = None

class UploadJobCreate(UploadJobBase):
    pass

class UploadJobUpdate(BaseModel):
    status: Optional[UploadStatus] = None
    total_rows: Optional[int] = None
    processed_rows: Optional[int] = None
    errors: Optional[List[Dict[str, Any]]] = None
    column_mapping: Optional[Dict[str, str]] = None

class UploadJob(UploadJobBase):
    id: UUID
    org_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ColumnMappingRequest(BaseModel):
    column_mapping: Dict[str, str]
    
class CSVPreview(BaseModel):
    headers: List[str]
    sample_rows: List[List[str]]
    total_rows: int