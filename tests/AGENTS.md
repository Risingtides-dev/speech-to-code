# Event client tests

## Purpose

Regressions for the pure TypeScript event client using Node's built-in test runner.

## Ownership

- `event-source.test.cjs` owns connection ownership, cancellation and reader cleanup.

## Local Contracts

- Mock fetch and streams; never contact a provider or require credentials.
- Compile the client with the existing locked TypeScript compiler into an owned
  temporary directory. Remove only that directory after tests.
- Restore global mocks and drive races with controlled promises, not timing sleeps.

## Work Guidance

- Cover observable events, state transitions and resource release.

## Verification

- Run `pnpm test` and `pnpm typecheck` from the repository root.

## Child devlog Index

- No child devlogs.
