from typing import List, Optional
from uuid import UUID
from supabase import Client
from models.customer import Customer, CustomerCreate, CustomerUpdate, CustomerList
from services.auth_service import get_current_user_org_id

class CustomerService:
    def __init__(self, supabase: Client):
        self.supabase = supabase
    
    async def create_customer(self, customer_data: CustomerCreate, user_id: str) -> Customer:
        """Create a new customer"""
        print(f"Getting org_id for user: {user_id}")
        org_id = await get_current_user_org_id(self.supabase, user_id)
        print(f"Found org_id: {org_id}")
        
        customer_dict = customer_data.model_dump(exclude_unset=True)
        customer_dict['org_id'] = str(org_id)
        print(f"Customer dict to insert: {customer_dict}")
        
        result = self.supabase.table('customers').insert(customer_dict).execute()
        print(f"Insert result: {result}")
        
        if not result.data:
            print(f"Insert failed - no data returned")
            raise Exception("Failed to create customer")
        
        print(f"Customer created: {result.data[0]}")
        return Customer(**result.data[0])
    
    async def get_customers(self, user_id: str, page: int = 1, per_page: int = 50, 
                        search: Optional[str] = None) -> CustomerList:
        """Get paginated list of customers for the user's organization"""
        org_id = await get_current_user_org_id(self.supabase, user_id)
        
        query = self.supabase.table('customers').select('*').eq('org_id', str(org_id))
        
        # Add search filter if provided
        if search:
            query = query.or_(f'name.ilike.%{search}%,email.ilike.%{search}%,phone.ilike.%{search}%')
        
        # Get total count
        count_result = query.execute()
        total = len(count_result.data) if count_result.data else 0
        
        # Apply pagination
        offset = (page - 1) * per_page
        result = query.range(offset, offset + per_page - 1).order('created_at', desc=True).execute()
        
        customers = [Customer(**customer) for customer in result.data] if result.data else []
        
        return CustomerList(
            customers=customers,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=(total + per_page - 1) // per_page
        )
    
    async def get_customer(self, customer_id: UUID, user_id: str) -> Optional[Customer]:
        """Get a specific customer by ID"""
        org_id = await get_current_user_org_id(self.supabase, user_id)
        
        result = self.supabase.table('customers').select('*').eq('id', str(customer_id)).eq('org_id', str(org_id)).execute()
        
        if not result.data:
            return None
        
        return Customer(**result.data[0])
    
    async def update_customer(self, customer_id: UUID, customer_data: CustomerUpdate, user_id: str) -> Optional[Customer]:
        """Update a customer"""
        org_id = await get_current_user_org_id(self.supabase, user_id)
        
        update_dict = customer_data.model_dump(exclude_unset=True)
        if not update_dict:
            # No fields to update
            return await self.get_customer(customer_id, user_id)
        
        result = self.supabase.table('customers').update(update_dict).eq('id', str(customer_id)).eq('org_id', str(org_id)).execute()
        
        if not result.data:
            return None
        
        return Customer(**result.data[0])
    
    async def delete_customer(self, customer_id: UUID, user_id: str) -> bool:
        """Delete a customer"""
        org_id = await get_current_user_org_id(self.supabase, user_id)
        
        result = self.supabase.table('customers').delete().eq('id', str(customer_id)).eq('org_id', str(org_id)).execute()
        
        return len(result.data) > 0 if result.data else False
    
    async def bulk_create_customers(self, customers_data: List[CustomerCreate], user_id: str) -> List[Customer]:
        """Create multiple customers at once"""
        org_id = await get_current_user_org_id(self.supabase, user_id)
        
        customers_list = []
        for customer_data in customers_data:
            customer_dict = customer_data.model_dump(exclude_unset=True)
            customer_dict['org_id'] = str(org_id)
            customers_list.append(customer_dict)
        
        result = self.supabase.table('customers').insert(customers_list).execute()
        
        if not result.data:
            raise Exception("Failed to create customers")
        
        return [Customer(**customer) for customer in result.data]