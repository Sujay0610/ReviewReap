# Phase 4: Email Integration with Resend

from typing import Optional, Dict, Any, List
from uuid import UUID
import logging
import httpx
import os
from datetime import datetime
from supabase import Client
from dependencies import get_supabase

logger = logging.getLogger(__name__)

class EmailService:
    """Email service using Resend API"""
    
    def __init__(self):
        self.api_key: Optional[str] = None
        self.base_url = "https://api.resend.com"
        self.supabase: Optional[Client] = None
        logger.info("EmailService initialized")
    
    def configure(self, api_key: str):
        """Configure Resend API key"""
        self.api_key = api_key
        if not self.supabase:
            self.supabase = get_supabase()
        logger.info("Email service configured with Resend API")
    
    async def send_message(self, message_id: UUID) -> bool:
        """Send email message using Resend API"""
        if not self.api_key:
            logger.error("Email service not configured - missing API key")
            return False
            
        if not self.supabase:
            self.supabase = get_supabase()
        
        try:
            # Get message details from database
            message_result = self.supabase.table('messages').select(
                '*, guests(*), campaigns(*)'
            ).eq('id', str(message_id)).single().execute()
            
            if not message_result.data:
                logger.error(f"Message {message_id} not found")
                return False
            
            message = message_result.data
            guest = message['guests']
            campaign = message['campaigns']
            
            # Prepare email data
            email_data = {
                "from": "Review Request <noreply@reviewauto.com>",
                "to": [guest['email']],
                "subject": f"Thank you for staying with us, {guest['name']}!",
                "html": self._generate_html_content(message['content'], guest, campaign),
                "text": message['content']
            }
            
            # Send email via Resend API
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/emails",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json=email_data
                )
            
            if response.status_code == 200:
                result = response.json()
                provider_msg_id = result.get('id')
                
                # Update message status
                self.supabase.table('messages').update({
                    'status': 'sent',
                    'provider_msg_id': provider_msg_id,
                    'sent_at': datetime.utcnow().isoformat()
                }).eq('id', str(message_id)).execute()
                
                # Create sent event
                self.supabase.table('events').insert({
                    'message_id': str(message_id),
                    'event_type': 'sent',
                    'payload': {'provider_msg_id': provider_msg_id}
                }).execute()
                
                logger.info(f"Email sent successfully for message {message_id}")
                return True
            else:
                logger.error(f"Failed to send email: {response.status_code} - {response.text}")
                
                # Update message status to failed
                self.supabase.table('messages').update({
                    'status': 'failed',
                    'failed_at': datetime.utcnow().isoformat()
                }).eq('id', str(message_id)).execute()
                
                return False
                
        except Exception as e:
            logger.error(f"Error sending email for message {message_id}: {str(e)}")
            
            # Update message status to failed
            self.supabase.table('messages').update({
                'status': 'failed',
                'failed_at': datetime.utcnow().isoformat()
            }).eq('id', str(message_id)).execute()
            
            return False
    
    def _generate_html_content(self, text_content: str, guest: Dict, campaign: Dict) -> str:
        """Generate HTML email content with styling"""
        return f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Review Request</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f9f9f9;
                }}
                .container {{
                    background-color: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #e5e7eb;
                }}
                .content {{
                    margin-bottom: 30px;
                    font-size: 16px;
                }}
                .cta-button {{
                    display: inline-block;
                    background-color: #7c3aed;
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: bold;
                    margin: 20px 0;
                }}
                .footer {{
                    text-align: center;
                    font-size: 12px;
                    color: #6b7280;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="color: #7c3aed; margin: 0;">Thank You for Your Stay!</h1>
                </div>
                <div class="content">
                    <p>{text_content}</p>
                    {f'<a href="{guest.get("google_review_link", "#")}" class="cta-button">Leave a Review</a>' if guest.get('google_review_link') else ''}
                </div>
                <div class="footer">
                    <p>This email was sent as part of our guest feedback program.</p>
                    <p>If you no longer wish to receive these emails, please reply with "UNSUBSCRIBE".</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    async def process_webhook(self, webhook_data: Dict[str, Any]) -> bool:
        """Process Resend webhook events"""
        if not self.supabase:
            self.supabase = get_supabase()
            
        try:
            event_type = webhook_data.get('type')
            email_data = webhook_data.get('data', {})
            email_id = email_data.get('email_id')
            
            if not email_id:
                logger.warning("Webhook received without email_id")
                return False
            
            # Find message by provider_msg_id
            message_result = self.supabase.table('messages').select('*').eq(
                'provider_msg_id', email_id
            ).execute()
            
            if not message_result.data:
                logger.warning(f"Message not found for email_id: {email_id}")
                return False
            
            message = message_result.data[0]
            message_id = message['id']
            
            # Process different event types
            if event_type == 'email.delivered':
                self.supabase.table('messages').update({
                    'delivered_at': datetime.utcnow().isoformat()
                }).eq('id', message_id).execute()
                
                self.supabase.table('events').insert({
                    'message_id': message_id,
                    'event_type': 'delivered',
                    'payload': webhook_data
                }).execute()
                
            elif event_type == 'email.opened':
                self.supabase.table('messages').update({
                    'read_at': datetime.utcnow().isoformat()
                }).eq('id', message_id).execute()
                
                self.supabase.table('events').insert({
                    'message_id': message_id,
                    'event_type': 'read',
                    'payload': webhook_data
                }).execute()
                
            elif event_type == 'email.bounced' or event_type == 'email.complained':
                self.supabase.table('messages').update({
                    'status': 'failed',
                    'failed_at': datetime.utcnow().isoformat()
                }).eq('id', message_id).execute()
                
                self.supabase.table('events').insert({
                    'message_id': message_id,
                    'event_type': 'failed',
                    'payload': webhook_data
                }).execute()
            
            logger.info(f"Processed email webhook: {event_type} for message {message_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error processing email webhook: {str(e)}")
            return False
    
    async def send_test_email(self, to_email: str, subject: str, content: str) -> bool:
        """Send a test email"""
        if not self.api_key:
            logger.error("Email service not configured - missing API key")
            return False
            
        if not self.supabase:
            self.supabase = get_supabase()
        
        try:
            email_data = {
                "from": "Review Request <noreply@reviewauto.com>",
                "to": [to_email],
                "subject": subject,
                "html": f"<p>{content}</p>",
                "text": content
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/emails",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json=email_data
                )
            
            if response.status_code == 200:
                logger.info(f"Test email sent successfully to {to_email}")
                return True
            else:
                logger.error(f"Failed to send test email: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending test email: {str(e)}")
            return False

# Global email service instance (will be configured when needed)
email_service = EmailService()