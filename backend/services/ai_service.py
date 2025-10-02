import os
import logging
import hashlib
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID
from supabase import Client
import openai
from models.guest import Guest
from dependencies import get_supabase

logger = logging.getLogger(__name__)

class AIService:
    """Service for AI-powered message generation using OpenAI GPT-4 Mini"""
    
    def __init__(self):
        self.openai_client = None
        self.supabase: Optional[Client] = None
        self.model = "gpt-4o-mini"  # Using GPT-4o Mini as it's the latest efficient model
        
    def configure_client(self, api_key: str):
        """Configure OpenAI client with API key"""
        try:
            openai.api_key = api_key
            self.openai_client = openai
            if not self.supabase:
                self.supabase = get_supabase()
            logger.info("OpenAI client configured successfully")
        except Exception as e:
            logger.error(f"Failed to configure OpenAI client: {e}")
            raise
    
    async def generate_personalized_message(self, guest: Guest, message_type: str = "review_request") -> str:
        """Generate AI-powered personalized message for a guest"""
        if not self.openai_client:
            logger.error("OpenAI client not configured")
            raise Exception("AI service not configured")
            
        if not self.supabase:
            self.supabase = get_supabase()
        
        # Create a hash of the guest data and prompt to check for cached responses
        prompt_data = {
            'guest_name': guest.name,
            'room_type': guest.room_type,
            'checkin_date': str(guest.checkin_date),
            'checkout_date': str(guest.checkout_date),
            'message_type': message_type
        }
        prompt_hash = hashlib.md5(str(prompt_data).encode()).hexdigest()
        
        # Check for cached response
        cached_response = await self._get_cached_response(guest.id, prompt_hash)
        if cached_response:
            logger.info(f"Using cached AI response for guest {guest.id}")
            return cached_response
        
        # Generate new response
        try:
            prompt = await self._get_prompt_template(message_type, guest)
            
            response = await self.openai_client.ChatCompletion.acreate(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that writes personalized, friendly messages for hotel guests. Keep messages short, warm, and professional."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=150,
                temperature=0.7
            )
            
            generated_content = response.choices[0].message.content.strip()
            
            # Apply content filters
            filtered_content = await self._filter_content(generated_content)
            
            # Cache the response
            await self._cache_response(guest.id, prompt_hash, filtered_content)
            
            logger.info(f"Generated AI message for guest {guest.id}")
            return filtered_content
            
        except Exception as e:
            logger.error(f"Failed to generate AI message: {e}")
            # Fallback to template-based message
            return await self._generate_fallback_message(guest, message_type)
    
    async def analyze_guest_reply(self, message_content: str) -> Dict[str, Any]:
        """Analyze guest reply for sentiment and intent"""
        if not self.openai_client:
            logger.error("OpenAI client not configured")
            return {'sentiment': 'neutral', 'confidence': 0.0, 'intent': 'other', 'requires_human': True}
        
        try:
            prompt = f"""
            Analyze the sentiment and intent of this guest message and respond with JSON only:
            
            Message: "{message_content}"
            
            Respond with this exact JSON format:
            {{
                "sentiment": "positive|negative|neutral",
                "confidence": 0.0-1.0,
                "intent": "review_left|complaint|question|compliment|other",
                "requires_human": true|false
            }}
            """
            
            response = await self.openai_client.ChatCompletion.acreate(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a sentiment analysis assistant. Respond only with valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=100,
                temperature=0.1
            )
            
            import json
            result = json.loads(response.choices[0].message.content.strip())
            return result
            
        except Exception as e:
            logger.error(f"Failed to analyze guest reply: {e}")
            return {'sentiment': 'neutral', 'confidence': 0.0, 'intent': 'other', 'requires_human': True}
    
    async def generate_auto_response(self, guest_message: str, sentiment: str, guest: Guest) -> str:
        """Generate automated response based on guest message sentiment"""
        if not self.openai_client:
            logger.error("OpenAI client not configured")
            return "Thank you for your message. We'll get back to you soon."
        
        try:
            if sentiment == "positive":
                prompt = f"""
                Generate a warm thank you response to this positive guest message.
                Guest name: {guest.name}
                Guest message: "{guest_message}"
                
                Keep it short (1-2 sentences), appreciative, and encourage them to share their experience with others.
                """
            elif sentiment == "negative":
                prompt = f"""
                Generate a sincere apology and helpful response to this negative guest message.
                Guest name: {guest.name}
                Guest message: "{guest_message}"
                
                Keep it short (1-2 sentences), empathetic, and offer to help resolve their concern.
                """
            else:
                prompt = f"""
                Generate a helpful and friendly response to this neutral guest message.
                Guest name: {guest.name}
                Guest message: "{guest_message}"
                
                Keep it short (1-2 sentences), helpful, and professional.
                """
            
            response = await self.openai_client.ChatCompletion.acreate(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a helpful hotel customer service assistant. Be warm, professional, and concise."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=100,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Failed to generate auto response: {e}")
            return "Thank you for your message. We appreciate your feedback and will get back to you soon."
    
    async def _get_prompt_template(self, message_type: str, guest: Guest) -> str:
        """Get prompt template for message generation"""
        # Calculate stay duration
        stay_duration = "your stay"
        if guest.checkin_date and guest.checkout_date:
            duration = (guest.checkout_date - guest.checkin_date).days
            stay_duration = f"{duration} night{'s' if duration != 1 else ''}"
        
        if message_type == "review_request":
            return f"""
            Write a short, friendly message asking a hotel guest to leave a Google review.
            Use the guest's name and stay details. Keep under 2 lines and make it personal but not pushy.
            
            Guest Details:
            - Name: {guest.name or 'Guest'}
            - Room Type: {guest.room_type or 'Room'}
            - Check-in: {guest.checkin_date.strftime('%B %d, %Y') if guest.checkin_date else 'recent stay'}
            - Check-out: {guest.checkout_date.strftime('%B %d, %Y') if guest.checkout_date else 'departure'}
            - Stay Duration: {stay_duration}
            
            Write a warm, personalized message asking for a Google review. Include their name and reference their stay.
            """
        elif message_type == "follow_up":
            return f"""
            Write a gentle follow-up message for a guest who hasn't responded to the initial review request.
            Be polite and offer assistance if they had any issues.
            
            Guest Details:
            - Name: {guest.name or 'Guest'}
            - Previous message sent: a few days ago
            
            Write a caring follow-up message that doesn't pressure but gently reminds about the review.
            """
        else:
            return f"""
            Write a friendly, personalized message for a hotel guest.
            
            Guest Details:
            - Name: {guest.name or 'Guest'}
            - Room Type: {guest.room_type or 'Room'}
            - Stay Duration: {stay_duration}
            
            Write a warm, professional message.
            """
    
    async def _filter_content(self, content: str) -> str:
        """Apply content filtering and moderation"""
        # Basic profanity filter (in production, use a more comprehensive solution)
        profanity_words = ['damn', 'hell', 'shit', 'fuck', 'bitch', 'ass']  # Basic list
        filtered_content = content
        
        for word in profanity_words:
            filtered_content = filtered_content.replace(word.lower(), '*' * len(word))
            filtered_content = filtered_content.replace(word.upper(), '*' * len(word))
            filtered_content = filtered_content.replace(word.capitalize(), '*' * len(word))
        
        # Remove any potential PII patterns (basic implementation)
        import re
        # Remove phone numbers
        filtered_content = re.sub(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '[PHONE]', filtered_content)
        # Remove email addresses
        filtered_content = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]', filtered_content)
        
        return filtered_content
    
    async def _generate_fallback_message(self, guest: Guest, message_type: str) -> str:
        """Generate fallback message when AI fails"""
        if message_type == "review_request":
            return f"Hi {guest.name or 'there'}! We hope you enjoyed your stay with us. Would you mind leaving us a review on Google? Your feedback helps us improve. Thank you!"
        elif message_type == "follow_up":
            return f"Hi {guest.name or 'there'}! We wanted to follow up on your recent stay. If you have a moment, we'd appreciate a review on Google. Thank you!"
        else:
            return f"Hi {guest.name or 'there'}! Thank you for staying with us. We hope you had a wonderful experience!"
    
    async def _get_cached_response(self, guest_id: UUID, prompt_hash: str) -> Optional[str]:
        """Get cached AI response if available"""
        try:
            result = self.supabase.table('ai_responses').select('generated_content').eq('guest_id', str(guest_id)).eq('prompt_hash', prompt_hash).execute()
            
            if result.data:
                return result.data[0]['generated_content']
            return None
        except Exception as e:
            logger.error(f"Failed to get cached response: {e}")
            return None
    
    async def _cache_response(self, guest_id: UUID, prompt_hash: str, content: str):
        """Cache AI response for future use"""
        try:
            cache_data = {
                'guest_id': str(guest_id),
                'prompt_hash': prompt_hash,
                'generated_content': content,
                'model_used': self.model,
                'created_at': datetime.utcnow().isoformat()
            }
            
            self.supabase.table('ai_responses').insert(cache_data).execute()
            logger.info(f"Cached AI response for guest {guest_id}")
        except Exception as e:
            logger.error(f"Failed to cache response: {e}")

# Global AI service instance
ai_service = AIService()