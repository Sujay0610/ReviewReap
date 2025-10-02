import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/campaigns/${params.id}/pause`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add auth headers when authentication is implemented
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error pausing campaign:', error);
    return NextResponse.json(
      { detail: 'Failed to pause campaign' },
      { status: 500 }
    );
  }
}