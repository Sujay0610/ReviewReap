import os
import openai
from datetime import datetime, timedelta
from typing import Optional, List
from uuid import UUID
from supabase import Client
from models.conversation import (
    Conversation, ConversationCreate, ConversationUpdate, ConversationList,
    ConversationMessage, ConversationMessageCreate, ConversationStatus,
    MessageSender, SentimentType, SentimentAnalysisResult, AutoResponseRequest, AutoResponseResult
)
from services.auth_service import get_current_user_org_id

class ConversationService:
    def __init__(self, supabase: Client):
        self.supabase = supabase
        openai.api_key = os.getenv('OPENAI_API_KEY')

    async def get_conversations(self, user_id: str, page: int = 1, per_page: int = 10, 
                              status: Optional[ConversationStatus] = None) -> ConversationList:
        """Get paginated list of conversations for the user's organization"""
        org_id = await get_current_user_org_id(self.supabase, user_id)
        
        # Build query with proper embedded resource filtering
        query = self.supabase.table('conversations').select(
            '*, guest:guests!inner(*), messages:conversation_messages(*)'
        ).eq('guest.org_id', str(org_id))
        
        if status:
            query = query.eq('status', status.value)
        
        # Get total count with same filtering
        count_result = self.supabase.table('conversations').select(
            'id, guest:guests!inner(id)', count='exact'
        ).eq('guest.org_id', str(org_id))
        
        if status:
            count_result = count_result.eq('status', status.value)
        
        count_response = count_result.execute()
        total = count_response.count or 0
        
        # Get paginated results
        offset = (page - 1) * per_page
        result = query.order('last_message_at', desc=True).range(offset, offset + per_page - 1).execute()
        
        conversations = [Conversation(**conv) for conv in result.data]
        
        return ConversationList(
            conversations=conversations,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=(total + per_page - 1) // per_page
        )

    async def get_conversation(self, conversation_id: UUID, user_id: str) -> Optional[Conversation]:
        """Get a specific conversation with messages"""
        org_id = await get_current_user_org_id(self.supabase, user_id)
        
        result = self.supabase.table('conversations').select(
            '*, guest:guests!inner(*), messages:conversation_messages(*)'
        ).eq('id', str(conversation_id)).eq('guest.org_id', str(org_id)).execute()
        
        if not result.data:
            return None
        
        return Conversation(**result.data[0])

    async def create_conversation(self, conversation_data: ConversationCreate, user_id: str) -> Conversation:
        """Create a new conversation"""
        org_id = await get_current_user_org_id(self.supabase, user_id)
        
        # Verify guest belongs to user's org
        guest_result = self.supabase.table('guests').select('id').eq(
            'id', str(conversation_data.guest_id)
        ).eq('org_id', str(org_id)).execute()
        
        if not guest_result.data:
            raise Exception("Guest not found or access denied")
        
        conv_dict = conversation_data.model_dump(exclude_unset=True)
        result = self.supabase.table('conversations').insert(conv_dict).execute()
        
        if not result.data:
            raise Exception("Failed to create conversation")
        
        return await self.get_conversation(UUID(result.data[0]['id']), user_id)

    async def update_conversation(self, conversation_id: UUID, update_data: ConversationUpdate, 
                                user_id: str) -> Optional[Conversation]:
        """Update conversation status or sentiment"""
        org_id = await get_current_user_org_id(self.supabase, user_id)
        
        # Verify conversation belongs to user's org
        conv_check = self.supabase.table('conversations').select(
            'id, guest:guests!inner(id)'
        ).eq('id', str(conversation_id)).eq('guest.org_id', str(org_id)).execute()
        
        if not conv_check.data:
            raise Exception("Conversation not found or access denied")
        
        update_dict = update_data.model_dump(exclude_unset=True)
        result = self.supabase.table('conversations').update(update_dict).eq(
            'id', str(conversation_id)
        ).execute()
        
        if not result.data:
            return None
        
        return await self.get_conversation(conversation_id, user_id)

    async def add_message(self, message_data: ConversationMessageCreate, user_id: str) -> ConversationMessage:
        """Add a message to a conversation"""
        org_id = await get_current_user_org_id(self.supabase, user_id)
        
        # Verify conversation belongs to user's org
        conv_check = self.supabase.table('conversations').select(
            'id, guest:guests!inner(id)'
        ).eq('id', str(message_data.conversation_id)).eq('guest.org_id', str(org_id)).execute()
        
        if not conv_check.data:
            raise Exception("Conversation not found or access denied")
        
        # Analyze sentiment if it's a guest message
        if message_data.sender == MessageSender.GUEST and not message_data.sentiment:
            sentiment_result = await self.analyze_sentiment(message_data.content)
            message_data.sentiment = sentiment_result.sentiment
        
        msg_dict = message_data.model_dump(exclude_unset=True)
        result = self.supabase.table('conversation_messages').insert(msg_dict).execute()
        
        if not result.data:
            raise Exception("Failed to add message")
        
        # Update conversation's last_message_at
        self.supabase.table('conversations').update({
            'last_message_at': datetime.utcnow().isoformat()
        }).eq('id', str(message_data.conversation_id)).execute()
        
        return ConversationMessage(**result.data[0])

    async def analyze_sentiment(self, message_content: str) -> SentimentAnalysisResult:
        """Analyze sentiment and intent of a message using OpenAI"""
        try:
            response = await openai.ChatCompletion.acreate(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": """You are a sentiment analysis expert for hotel guest communications. 
                        Analyze the message and return a JSON response with:
                        - sentiment: 'positive', 'negative', or 'neutral'
                        - confidence: float between 0.0 and 1.0
                        - intent: brief description of what the guest wants
                        - requires_human: boolean indicating if human intervention is needed
                        
                        Requires human intervention for: complaints, refund requests, serious issues, 
                        complex problems, or when confidence < 0.7"""
                    },
                    {
                        "role": "user",
                        "content": f"Analyze this guest message: {message_content}"
                    }
                ],
                temperature=0.1
            )
            
            import json
            analysis = json.loads(response.choices[0].message.content)
            
            return SentimentAnalysisResult(
                sentiment=SentimentType(analysis['sentiment']),
                confidence=analysis['confidence'],
                intent=analysis['intent'],
                requires_human=analysis['requires_human']
            )
        except Exception as e:
            # Fallback to neutral sentiment
            return SentimentAnalysisResult(
                sentiment=SentimentType.NEUTRAL,
                confidence=0.5,
                intent="Unable to analyze",
                requires_human=True
            )

    async def generate_auto_response(self, request: AutoResponseRequest) -> AutoResponseResult:
        """Generate an automated response using AI"""
        try:
            guest_name = request.guest_data.get('name', 'Guest')
            room_type = request.guest_data.get('room_type', 'room')
            
            response = await openai.ChatCompletion.acreate(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": f"""You are a helpful hotel customer service assistant. 
                        Generate appropriate responses to guest messages.
                        
                        Guest details:
                        - Name: {guest_name}
                        - Room type: {room_type}
                        - Message sentiment: {request.sentiment.value}
                        
                        Guidelines:
                        - Be polite, professional, and empathetic
                        - For positive messages: thank them and encourage reviews
                        - For negative messages: apologize and offer solutions
                        - For neutral messages: provide helpful information
                        - Keep responses concise (under 200 words)
                        - Don't make promises you can't keep
                        
                        Return JSON with:
                        - response: the suggested response text
                        - confidence: float between 0.0 and 1.0
                        - requires_review: boolean if human should review before sending"""
                    },
                    {
                        "role": "user",
                        "content": f"Guest message: {request.message_content}"
                    }
                ],
                temperature=0.3
            )
            
            import json
            result = json.loads(response.choices[0].message.content)
            
            return AutoResponseResult(
                response=result['response'],
                confidence=result['confidence'],
                requires_review=result['requires_review']
            )
        except Exception as e:
            # Fallback response
            return AutoResponseResult(
                response="Thank you for your message. We'll get back to you shortly.",
                confidence=0.3,
                requires_review=True
            )

    async def get_conversation_analytics(self, user_id: str, days: int = 30) -> dict:
        """Get conversation analytics for the user's organization"""
        org_id = await get_current_user_org_id(self.supabase, user_id)
        since_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        # Get conversations with guest data for filtering
        result = self.supabase.table('conversations').select(
            'status, sentiment, created_at, guest:guests!inner(id)'
        ).eq('guest.org_id', str(org_id)).gte('created_at', since_date).execute()
        
        conversations = result.data
        
        # Calculate metrics
        total = len(conversations)
        active = len([c for c in conversations if c['status'] == 'active'])
        resolved = len([c for c in conversations if c['status'] == 'resolved'])
        escalated = len([c for c in conversations if c['status'] == 'escalated'])
        
        # Sentiment breakdown
        positive = len([c for c in conversations if c.get('sentiment') == 'positive'])
        negative = len([c for c in conversations if c.get('sentiment') == 'negative'])
        neutral = len([c for c in conversations if c.get('sentiment') == 'neutral'])
        
        return {
            'total_conversations': total,
            'active_conversations': active,
            'resolved_conversations': resolved,
            'escalated_conversations': escalated,
            'sentiment_breakdown': {
                'positive': positive,
                'negative': negative,
                'neutral': neutral
            },
            'resolution_rate': round((resolved / total * 100) if total > 0 else 0, 1),
            'escalation_rate': round((escalated / total * 100) if total > 0 else 0, 1)
        }