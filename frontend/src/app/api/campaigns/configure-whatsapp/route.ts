import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/api/campaigns/configure-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add auth headers when authentication is implemented
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error configuring WhatsApp:', error);
    return NextResponse.json(
      { detail: 'Failed to configure WhatsApp' },
      { status: 500 }
    );
  }
}