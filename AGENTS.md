# AGENTS.md

This file provides guidance to AI coding agents (including Claude Code, claude.ai/code) when working with code in this repository.

## What this is

A PWA that provides a **local voice layer for coding agents**. It connects a browser to the xAI Voice API (Leo voice, real-time WebSocket) for spoken interaction, and renders streaming "generative UI" driven by agent tool-call events. The app is bootstrapped/maintained via [v0](https://v0.app) — merges to `main` auto-deploy on Vercel, and v0 may push commits directly.

### Where this sits in the stack (important)

This app is **middleware**, not the agent itself:

- **xAI / Grok Voice** is only the speech transport — STT (your voice → text) and TTS (agent text → Leo's voice). It is not the brain; it does not run tools.
- **The agent runtime lives below this layer and will be the PI SDK (pi.dev).** When the agent harness is added, it talks to the PI SDK; this app connects to that harness over the event boundary described below — it does not embed the agent logic.

So the data flow is: **user speech → xAI STT → (transcript routed to) PI SDK agent runtime → agent emits tool-call/UI events → this app renders them → agent text → xAI TTS → user hears Leo.** Keep voice (xAI) and reasoning/tool-execution (PI SDK) as separate concerns; this app is the glue and the UI.

## Commands

Package manager is **pnpm** (a `pnpm-lock.yaml` is committed; do not introduce npm/yarn lockfiles).

```bash
pnpm install
pnpm dev      # next dev — http://localhost:3000
pnpm build    # next build
pnpm start    # serve production build
pnpm lint     # eslint .
```

There is **no test framework configured** — no `test` script, no test runner, no test files. Don't claim tests pass; verify changes by running the app.

`./scripts/tunnel.sh [port]` / `./scripts/tunnel-stop.sh` expose the local dev server over a Tailscale HTTPS tunnel (optionally Funnel for public access), used to reach the PWA from a phone.

## Environment variables

Create `.env.local`:
- `XAI_API_KEY` — required for voice; used **server-side only** in `app/api/voice/session/route.ts` to mint ephemeral tokens. Never expose it to the client.
- `AGENT_EVENT_URL` — optional. If set, `/api/events/stream` proxies this real agent SSE endpoint; if unset, it falls back to `lib/events/mock-events.ts` (demo mode). **This is the integration point for the PI SDK (pi.dev) agent runtime** — the agent harness, once built, exposes the event stream here.

## Build gotchas

`next.config.mjs` sets `typescript.ignoreBuildErrors: true` and `images.unoptimized: true`. **`pnpm build` will NOT catch type errors** — run `pnpm lint` and reason about types manually. TypeScript is otherwise `strict`. Path alias `@/*` maps to the repo root (e.g. `@/components`, `@/lib`).

## Architecture

Two largely independent subsystems feed the single page at `app/page.tsx` (wrapped in `VoiceProvider`):

### 1. Voice layer (`lib/voice/`, `components/voice/`)
Real-time audio I/O with xAI Voice over WebSocket.
- `lib/voice/xai-client.ts` — `XAIVoiceClient`, the core. Fetches an ephemeral token from `/api/voice/session`, opens `wss://api.x.ai/v1/realtime`, sends a session config (server VAD, `pcm16`), and dispatches inbound message types (`response.audio.delta`, transcripts, `response.function_call_arguments.done` → `onToolCall`, etc.). Handles heartbeat, exponential-backoff reconnect, and token refresh.
- `lib/voice/audio-processor.ts` — mic capture via `getUserMedia` + AudioWorklet (`/public/worklet/audio-processor.js`), emits base64 PCM16 chunks.
- `lib/voice/audio-player.ts` — buffered low-latency playback with ducking.
- `lib/voice/timing.ts` — `TIMING_CONFIG`: all buffer/VAD/reconnect/sample-rate constants live here. Tune audio behavior here, not inline.
- `components/voice/voice-provider.tsx` — React context (`useVoice()`) that owns a `XAIVoiceClient` ref and surfaces state + actions (`connect`, `startListening`, `interrupt`, `sendText`).

### 2. Generative UI layer (`lib/events/`, `components/agent-ui/`)
Agent emits events; the client renders components from them.
- `lib/events/event-types.ts` — the `AgentEvent` union (tool-call lifecycle, `text_delta`/`text_done`, `ui_render`/`ui_patch`) plus SSE parse/format helpers.
- `lib/events/event-source.ts` — `AgentEventSource`, a fetch-based SSE reader (not the native `EventSource`).
- `app/api/events/stream/route.ts` — SSE endpoint; proxies `AGENT_EVENT_URL` (the PI SDK agent runtime, once wired in) or streams mock events. This is the seam where the PI SDK agent harness plugs in — the app consumes its event stream rather than running agent logic itself.
- `components/agent-ui/renderer.tsx` — `AgentRenderer` takes the `AgentEvent[]`, derives streaming text, a tool-call status map, and `ui_render` specs, and renders them.
- `components/agent-ui/registry.tsx` — `componentRegistry`: maps spec `type` strings → React components. The renderer looks up components here.
- `components/agent-ui/catalog.ts` — Zod schemas (`componentSchemas`) + `catalogMeta` describing each component's props, intended for validation and for prompting the model.

### Adding a generative-UI component
Touch all three: add a Zod schema to `catalog.ts`, register the component in `registry.tsx`, and (for non-trivial ones) add the implementation under `components/agent-ui/components/`.

## Conventions & sharp edges

- **Two divergent `UISpec` shapes exist.** `lib/events/event-types.ts` defines `{ type, props, children }` — this is what `AgentRenderer`/`registry` actually consume. `components/agent-ui/catalog.ts` defines a different `{ component, props, children, id }` plus `validateSpec`. They are not unified; when wiring events to rendering, follow the **event-types** shape.
- **The `@json-render/*` packages are dependencies but the runtime renderer is hand-rolled** in `renderer.tsx`/`registry.tsx`. Comments mention "json-render" but the actual rendering does not import those packages — don't assume json-render runtime behavior.
- **UI primitives** live in `components/ui/` (shadcn/ui, "new-york" style, ~57 components). Reuse them; import via `@/components/ui/*`. App is dark-mode-first (`<html className="dark">`).
- **PWA**: `app/layout.tsx` registers a service worker (`/public/sw.js`, production only) and references `/public/manifest.json`. Mobile constraints matter — see `VOICE_AGENT_README.md` (iOS AudioContext resume on gesture, Android wake lock, 44px touch targets, viewport zoom disabled).
- Client components (voice, renderer, providers) need `'use client'`; API routes and server logic must keep `XAI_API_KEY` server-side.

See `VOICE_AGENT_README.md` for the deeper voice/PWA design notes and the agent-event integration contract.
