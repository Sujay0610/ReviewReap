import httpx
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime, timezone, timedelta
from uuid import UUID
from supabase import Client
from dependencies import get_supabase
from models.review import Review, ReviewCreate, GoogleBusinessProfile, GoogleBusinessProfileCreate
from services.ai_service import AIService

logger = logging.getLogger(__name__)

class GoogleReviewsService:
    def __init__(self, ai_service: AIService):
        self.supabase = get_supabase()
        self.ai_service = ai_service
        self.base_url = "https://maps.googleapis.com/maps/api/place"
        
    async def configure_google_api(self, org_id: UUID, api_key: str, place_id: str) -> Dict[str, Any]:
        """Configure Google API credentials for an organization"""
        try:
            # Validate the API key and place_id by making a test request
            business_info = await self._get_place_details(api_key, place_id)
            
            if not business_info:
                return {"success": False, "error": "Invalid API key or Place ID"}
            
            # Update organization with Google API credentials
            result = self.supabase.table("orgs").update({
                "google_api_key": api_key,
                "google_place_id": place_id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", str(org_id)).execute()
            
            if result.data:
                # Create or update Google Business Profile
                await self._create_or_update_business_profile(org_id, place_id, business_info)
                return {"success": True, "business_info": business_info}
            else:
                return {"success": False, "error": "Failed to update organization"}
                
        except Exception as e:
            logger.error(f"Error configuring Google API: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_connection_status(self, org_id: UUID) -> Dict[str, Any]:
        """Get Google API connection status for an organization"""
        try:
            # Get organization data
            org_result = self.supabase.table("orgs").select(
                "google_api_key, google_place_id"
            ).eq("id", str(org_id)).execute()
            
            if not org_result.data:
                return {"connected": False, "error": "Organization not found"}
            
            org_data = org_result.data[0]
            api_key = org_data.get("google_api_key")
            place_id = org_data.get("google_place_id")
            
            if not api_key or not place_id:
                return {"connected": False}
            
            # Get business profile info
            profile_result = self.supabase.table("google_business_profiles").select(
                "name, last_synced_at"
            ).eq("org_id", str(org_id)).eq("place_id", place_id).execute()
            
            profile_data = profile_result.data[0] if profile_result.data else {}
            
            return {
                "connected": True,
                "place_id": place_id,
                "business_name": profile_data.get("name"),
                "last_sync": profile_data.get("last_synced_at")
            }
            
        except Exception as e:
            logger.error(f"Error getting connection status: {str(e)}")
            return {"connected": False, "error": str(e)}
    
    async def sync_reviews(self, org_id: UUID) -> Dict[str, Any]:
        """Sync reviews from Google My Business API"""
        try:
            # Get organization credentials
            org_result = self.supabase.table("orgs").select(
                "google_api_key, google_place_id"
            ).eq("id", str(org_id)).execute()
            
            if not org_result.data:
                return {"success": False, "error": "Organization not found"}
            
            org_data = org_result.data[0]
            api_key = org_data.get("google_api_key")
            place_id = org_data.get("google_place_id")
            
            if not api_key or not place_id:
                return {"success": False, "error": "Google API not configured"}
            
            # Fetch reviews from Google Places API
            reviews_data = await self._fetch_google_reviews(api_key, place_id)
            
            if not reviews_data:
                return {"success": False, "error": "Failed to fetch reviews"}
            
            # Process and store reviews
            new_reviews = 0
            updated_reviews = 0
            
            for review_data in reviews_data:
                result = await self._process_review(org_id, review_data)
                if result == "new":
                    new_reviews += 1
                elif result == "updated":
                    updated_reviews += 1
            
            # Update last sync time
            await self._update_last_sync_time(org_id, place_id)
            
            return {
                "success": True,
                "new_reviews": new_reviews,
                "updated_reviews": updated_reviews,
                "total_processed": len(reviews_data)
            }
            
        except Exception as e:
            logger.error(f"Error syncing reviews: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_reviews(self, org_id: UUID, page: int = 1, per_page: int = 20, 
                         rating_filter: Optional[int] = None) -> Dict[str, Any]:
        """Get reviews with pagination and filtering"""
        try:
            query = self.supabase.table("reviews").select(
                "*, guests(name, email, phone)",
                count="exact"
            )
            
            # Filter by organization through guests
            query = query.eq("guests.org_id", str(org_id))
            
            # Apply rating filter if provided
            if rating_filter:
                query = query.eq("rating", rating_filter)
            
            # Apply pagination
            offset = (page - 1) * per_page
            query = query.range(offset, offset + per_page - 1)
            
            # Order by review date descending
            query = query.order("review_date", desc=True)
            
            result = query.execute()
            
            total = result.count if result.count else 0
            total_pages = (total + per_page - 1) // per_page
            
            return {
                "reviews": result.data,
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": total_pages
            }
            
        except Exception as e:
            logger.error(f"Error getting reviews: {str(e)}")
            return {"reviews": [], "total": 0, "page": page, "per_page": per_page, "total_pages": 0}
    
    async def get_review_analytics(self, org_id: UUID, days: int = 30) -> Dict[str, Any]:
        """Get review analytics for the organization"""
        try:
            # Get reviews from the last N days
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
            
            result = self.supabase.table("reviews").select(
                "rating, review_date, response_text, response_date, guests!inner(org_id)"
            ).eq("guests.org_id", str(org_id)).gte(
                "review_date", cutoff_date.isoformat()
            ).execute()
            
            reviews = result.data
            
            if not reviews:
                return {
                    "total_reviews": 0,
                    "average_rating": 0,
                    "rating_distribution": {},
                    "response_rate": 0,
                    "avg_response_time_hours": None
                }
            
            # Calculate analytics
            total_reviews = len(reviews)
            total_rating = sum(r["rating"] for r in reviews)
            average_rating = total_rating / total_reviews
            
            # Rating distribution
            rating_distribution = {}
            for i in range(1, 6):
                rating_distribution[i] = sum(1 for r in reviews if r["rating"] == i)
            
            # Response rate and time
            responded_reviews = [r for r in reviews if r["response_text"]]
            response_rate = len(responded_reviews) / total_reviews * 100
            
            # Calculate average response time
            response_times = []
            for review in responded_reviews:
                if review["review_date"] and review["response_date"]:
                    review_date = datetime.fromisoformat(review["review_date"].replace('Z', '+00:00'))
                    response_date = datetime.fromisoformat(review["response_date"].replace('Z', '+00:00'))
                    response_time = (response_date - review_date).total_seconds() / 3600  # hours
                    response_times.append(response_time)
            
            avg_response_time = sum(response_times) / len(response_times) if response_times else None
            
            return {
                "total_reviews": total_reviews,
                "average_rating": round(average_rating, 2),
                "rating_distribution": rating_distribution,
                "response_rate": round(response_rate, 2),
                "avg_response_time_hours": round(avg_response_time, 2) if avg_response_time else None
            }
            
        except Exception as e:
            logger.error(f"Error getting review analytics: {str(e)}")
            return {"error": str(e)}
    
    async def generate_review_response(self, review_id: UUID, tone: str = "professional") -> Dict[str, Any]:
        """Generate AI response for a review"""
        try:
            # Get review details
            result = self.supabase.table("reviews").select(
                "*, guests(name, room_type)"
            ).eq("id", str(review_id)).execute()
            
            if not result.data:
                return {"success": False, "error": "Review not found"}
            
            review = result.data[0]
            guest_name = review["guests"]["name"] if review["guests"] else "Guest"
            
            # Generate AI response
            prompt = self._build_response_prompt(review, guest_name, tone)
            ai_response = await self.ai_service.generate_response(prompt)
            
            if ai_response["success"]:
                return {
                    "success": True,
                    "response_text": ai_response["content"]
                }
            else:
                return {"success": False, "error": "Failed to generate response"}
                
        except Exception as e:
            logger.error(f"Error generating review response: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def post_review_response(self, review_id: UUID, response_text: str) -> Dict[str, Any]:
        """Post response to a review"""
        try:
            # Update review with response
            result = self.supabase.table("reviews").update({
                "response_text": response_text,
                "response_date": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", str(review_id)).execute()
            
            if result.data:
                return {"success": True, "message": "Response posted successfully"}
            else:
                return {"success": False, "error": "Failed to update review"}
                
        except Exception as e:
            logger.error(f"Error posting review response: {str(e)}")
            return {"success": False, "error": str(e)}
    
    # Private helper methods
    async def _get_place_details(self, api_key: str, place_id: str) -> Optional[Dict[str, Any]]:
        """Get place details from Google Places API"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/details/json"
                params = {
                    "place_id": place_id,
                    "fields": "name,formatted_address,formatted_phone_number,website,rating,user_ratings_total",
                    "key": api_key
                }
                
                response = await client.get(url, params=params)
                data = response.json()
                
                if data.get("status") == "OK":
                    return data.get("result")
                else:
                    logger.error(f"Google Places API error: {data.get('status')}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error fetching place details: {str(e)}")
            return None
    
    async def _fetch_google_reviews(self, api_key: str, place_id: str) -> List[Dict[str, Any]]:
        """Fetch reviews from Google Places API"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/details/json"
                params = {
                    "place_id": place_id,
                    "fields": "reviews",
                    "key": api_key
                }
                
                response = await client.get(url, params=params)
                data = response.json()
                
                if data.get("status") == "OK":
                    return data.get("result", {}).get("reviews", [])
                else:
                    logger.error(f"Google Places API error: {data.get('status')}")
                    return []
                    
        except Exception as e:
            logger.error(f"Error fetching reviews: {str(e)}")
            return []
    
    async def _create_or_update_business_profile(self, org_id: UUID, place_id: str, business_info: Dict[str, Any]):
        """Create or update Google Business Profile"""
        try:
            # Check if profile exists
            existing = self.supabase.table("google_business_profiles").select("id").eq(
                "org_id", str(org_id)
            ).eq("place_id", place_id).execute()
            
            profile_data = {
                "name": business_info.get("name", ""),
                "address": business_info.get("formatted_address"),
                "phone": business_info.get("formatted_phone_number"),
                "website": business_info.get("website"),
                "rating": business_info.get("rating"),
                "review_count": business_info.get("user_ratings_total"),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            if existing.data:
                # Update existing profile
                self.supabase.table("google_business_profiles").update(profile_data).eq(
                    "id", existing.data[0]["id"]
                ).execute()
            else:
                # Create new profile
                profile_data.update({
                    "org_id": str(org_id),
                    "place_id": place_id,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                self.supabase.table("google_business_profiles").insert(profile_data).execute()
                
        except Exception as e:
            logger.error(f"Error creating/updating business profile: {str(e)}")
    
    async def _process_review(self, org_id: UUID, review_data: Dict[str, Any]) -> str:
        """Process and store a single review"""
        try:
            # Extract review information
            google_review_id = review_data.get("author_url", "").split("/")[-1] or str(review_data.get("time", ""))
            
            # Check if review already exists
            existing = self.supabase.table("reviews").select("id").eq(
                "google_review_id", google_review_id
            ).execute()
            
            review_date = datetime.fromtimestamp(review_data.get("time", 0), tz=timezone.utc)
            
            review_info = {
                "rating": review_data.get("rating", 5),
                "text": review_data.get("text", ""),
                "author_name": review_data.get("author_name", ""),
                "review_date": review_date.isoformat(),
                "source": "google",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            if existing.data:
                # Update existing review
                self.supabase.table("reviews").update(review_info).eq(
                    "id", existing.data[0]["id"]
                ).execute()
                return "updated"
            else:
                # Create new review
                review_info.update({
                    "google_review_id": google_review_id,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                self.supabase.table("reviews").insert(review_info).execute()
                return "new"
                
        except Exception as e:
            logger.error(f"Error processing review: {str(e)}")
            return "error"
    
    async def _update_last_sync_time(self, org_id: UUID, place_id: str):
        """Update last sync time for business profile"""
        try:
            self.supabase.table("google_business_profiles").update({
                "last_synced_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("org_id", str(org_id)).eq("place_id", place_id).execute()
        except Exception as e:
            logger.error(f"Error updating last sync time: {str(e)}")
    
    def _build_response_prompt(self, review: Dict[str, Any], guest_name: str, tone: str) -> str:
        """Build AI prompt for review response generation"""
        rating = review["rating"]
        review_text = review["text"] or ""
        
        if rating >= 4:
            sentiment = "positive"
        elif rating >= 3:
            sentiment = "neutral"
        else:
            sentiment = "negative"
        
        prompt = f"""
You are a hotel manager responding to a Google review. Generate a professional and {tone} response.

Review Details:
- Guest Name: {guest_name}
- Rating: {rating}/5 stars
- Review Text: "{review_text}"
- Sentiment: {sentiment}

Guidelines:
- Keep response under 200 words
- Be {tone} and genuine
- Thank the guest for their feedback
- Address specific points mentioned in the review
- For negative reviews, acknowledge concerns and offer to resolve issues
- For positive reviews, express gratitude and invite them back
- Include hotel name or brand if appropriate
- End with a professional closing

Generate the response:
"""
        
        return prompt