// xAI Voice session endpoint
// Generates ephemeral tokens for secure browser-side WebSocket connections

import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'XAI_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    // Request ephemeral token from xAI
    const response = await fetch('https://api.x.ai/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-voice-latest',
        voice: 'leo',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Voice Session] xAI error:', error);
      return NextResponse.json(
        { error: 'Failed to create voice session' },
        { status: response.status }
      );
    }

    const session = await response.json();

    // Return ephemeral token (valid for ~60 seconds)
    return NextResponse.json({
      token: session.client_secret?.value || session.token,
      expires_at: session.client_secret?.expires_at || 
        new Date(Date.now() + 60000).toISOString(),
      session_id: session.id,
    });
  } catch (error) {
    console.error('[Voice Session] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
