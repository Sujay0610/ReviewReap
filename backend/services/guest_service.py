from typing import List, Optional
from uuid import UUID
from supabase import Client
from models.guest import Guest, GuestCreate, GuestUpdate, GuestList
from services.auth_service import get_current_user_org_id

class GuestService:
    def __init__(self, supabase: Client):
        self.supabase = supabase
    
    async def create_guest(self, guest_data: GuestCreate, user_id: str) -> Guest:
        """Create a new guest"""
        print(f"Getting org_id for user: {user_id}")
        org_id = await get_current_user_org_id(self.supabase, user_id)
        print(f"Found org_id: {org_id}")
        
        guest_dict = guest_data.model_dump(exclude_unset=True)
        guest_dict['org_id'] = str(org_id)
        print(f"Guest dict to insert: {guest_dict}")
        
        result = self.supabase.table('guests').insert(guest_dict).execute()
        print(f"Insert result: {result}")
        
        if not result.data:
            print(f"Insert failed - no data returned")
            raise Exception("Failed to create guest")
        
        print(f"Guest created: {result.data[0]}")
        return Guest(**result.data[0])
    
    async def get_guests(self, user_id: str, page: int = 1, per_page: int = 50, 
                        search: Optional[str] = None) -> GuestList:
        """Get paginated list of guests for the user's organization"""
        org_id = await get_current_user_org_id(self.supabase, user_id)
        
        query = self.supabase.table('guests').select('*').eq('org_id', str(org_id))
        
        # Add search filter if provided
        if search:
            query = query.or_(f'name.ilike.%{search}%,email.ilike.%{search}%,phone.ilike.%{search}%')
        
        # Get total count
        count_result = query.execute()
        total = len(count_result.data) if count_result.data else 0
        
        # Apply pagination
        offset = (page - 1) * per_page
        result = query.range(offset, offset + per_page - 1).order('created_at', desc=True).execute()
        
        guests = [Guest(**guest) for guest in result.data] if result.data else []
        
        return GuestList(
            guests=guests,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=(total + per_page - 1) // per_page
        )
    
    async def get_guest(self, guest_id: UUID, user_id: str) -> Optional[Guest]:
        """Get a specific guest by ID"""
        org_id = await get_current_user_org_id(self.supabase, user_id)
        
        result = self.supabase.table('guests').select('*').eq('id', str(guest_id)).eq('org_id', str(org_id)).execute()
        
        if not result.data:
            return None
        
        return Guest(**result.data[0])
    
    async def update_guest(self, guest_id: UUID, guest_data: GuestUpdate, user_id: str) -> Optional[Guest]:
        """Update a guest"""
        org_id = await get_current_user_org_id(self.supabase, user_id)
        
        update_dict = guest_data.model_dump(exclude_unset=True)
        if not update_dict:
            # No fields to update
            return await self.get_guest(guest_id, user_id)
        
        result = self.supabase.table('guests').update(update_dict).eq('id', str(guest_id)).eq('org_id', str(org_id)).execute()
        
        if not result.data:
            return None
        
        return Guest(**result.data[0])
    
    async def delete_guest(self, guest_id: UUID, user_id: str) -> bool:
        """Delete a guest"""
        org_id = await get_current_user_org_id(self.supabase, user_id)
        
        result = self.supabase.table('guests').delete().eq('id', str(guest_id)).eq('org_id', str(org_id)).execute()
        
        return len(result.data) > 0 if result.data else False
    
    async def bulk_create_guests(self, guests_data: List[GuestCreate], user_id: str) -> List[Guest]:
        """Create multiple guests at once"""
        org_id = await get_current_user_org_id(self.supabase, user_id)
        
        guests_list = []
        for guest_data in guests_data:
            guest_dict = guest_data.model_dump(exclude_unset=True)
            guest_dict['org_id'] = str(org_id)
            guests_list.append(guest_dict)
        
        result = self.supabase.table('guests').insert(guests_list).execute()
        
        if not result.data:
            raise Exception("Failed to create guests")
        
        return [Guest(**guest) for guest in result.data]