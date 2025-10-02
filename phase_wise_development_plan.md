# Review Automation SaaS - Phase-Wise Development Plan

## 🎯 **Project Overview**

**Tech Stack:**
- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS
- **Backend:** FastAPI + Python 3.11+
- **Database:** Supabase (PostgreSQL)
- **Email:** Resend API
- **WhatsApp:** Client's Own WhatsApp Business API
- **AI:** OpenAI GPT-4 Mini
- **Reviews:** Google Reviews API (extensible to Booking.com, MakeMyTrip later)
- **Background Jobs:** Redis + RQ

---

## 🏗️ **Phase 0: Project Foundation & Authentication** (Week 1)

### **Objective**
Set up the complete project infrastructure with working authentication system.

### **Backend Deliverables**
- FastAPI project with proper structure
- Supabase database connection and schema
- JWT authentication system
- User registration and login endpoints
- Organization management
- Redis setup for background tasks

### **Frontend Deliverables**
- Next.js project with TypeScript
- Tailwind CSS configuration
- Sidebar component (as per spec)
- Authentication pages (login/register/org setup)
- Protected route middleware
- API client setup

### **Database Schema (Supabase)**
```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES orgs(id),
    email VARCHAR UNIQUE NOT NULL,
    hashed_password VARCHAR NOT NULL,
    role VARCHAR DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Organizations table
CREATE TABLE orgs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    timezone VARCHAR DEFAULT 'UTC',
    default_country VARCHAR DEFAULT 'US',
    whatsapp_api_token VARCHAR,
    whatsapp_phone_number_id VARCHAR,
    resend_api_key VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **API Endpoints**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/orgs` - Create organization
- `PUT /api/orgs/{id}` - Update organization settings

### **Testable Deliverable**
✅ **Test:** User can register, login, create organization, and access protected dashboard with sidebar navigation.

---

## 📊 **Phase 1: CSV Upload & Guest Management** (Week 2)

### **Objective**
Implement complete CSV upload system with guest data management.

### **Backend Deliverables**
- File upload handling with validation
- CSV parsing worker with RQ
- Guest data model and CRUD operations
- Data validation and deduplication
- Column mapping system

### **Frontend Deliverables**
- CSV upload interface with drag-and-drop
- Column mapping UI
- Guest data preview and validation
- Guest management dashboard
- Data editing capabilities

### **Database Schema Updates**
```sql
-- Guests table
CREATE TABLE guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES orgs(id),
    campaign_id UUID REFERENCES campaigns(id),
    name VARCHAR NOT NULL,
    phone VARCHAR,
    email VARCHAR,
    checkin_date DATE,
    checkout_date DATE,
    booking_id VARCHAR,
    room_type VARCHAR,
    google_review_link VARCHAR,
    meta JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Upload jobs table
CREATE TABLE upload_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES orgs(id),
    filename VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'pending',
    total_rows INTEGER,
    processed_rows INTEGER,
    errors JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **API Endpoints**
- `POST /api/upload-csv` - Upload CSV file
- `GET /api/upload-job/{id}` - Check upload status
- `POST /api/upload-job/{id}/confirm` - Confirm and import data
- `GET /api/guests` - List guests with pagination
- `PUT /api/guests/{id}` - Update guest
- `DELETE /api/guests/{id}` - Delete guest

### **Sample CSV Format**
```csv
name,phone,email,checkin_date,checkout_date,booking_id,room_type,google_review_link
John Doe,+1234567890,john@example.com,2024-01-15,2024-01-17,BK001,Deluxe,https://g.page/r/hotel-review-link
```

### **Testable Deliverable**
✅ **Test:** Upload CSV file, map columns, preview data, fix validation errors, and successfully import guest data into the system.

---

## 🚀 **Phase 2: Campaign Management & Message Templates** (Week 3)

### **Objective**
Build campaign creation system with message templating.

### **Backend Deliverables**
- Campaign CRUD operations
- Message template system with variable interpolation
- Campaign-guest relationship management
- Message preview generation
- Campaign scheduling logic

### **Frontend Deliverables**
- Campaign creation wizard
- Template editor with variable picker
- Campaign dashboard with metrics
- Message preview interface
- Campaign management interface

### **Database Schema Updates**
```sql
-- Campaigns table
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES orgs(id),
    name VARCHAR NOT NULL,
    channel VARCHAR NOT NULL, -- 'whatsapp', 'email', 'both'
    message_template TEXT NOT NULL,
    ai_enabled BOOLEAN DEFAULT false,
    delay_hours INTEGER DEFAULT 24,
    status VARCHAR DEFAULT 'draft',
    scheduled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID REFERENCES guests(id),
    campaign_id UUID REFERENCES campaigns(id),
    content TEXT NOT NULL,
    channel VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'pending',
    provider_msg_id VARCHAR,
    ai_generated BOOLEAN DEFAULT false,
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **API Endpoints**
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns` - List campaigns
- `GET /api/campaigns/{id}` - Get campaign details
- `PUT /api/campaigns/{id}` - Update campaign
- `POST /api/campaigns/{id}/preview` - Preview messages
- `DELETE /api/campaigns/{id}` - Delete campaign

### **Message Template Variables**
- `{{name}}` - Guest name
- `{{room_type}}` - Room type
- `{{checkin_date}}` - Check-in date
- `{{checkout_date}}` - Check-out date
- `{{booking_id}}` - Booking reference
- `{{review_link}}` - Google review link

### **Testable Deliverable**
✅ **Test:** Create campaign, design message template with variables, preview personalized messages for different guests, and save campaign drafts.

---

## 📱 **Phase 3: WhatsApp Integration & Message Dispatch** (Week 4)

### **Objective**
Implement WhatsApp Business API integration and message sending system.

### **Backend Deliverables**
- WhatsApp Business API client integration
- Message dispatcher with rate limiting
- Webhook handler for delivery status
- Campaign execution system
- Message status tracking

### **Frontend Deliverables**
- WhatsApp API configuration interface
- Campaign execution controls (start/stop/pause)
- Real-time message status dashboard
- Delivery analytics

### **Database Schema Updates**
```sql
-- Events table for tracking
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id),
    event_type VARCHAR NOT NULL, -- 'sent', 'delivered', 'read', 'failed'
    timestamp TIMESTAMP DEFAULT NOW(),
    payload JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **WhatsApp API Integration**
```python
# WhatsApp Business API client
class WhatsAppClient:
    def __init__(self, access_token: str, phone_number_id: str):
        self.access_token = access_token
        self.phone_number_id = phone_number_id
        self.base_url = "https://graph.facebook.com/v18.0"
    
    async def send_message(self, to: str, message: str):
        # Implementation for sending messages
        pass
    
    async def send_template_message(self, to: str, template_name: str, params: list):
        # Implementation for template messages
        pass
```

### **API Endpoints**
- `POST /api/campaigns/{id}/start` - Start campaign
- `POST /api/campaigns/{id}/stop` - Stop campaign
- `POST /api/campaigns/{id}/pause` - Pause campaign
- `POST /api/webhook/whatsapp` - WhatsApp webhook
- `GET /api/messages/{campaign_id}` - Get campaign messages
- `GET /api/messages/{id}/events` - Get message events

### **Background Workers**
- Message queue processor
- Rate limiting (respect WhatsApp limits)
- Retry logic with exponential backoff
- Status update handler

### **Testable Deliverable**
✅ **Test:** Configure WhatsApp API credentials, start campaign, send messages to test numbers, receive delivery confirmations, and track message status in real-time.

---

## 📧 **Phase 4: Email Integration with Resend** (Week 5)

### **Objective**
Add email channel support using Resend API.

### **Backend Deliverables**
- Resend API integration
- Email template system
- Multi-channel campaign support
- Email delivery tracking
- Bounce and complaint handling

### **Frontend Deliverables**
- Email template editor
- Multi-channel campaign creation
- Email-specific analytics
- Template preview for email

### **Resend Integration**
```python
# Resend email client
class ResendClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.resend.com"
    
    async def send_email(self, to: str, subject: str, html: str, text: str = None):
        # Implementation for sending emails
        pass
```

### **Email Templates**
- HTML email templates with CSS styling
- Plain text fallback
- Responsive design for mobile
- Brand customization options

### **API Endpoints**
- `POST /api/email/send` - Send individual email
- `POST /api/email/template` - Create email template
- `GET /api/email/templates` - List email templates
- `POST /api/webhook/resend` - Resend webhook for events

### **Testable Deliverable**
✅ **Test:** Create email campaign, design HTML email template, send test emails, track delivery status, and handle bounces/complaints.

---

## 🤖 **Phase 5: AI Integration with GPT-4 Mini** (Week 6)

### **Objective**
Implement AI-powered message personalization and automated responses.

### **Backend Deliverables**
- OpenAI GPT-4 Mini integration
- AI message generation system
- Response caching mechanism
- PII sanitization
- Profanity filtering

### **Frontend Deliverables**
- AI toggle in campaign creation
- AI-generated message preview
- AI response configuration
- Prompt template management

### **Database Schema Updates**
```sql
-- AI responses table
CREATE TABLE ai_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID REFERENCES guests(id),
    prompt_hash VARCHAR NOT NULL,
    generated_content TEXT NOT NULL,
    model_used VARCHAR DEFAULT 'gpt-4-mini',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Prompt templates table
CREATE TABLE prompt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES orgs(id),
    name VARCHAR NOT NULL,
    template TEXT NOT NULL,
    type VARCHAR NOT NULL, -- 'review_request', 'follow_up', 'response'
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **AI Prompt Templates**
```python
REVIEW_REQUEST_PROMPT = """
You are an assistant that writes short, friendly messages asking hotel guests to leave a Google review.
Use the guest's name and stay details. Keep under 2 lines and make it personal but not pushy.

Guest Details:
- Name: {name}
- Room Type: {room_type}
- Check-in: {checkin_date}
- Check-out: {checkout_date}
- Stay Duration: {stay_duration} nights

Write a warm, personalized message asking for a Google review.
"""

FOLLOW_UP_PROMPT = """
Write a gentle follow-up message for a guest who hasn't responded to the initial review request.
Be polite and offer assistance if they had any issues.

Guest Details:
- Name: {name}
- Previous message sent: {days_ago} days ago

Write a caring follow-up message.
"""
```

### **API Endpoints**
- `POST /api/ai/generate-message` - Generate AI message
- `GET /api/ai/prompts` - List prompt templates
- `POST /api/ai/prompts` - Create prompt template
- `PUT /api/ai/prompts/{id}` - Update prompt template

### **AI Features**
- Message personalization based on guest data
- Sentiment-aware responses
- Context-aware follow-ups
- Response caching to avoid duplicate API calls
- Content moderation and filtering

### **Testable Deliverable**
✅ **Test:** Enable AI for campaign, generate personalized messages for different guest profiles, verify content quality and appropriateness, and test caching mechanism.

---

## 💬 **Phase 6: Guest Reply Handling & Automation** (Week 7)

### **Objective**
Implement automated guest reply handling with sentiment analysis.

### **Backend Deliverables**
- Incoming message webhook processing
- Sentiment analysis using GPT-5 Mini
- Automated response system
- Escalation workflow
- Conversation threading

### **Frontend Deliverables**
- Guest conversation interface
- Reply management dashboard
- Escalation queue
- Automated response configuration

### **Database Schema Updates**
```sql
-- Conversations table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID REFERENCES guests(id),
    campaign_id UUID REFERENCES campaigns(id),
    channel VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'active', -- 'active', 'resolved', 'escalated'
    sentiment VARCHAR, -- 'positive', 'negative', 'neutral'
    last_message_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Conversation messages table
CREATE TABLE conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id),
    sender VARCHAR NOT NULL, -- 'guest', 'system', 'agent'
    content TEXT NOT NULL,
    message_type VARCHAR DEFAULT 'text',
    sentiment VARCHAR,
    is_automated BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **Sentiment Analysis & Auto-Response**
```python
class SentimentAnalyzer:
    async def analyze_message(self, message: str) -> dict:
        prompt = f"""
        Analyze the sentiment of this guest message and categorize it:
        
        Message: "{message}"
        
        Respond with JSON:
        {{
            "sentiment": "positive|negative|neutral",
            "confidence": 0.0-1.0,
            "intent": "review_left|complaint|question|compliment|other",
            "requires_human": true|false
        }}
        """
        # GPT-4 Mini API call
        return response

class AutoResponder:
    async def generate_response(self, guest_message: str, sentiment: str, guest_data: dict) -> str:
        if sentiment == "positive":
            return await self._generate_thank_you_response(guest_data)
        elif sentiment == "negative":
            return await self._generate_apology_response(guest_message, guest_data)
        else:
            return await self._generate_neutral_response(guest_data)
```

### **API Endpoints**
- `POST /api/webhook/whatsapp-reply` - Handle incoming WhatsApp messages
- `POST /api/webhook/email-reply` - Handle email replies
- `GET /api/conversations` - List conversations
- `GET /api/conversations/{id}` - Get conversation details
- `POST /api/conversations/{id}/respond` - Send manual response
- `POST /api/conversations/{id}/escalate` - Escalate to human agent

### **Automated Response Types**
- **Positive responses:** Thank you + encourage more reviews
- **Negative responses:** Apology + escalation to management
- **Neutral responses:** Helpful information + review request
- **Follow-up responses:** Gentle reminders after no response

### **Testable Deliverable**
✅ **Test:** Send test messages with different sentiments, verify correct sentiment classification, receive appropriate automated responses, and test escalation workflow.

---

## 🔗 **Phase 7: Google Reviews Integration** (Week 8)

### **Objective**
Integrate with Google Reviews API for review tracking and management.

### **Backend Deliverables**
- Google My Business API integration
- Review fetching and monitoring
- Review response automation
- Review analytics and tracking

### **Frontend Deliverables**
- Google Reviews dashboard
- Review response interface
- Review analytics charts
- Google Business profile management

### **Database Schema Updates**
```sql
-- Reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID REFERENCES guests(id),
    google_review_id VARCHAR UNIQUE,
    rating INTEGER NOT NULL,
    text TEXT,
    author_name VARCHAR,
    review_date TIMESTAMP,
    response_text TEXT,
    response_date TIMESTAMP,
    source VARCHAR DEFAULT 'google',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Google Business profiles table
CREATE TABLE google_business_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES orgs(id),
    place_id VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    address TEXT,
    phone VARCHAR,
    website VARCHAR,
    rating DECIMAL(2,1),
    review_count INTEGER,
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **Google Reviews Integration**
```python
class GoogleReviewsClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://mybusinessbusinessinformation.googleapis.com/v1"
    
    async def get_reviews(self, location_id: str) -> List[dict]:
        # Fetch reviews from Google My Business API
        pass
    
    async def respond_to_review(self, review_id: str, response: str) -> bool:
        # Post response to Google review
        pass
    
    async def get_business_info(self, place_id: str) -> dict:
        # Get business profile information
        pass
```

### **API Endpoints**
- `POST /api/google/connect` - Connect Google My Business account
- `GET /api/google/profiles` - List business profiles
- `GET /api/reviews` - List reviews with filters
- `POST /api/reviews/{id}/respond` - Respond to review
- `GET /api/reviews/analytics` - Review analytics
- `POST /api/reviews/sync` - Sync latest reviews

### **Review Response Automation**
- AI-generated responses based on review sentiment
- Template responses for common review types
- Approval workflow for automated responses
- Bulk response management

### **Testable Deliverable**
✅ **Test:** Connect Google My Business account, fetch existing reviews, generate AI responses to reviews, post responses, and track review metrics.

---

## 📈 **Phase 8: Analytics Dashboard & Reporting** (Week 9)

### **Objective**
Build comprehensive analytics dashboard with reporting capabilities.

### **Backend Deliverables**
- Analytics data aggregation
- Report generation system
- Data export functionality
- Performance metrics calculation

### **Frontend Deliverables**
- Interactive analytics dashboard
- Chart components (Chart.js/Recharts)
- Report export interface
- Real-time metrics display

### **Analytics Metrics**
- **Campaign Performance:**
  - Messages sent/delivered/read
  - Response rates
  - Click-through rates
  - Conversion rates

- **Review Metrics:**
  - Reviews received
  - Average rating
  - Review response time
  - Sentiment distribution

- **Guest Engagement:**
  - Active conversations
  - Response times
  - Escalation rates
  - Satisfaction scores

### **Dashboard Components**
```typescript
// Analytics dashboard components
interface DashboardMetrics {
  totalCampaigns: number;
  activeGuests: number;
  messagesThisMonth: number;
  averageRating: number;
  responseRate: number;
  reviewsThisMonth: number;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
  }[];
}
```

### **API Endpoints**
- `GET /api/analytics/overview` - Dashboard overview metrics
- `GET /api/analytics/campaigns/{id}` - Campaign-specific analytics
- `GET /api/analytics/reviews` - Review analytics
- `GET /api/analytics/export` - Export analytics data
- `GET /api/reports/generate` - Generate custom reports

### **Report Types**
- Campaign performance reports
- Guest engagement reports
- Review summary reports
- Monthly/quarterly business reports
- Custom date range reports

### **Testable Deliverable**
✅ **Test:** View real-time dashboard metrics, generate various chart types, export data to CSV/PDF, and create custom date-range reports.

---

## 🎨 **Phase 9: UI/UX Polish & Mobile Optimization** (Week 10)

### **Objective**
Polish user interface and ensure mobile responsiveness.

### **Frontend Deliverables**
- Mobile-responsive design
- Loading states and error handling
- Toast notifications
- Improved user experience
- Accessibility improvements

### **UI/UX Improvements**
- **Responsive Design:**
  - Mobile-first approach
  - Tablet optimization
  - Desktop enhancements

- **User Experience:**
  - Loading skeletons
  - Error boundaries
  - Success/error notifications
  - Keyboard navigation
  - Screen reader support

- **Performance:**
  - Code splitting
  - Image optimization
  - Lazy loading
  - Caching strategies

### **Component Library**
```typescript
// Reusable UI components
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size: 'sm' | 'md' | 'lg' | 'xl';
}
```

### **Testing & Quality Assurance**
- Cross-browser testing
- Mobile device testing
- Performance testing
- Accessibility testing
- User acceptance testing

### **Testable Deliverable**
✅ **Test:** Access application on various devices and browsers, verify responsive design, test all interactive elements, and ensure smooth user experience.

---

## 🚀 **Phase 10: Demo Preparation & Deployment** (Week 11)

### **Objective**
Prepare production-ready demo environment with sample data.

### **Deployment Setup**
- **Frontend:** Vercel deployment
- **Backend:** Railway/Heroku deployment
- **Database:** Supabase production instance
- **Redis:** Redis Cloud or Railway Redis

### **Demo Environment**
- Sample hotel data
- Demo guest lists
- Pre-configured campaigns
- Simulated message flows
- Mock review responses

### **Demo Script**
1. **User Registration & Setup** (2 minutes)
   - Create account and organization
   - Configure WhatsApp and email settings

2. **CSV Upload Demo** (3 minutes)
   - Upload sample guest CSV
   - Show column mapping
   - Preview and import data

3. **Campaign Creation** (4 minutes)
   - Create WhatsApp campaign
   - Design message template
   - Enable AI personalization
   - Preview personalized messages

4. **Campaign Execution** (3 minutes)
   - Start campaign
   - Show real-time message sending
   - Display delivery status

5. **Guest Interaction Demo** (4 minutes)
   - Simulate guest replies
   - Show sentiment analysis
   - Demonstrate automated responses
   - Show escalation workflow

6. **Analytics Dashboard** (4 minutes)
   - Display campaign metrics
   - Show review analytics
   - Generate and export reports

### **Production Checklist**
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database migrations applied
- [ ] API rate limiting enabled
- [ ] Error monitoring setup (Sentry)
- [ ] Backup procedures configured
- [ ] Performance monitoring enabled
- [ ] Security headers configured

### **Documentation**
- API documentation (Swagger/OpenAPI)
- User guide and tutorials
- Admin setup instructions
- Troubleshooting guide
- Integration documentation

### **Testable Deliverable**
✅ **Test:** Complete end-to-end demo flow, verify all features work in production environment, test with real WhatsApp and email accounts, and validate performance under load.

---

## 🎯 **Success Criteria for Each Phase**

| Phase | Success Criteria | Testing Method |
|-------|------------------|----------------|
| 0 | Authentication works, sidebar renders | Manual login/logout test |
| 1 | CSV uploads and parses correctly | Upload sample CSV file |
| 2 | Campaigns create with templates | Create and preview campaign |
| 3 | WhatsApp messages send successfully | Send to test number |
| 4 | Emails send via Resend | Send test email |
| 5 | AI generates personalized messages | Compare AI vs template output |
| 6 | Guest replies are processed | Send test replies |
| 7 | Google reviews are fetched | Connect test business account |
| 8 | Analytics display correctly | View dashboard metrics |
| 9 | Mobile interface works | Test on mobile devices |
| 10 | Full demo runs smoothly | Complete demo script |

---

## 🔧 **Development Environment Setup**

### **Prerequisites**
- Node.js 18+
- Python 3.11+
- Redis server
- Supabase account
- OpenAI API key
- Resend API key
- WhatsApp Business API access

### **Quick Start Commands**
```bash
# Frontend setup
npx create-next-app@latest review-automation-frontend --typescript --tailwind --eslint
cd review-automation-frontend
npm install @headlessui/react @heroicons/react

# Backend setup
mkdir review-automation-backend
cd review-automation-backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install fastapi uvicorn supabase openai resend redis rq

# Database setup
# Create Supabase project and get connection string
# Run database migrations
```

### **Environment Variables**
```env
# Backend .env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_key
RESEND_API_KEY=your_resend_key
WHATSAPP_ACCESS_TOKEN=client_whatsapp_token
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret

# Frontend .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 📋 **Final Deliverables**

1. **Complete SaaS Application**
   - Responsive web application
   - RESTful API backend
   - Database with sample data

2. **Integration Capabilities**
   - WhatsApp Business API
   - Resend email service
   - Google Reviews API
   - OpenAI GPT-4 Mini

3. **Demo Environment**
   - Production deployment
   - Sample data and scenarios
   - Demo script and presentation

4. **Documentation**
   - Technical documentation
   - User guides
   - API documentation
   - Setup instructions

This phase-wise plan ensures each deliverable is testable and builds upon the previous phase, creating a robust and scalable Review Automation SaaS platform.