# ReviewReap 🌟

**ReviewReap** is a comprehensive SaaS platform for automated review management and customer engagement. It helps businesses streamline their review collection process, manage customer relationships, and automate communication workflows.

## 🚀 Features

### Core Features
- **Customer Data Management**: Upload and manage customer information via CSV files
- **Review Campaign Automation**: Create and execute automated review request campaigns
- **Multi-Channel Communication**: Support for email and WhatsApp messaging
- **Guest Management**: Handle guest interactions and feedback
- **Conversation Tracking**: Monitor and manage customer conversations
- **Analytics Dashboard**: Track campaign performance and engagement metrics

### Advanced Features (Planned)
- **AI-Powered Responses**: Automated intelligent responses using OpenAI integration
- **Google Reviews Integration**: Direct integration with Google My Business
- **Email Automation**: Advanced email marketing capabilities with Resend
- **WhatsApp Business API**: Professional WhatsApp messaging integration

## 🏗️ Architecture

The project follows a modern full-stack architecture:

- **Frontend**: Next.js 15 with React 19, TypeScript, and Tailwind CSS
- **Backend**: FastAPI with Python, SQLAlchemy ORM
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT-based authentication with Supabase Auth
- **Deployment**: Ready for Vercel (frontend) and cloud deployment (backend)

## 📁 Project Structure

```
ReviewReap/
├── backend/                 # FastAPI backend application
│   ├── api/                # API route handlers
│   ├── database/           # Database configuration and tables
│   ├── models/             # Pydantic models
│   ├── routes/             # API endpoints
│   ├── services/           # Business logic services
│   ├── migrations/         # Database migration scripts
│   └── main.py            # FastAPI application entry point
├── frontend/               # Next.js frontend application
│   ├── src/
│   │   ├── app/           # Next.js app router pages
│   │   ├── components/    # Reusable React components
│   │   ├── contexts/      # React context providers
│   │   ├── hooks/         # Custom React hooks
│   │   └── pages/         # API routes and pages
│   └── public/            # Static assets
├── migrations/             # Database schema migrations
└── docs/                  # Project documentation
```

## 🛠️ Installation & Setup

### Prerequisites

- **Node.js** 18+ and npm/yarn
- **Python** 3.8+
- **Supabase** account and project
- **Git** for version control

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment configuration**:
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your configuration:
   ```env
   # Supabase Configuration
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # JWT Configuration
   JWT_SECRET_KEY=your_jwt_secret_key
   JWT_ALGORITHM=HS256
   JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
   
   # Optional: Future integrations
   OPENAI_API_KEY=your_openai_api_key
   RESEND_API_KEY=your_resend_api_key
   WHATSAPP_BUSINESS_ACCESS_TOKEN=your_whatsapp_token
   ```

5. **Run the backend server**:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

   The API will be available at `http://localhost:8000`
   API documentation: `http://localhost:8000/docs`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment configuration**:
   Create `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

   The application will be available at `http://localhost:3000`

## 🗄️ Database Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com)

2. **Run database migrations**:
   Execute the SQL files in the `migrations/` directory in your Supabase SQL editor:
   - `database_schema.sql` - Main schema
   - `phase1_schema.sql` - Phase 1 specific tables
   - Additional migration files as needed

3. **Configure Row Level Security (RLS)**:
   Apply the security policies from `fix_policies.sql` and `fix_policies_v2.sql`

## 📚 API Documentation

### Authentication Endpoints
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Refresh access token

### Customer Management
- `GET /customers` - List all customers
- `POST /customers` - Create new customer
- `PUT /customers/{id}` - Update customer
- `DELETE /customers/{id}` - Delete customer

### Campaign Management
- `GET /campaigns` - List campaigns
- `POST /campaigns` - Create campaign
- `POST /campaigns/{id}/execute` - Execute campaign

### File Upload
- `POST /upload/csv/preview` - Preview CSV data
- `POST /upload/csv/process/{id}` - Process uploaded CSV

### Conversations
- `GET /conversations` - List conversations
- `POST /conversations` - Create conversation
- `GET /conversations/{id}/messages` - Get conversation messages

## 🎨 Frontend Components

### Key Components
- **Dashboard**: Main analytics and overview
- **CustomerUpload**: CSV file upload and processing
- **CampaignExecution**: Campaign management interface
- **ConversationView**: Customer conversation interface
- **AIConfiguration**: AI settings and configuration

### UI Components
Built with Radix UI and Tailwind CSS:
- Form components (Input, Select, Textarea)
- Navigation (Sidebar, Tabs)
- Feedback (Toast notifications, Alerts)
- Data display (Cards, Tables, Charts)

## 🔧 Development

### Running Tests
```bash
# Backend tests
cd backend
python -m pytest

# Frontend tests
cd frontend
npm run test
```

### Code Formatting
```bash
# Backend (Python)
black backend/
isort backend/

# Frontend (TypeScript/React)
cd frontend
npm run lint
npm run format
```

### Building for Production
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm run build
npm start
```

## 🚀 Deployment

### Backend Deployment
- Deploy to platforms like Railway, Render, or AWS
- Ensure environment variables are configured
- Set up database connection to Supabase

### Frontend Deployment
- Deploy to Vercel (recommended) or Netlify
- Configure environment variables
- Set up domain and SSL

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the [documentation](docs/)
- Review the API documentation at `/docs` endpoint

---

**Built with ❤️ for better customer engagement**
