# Source verification

## Purpose

Lightweight pull-request checks for the event client and TypeScript source.

## Ownership

- `workflows/source-checks.yml` owns the Node test and compiler job.

## Local Contracts

- Keep credentials and runtime/provider calls out of source checks.
- Use the committed pnpm lockfile and cancel superseded PR runs.
- Vercel owns preview builds; this workflow does not deploy.

## Work Guidance


## Verification

- The source-checks job runs `pnpm test` and `pnpm typecheck`.

## Child devlog Index

- No child devlogs.
