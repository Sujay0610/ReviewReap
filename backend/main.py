from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
import uvicorn
import logging
from datetime import datetime

# Load environment variables
load_dotenv()

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Review Automation SaaS API...")
    yield
    # Shutdown
    logger.info("Shutting down Review Automation SaaS API...")

from routes import guests, upload, campaigns, campaign_execution, webhooks, ai, google_reviews, customers
from api import conversations

# Create FastAPI app
app = FastAPI(
    title="Review Automation SaaS API",
    description="API for Review Automation SaaS - Phase 0: Foundation & Authentication",
    version="1.0.0",
    lifespan=lifespan
)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(guests.router)
app.include_router(customers.router)
app.include_router(upload.router)
app.include_router(campaigns.router)
app.include_router(campaign_execution.router)
app.include_router(webhooks.router)
app.include_router(ai.router)
app.include_router(google_reviews.router)
app.include_router(conversations.router, prefix="/api")

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
    }

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Review Automation SaaS API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }





if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("RELOAD", "true").lower() == "true"
    )