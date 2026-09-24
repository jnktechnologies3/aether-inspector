# Changelog

## [0.1.0] — 2026-09-24

### Added (Phase 0 / Phase 1)
- Local HTTP proxy on `127.0.0.1:8888` (absolute-form + CONNECT tunnel)
- Inspector API under `/__inspector__/*` (status, sessions, SSE events)
- Session capture with truncated bodies (req 256KB / res 512KB) and JSONL persistence
- Dark ops console UI on port 5174 (Vite + React + Tailwind v4)
- Smoke test via `npm run smoke`
