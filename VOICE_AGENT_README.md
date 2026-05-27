# Voice Agent - Local Voice Layer for Coding Agents

A PWA that provides a voice interface for coding agents using xAI Voice API (Leo voice) with streaming generative UI powered by Vercel's json-render.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# In another terminal, set up secure tunnel (optional)
./scripts/tunnel.sh
```

## Environment Variables

Create a `.env.local` file:

```env
# Required for voice features
XAI_API_KEY=your_xai_api_key

# Optional: Connect to a real coding agent
AGENT_EVENT_URL=http://localhost:8080/events
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     LOCAL ENVIRONMENT                            │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │ Coding Agent │───▶│ Event Bridge │───▶│  PWA (Browser)   │  │
│  │ (Tool Calls) │    │  (SSE/WS)    │    │  - Voice I/O     │  │
│  └──────────────┘    └──────────────┘    │  - Generative UI │  │
│                             │            └────────┬─────────┘  │
│                             ▼                     │             │
│                    ┌──────────────┐               │             │
│                    │  Tailscale   │◀──────────────┘             │
│                    │   Tunnel     │                             │
│                    └──────┬───────┘                             │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ▼
                   ┌──────────────┐
                   │ xAI Voice API│
                   │ (Leo voice)  │
                   └──────────────┘
```

## Features

### Voice Layer (xAI Voice API)
- Real-time WebSocket connection to xAI Voice
- Leo voice (authoritative, instructional tone)
- Server-side VAD (Voice Activity Detection)
- Ephemeral tokens for browser security
- Timing buffers for smooth audio (250ms chunks, 500ms playback buffer)

### Audio I/O
- Browser MediaRecorder + AudioWorklet for PCM16 input
- Web Audio API for low-latency playback
- iOS AudioContext resume on user gesture
- Android wake lock for background audio
- Echo cancellation and noise suppression

### Generative UI (json-render)
- Streaming UI specs from agent events
- 15+ agent-specific components:
  - **Status**: ToolStatus, ProgressBar, Spinner, StepList
  - **Code**: CodeBlock, FileDiff, FileTree, Terminal
  - **Data**: DataTable, MetricCard, ErrorCard, SuccessCard
  - **Interactive**: ChoiceList, InputPrompt, ConfirmDialog
  - **Layout**: Stack, Grid, Card, Collapsible

### PWA
- Installable on mobile and desktop
- Service worker for offline support
- Mobile-optimized touch targets (44px minimum)

## Tailscale Tunnel Setup

The tunnel allows secure access to your local dev server:

```bash
# Start tunnel (creates HTTPS endpoint)
./scripts/tunnel.sh

# Stop tunnel
./scripts/tunnel-stop.sh
```

### Prerequisites
1. Install Tailscale: https://tailscale.com/download
2. Create a Tailscale account and connect your device
3. Run the tunnel script

### Optional: Public Access (Funnel)
The tunnel script can optionally enable Tailscale Funnel for public internet access. Use with caution.

## Component Library

The agent can dynamically render these components via the event stream:

```typescript
// Example: Agent sends a tool status
{
  type: 'ui_render',
  spec: {
    type: 'ToolStatus',
    props: {
      toolName: 'Read',
      status: 'running',
    }
  }
}

// Example: Agent sends a code block
{
  type: 'ui_render',
  spec: {
    type: 'CodeBlock',
    props: {
      code: 'const x = 1;',
      language: 'typescript',
      filename: 'example.ts'
    }
  }
}
```

## Event Types

```typescript
type AgentEvent = 
  | { type: 'tool_call_start'; id: string; toolName: string }
  | { type: 'tool_call_input'; id: string; input: unknown }
  | { type: 'tool_call_output'; id: string; output: unknown }
  | { type: 'tool_call_error'; id: string; error: string }
  | { type: 'text_delta'; delta: string }
  | { type: 'text_done'; text: string }
  | { type: 'ui_render'; spec: UISpec }
```

## Integration with Coding Agent

To connect to a real coding agent, set `AGENT_EVENT_URL` to your agent's SSE endpoint. The endpoint should stream events in the format above.

Example agent integration:

```typescript
// Your coding agent emits events
eventEmitter.emit('tool_call_start', {
  type: 'tool_call_start',
  id: 'tool_1',
  toolName: 'Read',
  timestamp: Date.now()
});
```

## Mobile Considerations

- **iOS**: AudioContext requires user gesture to resume
- **Android**: Wake lock keeps audio playing in background
- **Touch targets**: All interactive elements are 44px minimum
- **Input zoom**: Disabled via viewport meta tag
