// SSE endpoint for agent events
// Streams tool calls and UI patches to the client

import { NextRequest } from 'next/server';
import { createMockEventStream } from '@/lib/events/mock-events';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Check for external agent URL
  const agentUrl = process.env.AGENT_EVENT_URL;

  if (agentUrl) {
    // Proxy to real agent event source
    try {
      const response = await fetch(agentUrl, {
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        signal: request.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('Agent connection failed');
      }

      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-store',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    } catch (error) {
      console.error('[Events] Agent proxy error:', error);
      // Fall through to mock events
    }
  }

  // Use mock events for demo
  const stream = await createMockEventStream();

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

// POST endpoint to send commands to agent
export async function POST(request: NextRequest) {
  const agentUrl = process.env.AGENT_EVENT_URL;

  if (!agentUrl) {
    return Response.json(
      { error: 'No agent configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    
    const response = await fetch(agentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error('[Events] Agent command error:', error);
    return Response.json(
      { error: 'Failed to send command' },
      { status: 500 }
    );
  }
}
