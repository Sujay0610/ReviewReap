from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from uuid import UUID
from models.guest import Guest, GuestCreate, GuestUpdate, GuestList
from services.guest_service import GuestService
from services.auth_service import get_current_user
from dependencies import get_supabase
from supabase import Client

router = APIRouter(prefix="/guests", tags=["guests"])

def get_guest_service(supabase: Client = Depends(get_supabase)) -> GuestService:
    return GuestService(supabase)

@router.post("/", response_model=Guest, status_code=201)
async def create_guest(
    guest_data: GuestCreate,
    current_user = Depends(get_current_user),
    guest_service: GuestService = Depends(get_guest_service)
):
    """Create a new guest"""
    try:
        print(f"Creating guest for user: {current_user.id}")
        print(f"Guest data: {guest_data}")
        result = await guest_service.create_guest(guest_data, current_user.id)
        print(f"Guest created successfully: {result}")
        return result
    except Exception as e:
        print(f"Error creating guest: {str(e)}")
        print(f"Error type: {type(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=GuestList)
async def get_guests(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    current_user = Depends(get_current_user),
    guest_service: GuestService = Depends(get_guest_service)
):
    """Get paginated list of guests"""
    try:
        return await guest_service.get_guests(current_user.id, page, per_page, search)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{guest_id}", response_model=Guest)
async def get_guest(
    guest_id: UUID,
    current_user = Depends(get_current_user),
    guest_service: GuestService = Depends(get_guest_service)
):
    """Get a specific guest by ID"""
    guest = await guest_service.get_guest(guest_id, current_user.id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    return guest

@router.put("/{guest_id}", response_model=Guest)
async def update_guest(
    guest_id: UUID,
    guest_data: GuestUpdate,
    current_user = Depends(get_current_user),
    guest_service: GuestService = Depends(get_guest_service)
):
    """Update a guest"""
    guest = await guest_service.update_guest(guest_id, guest_data, current_user.id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    return guest

@router.delete("/{guest_id}")
async def delete_guest(
    guest_id: UUID,
    current_user = Depends(get_current_user),
    guest_service: GuestService = Depends(get_guest_service)
):
    """Delete a guest"""
    success = await guest_service.delete_guest(guest_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Guest not found")
    return {"message": "Guest deleted successfully"}