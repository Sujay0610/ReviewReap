from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from uuid import UUID
from models.customer import Customer, CustomerCreate, CustomerUpdate, CustomerList
from services.customer_service import CustomerService
from services.auth_service import get_current_user
from dependencies import get_supabase
from supabase import Client

router = APIRouter(prefix="/customers", tags=["customers"])

def get_customer_service(supabase: Client = Depends(get_supabase)) -> CustomerService:
    return CustomerService(supabase)

@router.post("/", response_model=Customer, status_code=201)
async def create_customer(
    customer_data: CustomerCreate,
    current_user = Depends(get_current_user),
    customer_service: CustomerService = Depends(get_customer_service)
):
    """Create a new customer"""
    try:
        print(f"Creating customer for user: {current_user.id}")
        print(f"Customer data: {customer_data}")
        result = await customer_service.create_customer(customer_data, current_user.id)
        print(f"Customer created successfully: {result}")
        return result
    except Exception as e:
        print(f"Error creating customer: {str(e)}")
        print(f"Error type: {type(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=CustomerList)
async def get_customers(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    current_user = Depends(get_current_user),
    customer_service: CustomerService = Depends(get_customer_service)
):
    """Get paginated list of customers"""
    try:
        return await customer_service.get_customers(current_user.id, page, per_page, search)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{customer_id}", response_model=Customer)
async def get_customer(
    customer_id: UUID,
    current_user = Depends(get_current_user),
    customer_service: CustomerService = Depends(get_customer_service)
):
    """Get a specific customer by ID"""
    customer = await customer_service.get_customer(customer_id, current_user.id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.put("/{customer_id}", response_model=Customer)
async def update_customer(
    customer_id: UUID,
    customer_data: CustomerUpdate,
    current_user = Depends(get_current_user),
    customer_service: CustomerService = Depends(get_customer_service)
):
    """Update a customer"""
    customer = await customer_service.update_customer(customer_id, customer_data, current_user.id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: UUID,
    current_user = Depends(get_current_user),
    customer_service: CustomerService = Depends(get_customer_service)
):
    """Delete a customer"""
    success = await customer_service.delete_customer(customer_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted successfully"}