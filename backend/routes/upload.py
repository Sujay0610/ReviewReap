from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List, Dict
from uuid import UUID
import json
from models.upload_job import UploadJob, CSVPreview, ColumnMappingRequest
from services.upload_service import UploadService
from services.auth_service import get_current_user
from dependencies import get_supabase
from supabase import Client

router = APIRouter(prefix="/upload", tags=["upload"])

def get_upload_service(supabase: Client = Depends(get_supabase)) -> UploadService:
    return UploadService(supabase)

@router.post("/csv/preview", response_model=CSVPreview)
async def preview_csv(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user),
    upload_service: UploadService = Depends(get_upload_service)
):
    """Preview CSV file and return headers and sample rows"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    try:
        content = await file.read()
        preview = upload_service.parse_csv_preview(content)
        return preview
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        await file.close()

@router.post("/csv/upload", response_model=UploadJob)
async def upload_csv(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user),
    upload_service: UploadService = Depends(get_upload_service)
):
    """Upload CSV file and create upload job"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    try:
        # Create upload job
        job = await upload_service.create_upload_job(file.filename, current_user.id)
        return job
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        await file.close()

@router.post("/csv/process/{job_id}", response_model=UploadJob)
async def process_csv(
    job_id: UUID,
    file: UploadFile = File(...),
    column_mapping: str = Form(...),
    current_user = Depends(get_current_user),
    upload_service: UploadService = Depends(get_upload_service)
):
    """Process CSV file with column mapping"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    try:
        # Parse column mapping from JSON string
        mapping = json.loads(column_mapping)
        
        # Read file content
        content = await file.read()
        
        # Process CSV with mapping
        job = await upload_service.process_csv_with_mapping(
            job_id, content, mapping, current_user.id
        )
        return job
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid column mapping format")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        await file.close()

@router.get("/jobs", response_model=List[UploadJob])
async def get_upload_jobs(
    current_user = Depends(get_current_user),
    upload_service: UploadService = Depends(get_upload_service)
):
    """Get all upload jobs for the current user's organization"""
    try:
        return await upload_service.get_upload_jobs(current_user.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/jobs/{job_id}", response_model=UploadJob)
async def get_upload_job(
    job_id: UUID,
    current_user = Depends(get_current_user),
    upload_service: UploadService = Depends(get_upload_service)
):
    """Get a specific upload job by ID"""
    job = await upload_service.get_upload_job(job_id, current_user.id)
    if not job:
        raise HTTPException(status_code=404, detail="Upload job not found")
    return job

# Helper endpoint to get available customer fields for column mapping
@router.get("/customer-fields")
async def get_customer_fields():
    """Get available customer fields for column mapping"""
    return {
        "fields": [
            {"key": "name", "label": "Name", "required": True},
            {"key": "phone", "label": "Phone", "required": False},
            {"key": "email", "label": "Email", "required": False},
            {"key": "customer_id", "label": "Customer/Order ID", "required": False},
            {"key": "service_date", "label": "Service/Purchase Date", "required": False},
            {"key": "google_review_link", "label": "Google Review Link", "required": False},
            {"key": "ignore", "label": "Ignore Column", "required": False}
        ]
    }