# speech-to-code — agent contract

## Purpose

A Next.js PWA for xAI voice interaction and streamed agent UI. The checked-in app
has separate voice and event-rendering paths. It does not embed a native agent
runtime. README.md describes the v0/Vercel deployment connection; source checks
do not establish the currently deployed revision or a live Ocean connection.

## Ownership

- `lib/voice/` owns the xAI WebSocket client, microphone processing, audio
  playback, reconnect/session handling, and shared `TIMING_CONFIG` constants.
- `components/voice/` owns the React voice context and controls.
- `lib/events/event-types.ts` owns consumed events and the `{type, props,
  children}` UI spec; `event-source.ts` owns the fetch-based SSE reader.
- `app/api/events/stream/route.ts` proxies GET events and POST commands to
  `AGENT_EVENT_URL`. GET falls back to mock events when unset or upstream fails;
  POST returns 503 when unset. Mock output does not prove a live agent connection.
- `components/agent-ui/renderer.tsx` and `registry.tsx` own actual rendering;
  `catalog.ts` owns Zod schemas and metadata. Its separate
  `{component, props, children, id}` spec is not the event renderer's shape.
- `components/ui/` owns reusable shadcn primitives; `public/` owns the service
  worker, manifest, and microphone worklet. `VOICE_AGENT_README.md` has design notes.
- `events.md` is the append-only repository history; this file owns current rules.

## Local Contracts

- Keep `XAI_API_KEY` server-side in `/api/voice/session`; only ephemeral credentials
  go to the browser. The current voice is `leo` at `wss://api.x.ai/v1/realtime`.
- An external runtime, including a future Ocean integration, must use the existing
  event/command boundary. The current page's voice tool-call callback only logs;
  it does not dispatch tools to a native runtime.
- Keep provider calls, microphone access, tunnel changes and runtime deployment
  separate from local source checks. `scripts/tunnel.sh` and `tunnel-stop.sh`
  change Tailscale state; do not run them as build verification.
- Use pnpm and preserve `pnpm-lock.yaml`; do not add npm/yarn lockfiles.
- Client audio/rendering/providers need `'use client'`; keep credentials in server
  routes. `@/*` resolves from the repository root.
- Reuse existing UI primitives. Keep controls compact; no emojis, sparkle icons,
  marketing copy, or explanatory button strips in UI.

## Work Guidance

- Add generative UI components to `catalog.ts` and `registry.tsx`, with nontrivial
  implementations under `components/agent-ui/components/`.
- The runtime renderer is hand-written and does not import `@json-render/*`, even
  though those packages are dependencies. Follow the event-types spec at that seam.
- Preserve iOS gesture-driven AudioContext resume and mobile PWA constraints in
  `VOICE_AGENT_README.md`. Service-worker registration is production-only.
- Do not disable TypeScript build validation to bypass compiler failures.

## Verification

- `pnpm install --frozen-lockfile` installs the existing dependency graph.
- `pnpm typecheck` runs the compiler without emit or incremental state.
- `pnpm build` runs the production Next build, including TypeScript validation;
  `pnpm dev` and `pnpm start` run development and production servers respectively.
- No test runner or test script is configured. Do not report nonexistent tests.
- `pnpm lint` currently invokes an absent ESLint dependency/configuration; it is
  not a working gate. Type checking does not substitute for lint or live voice proof.
- `git diff --check` checks patch whitespace. Review docs against current source.

## Child devlog Index

- No child devlogs. This root owns all source, scripts and design notes.
