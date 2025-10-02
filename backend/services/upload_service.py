import csv
import io
from typing import List, Dict, Any, Optional
from uuid import UUID
from supabase import Client
from models.upload_job import UploadJob, UploadJobCreate, UploadJobUpdate, UploadStatus, CSVPreview
from models.customer import CustomerCreate
from services.auth_service import get_current_user_org_id
from services.customer_service import CustomerService
from datetime import datetime

class UploadService:
    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.customer_service = CustomerService(supabase)
    
    async def create_upload_job(self, filename: str, user_id: str) -> UploadJob:
        """Create a new upload job"""
        org_id = await get_current_user_org_id(self.supabase, user_id)
        
        job_data = UploadJobCreate(filename=filename)
        job_dict = job_data.model_dump()
        job_dict['org_id'] = str(org_id)
        
        result = self.supabase.table('upload_jobs').insert(job_dict).execute()
        
        if not result.data:
            raise Exception("Failed to create upload job")
        
        return UploadJob(**result.data[0])
    
    async def get_upload_jobs(self, user_id: str) -> List[UploadJob]:
        """Get all upload jobs for the user's organization"""
        org_id = await get_current_user_org_id(self.supabase, user_id)
        
        result = self.supabase.table('upload_jobs').select('*').eq('org_id', str(org_id)).order('created_at', desc=True).execute()
        
        return [UploadJob(**job) for job in result.data] if result.data else []
    
    async def get_upload_job(self, job_id: UUID, user_id: str) -> Optional[UploadJob]:
        """Get a specific upload job by ID"""
        org_id = await get_current_user_org_id(self.supabase, user_id)
        
        result = self.supabase.table('upload_jobs').select('*').eq('id', str(job_id)).eq('org_id', str(org_id)).execute()
        
        if not result.data:
            return None
        
        return UploadJob(**result.data[0])
    
    async def update_upload_job(self, job_id: UUID, job_data: UploadJobUpdate, user_id: str) -> Optional[UploadJob]:
        """Update an upload job"""
        org_id = await get_current_user_org_id(self.supabase, user_id)
        
        update_dict = job_data.model_dump(exclude_unset=True)
        if not update_dict:
            return await self.get_upload_job(job_id, user_id)
        
        update_dict['updated_at'] = datetime.utcnow().isoformat()
        
        result = self.supabase.table('upload_jobs').update(update_dict).eq('id', str(job_id)).eq('org_id', str(org_id)).execute()
        
        if not result.data:
            return None
        
        return UploadJob(**result.data[0])
    
    def parse_csv_preview(self, file_content: bytes, max_preview_rows: int = 5) -> CSVPreview:
        """Parse CSV file and return preview with headers and sample rows"""
        try:
            # Decode the file content
            content = file_content.decode('utf-8')
            csv_reader = csv.reader(io.StringIO(content))
            
            # Get headers
            headers = next(csv_reader)
            
            # Get sample rows
            sample_rows = []
            total_rows = 0
            
            for i, row in enumerate(csv_reader):
                total_rows += 1
                if i < max_preview_rows:
                    sample_rows.append(row)
            
            return CSVPreview(
                headers=headers,
                sample_rows=sample_rows,
                total_rows=total_rows
            )
        except Exception as e:
            raise Exception(f"Failed to parse CSV: {str(e)}")
    
    async def process_csv_with_mapping(self, job_id: UUID, file_content: bytes, 
                                     column_mapping: Dict[str, str], user_id: str) -> UploadJob:
        """Process CSV file with column mapping and create customers"""
        job = await self.get_upload_job(job_id, user_id)
        if not job:
            raise Exception("Upload job not found")
        
        # Update job status to processing
        await self.update_upload_job(job_id, UploadJobUpdate(
            status=UploadStatus.PROCESSING,
            column_mapping=column_mapping
        ), user_id)
        
        try:
            # Parse CSV
            content = file_content.decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(content))
            
            customers_to_create = []
            errors = []
            total_rows = 0
            processed_rows = 0
            
            for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 because row 1 is headers
                total_rows += 1
                try:
                    # Map CSV columns to customer fields
                    customer_data = {}
                    for csv_col, customer_field in column_mapping.items():
                        if csv_col in row and customer_field != 'ignore':
                            value = row[csv_col].strip() if row[csv_col] else None
                            if value:
                                # Handle date fields
                                if customer_field == 'service_date':
                                    try:
                                        # Try to parse date (assuming YYYY-MM-DD format)
                                        datetime.strptime(value, '%Y-%m-%d')
                                        customer_data[customer_field] = value
                                    except ValueError:
                                        # Try other common date formats
                                        try:
                                            parsed_date = datetime.strptime(value, '%m/%d/%Y')
                                            customer_data[customer_field] = parsed_date.strftime('%Y-%m-%d')
                                        except ValueError:
                                            errors.append({
                                                'row': row_num,
                                                'field': customer_field,
                                                'value': value,
                                                'error': 'Invalid date format'
                                            })
                                            continue
                                else:
                                    customer_data[customer_field] = value
                    
                    # Validate required fields
                    if 'name' not in customer_data or not customer_data['name']:
                        errors.append({
                            'row': row_num,
                            'error': 'Name is required'
                        })
                        continue
                    
                    customers_to_create.append(CustomerCreate(**customer_data))
                    processed_rows += 1
                    
                except Exception as e:
                    errors.append({
                        'row': row_num,
                        'error': str(e)
                    })
            
            # Create customers in batches
            if customers_to_create:
                try:
                    await self.customer_service.bulk_create_customers(customers_to_create, user_id)
                except Exception as e:
                    errors.append({
                        'error': f'Failed to create customers: {str(e)}'
                    })
            
            # Update job with final status
            final_status = UploadStatus.COMPLETED if not errors else UploadStatus.FAILED
            return await self.update_upload_job(job_id, UploadJobUpdate(
                status=final_status,
                total_rows=total_rows,
                processed_rows=processed_rows,
                errors=errors if errors else None
            ), user_id)
            
        except Exception as e:
            # Update job status to failed
            return await self.update_upload_job(job_id, UploadJobUpdate(
                status=UploadStatus.FAILED,
                errors=[{'error': str(e)}]
            ), user_id)