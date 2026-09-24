# Aether Inspector — Phases

## Phase 0 — Scaffold ✅ done
- Monorepo-style single package with Vite React UI + Node proxy
- Ports locked: UI `5174`, proxy `8888`
- Docs, LICENSE, VERSION, CHANGELOG, smoke script

## Phase 1 — HTTP inspector ✅ current
- Forward HTTP proxy (absolute-form for `curl -x`)
- CONNECT blind tunnel sessions
- Capture store + JSONL
- Inspector REST + SSE under `/__inspector__/*`
- Dark ops console: status pill, filter, session table, detail drawer

## Phase 2 — HTTPS MITM (upcoming)
- Dynamic CA + per-host certs
- Decrypt TLS for inspection (opt-in, with trust warnings)
- Body capture for HTTPS

## Phase 3 — Filters & breakpoints (upcoming)
- Match rules (host, path, method, status)
- Pause / edit / resume requests and responses

## Phase 4 — Replay & composer (upcoming)
- Resend captured requests
- Manual request composer

## Phase 5 — WebSockets & streaming (upcoming)
- Frame-level WS capture
- SSE / chunked stream viewers

## Phase 6 — Rewrite engine (upcoming)
- Map remote → local files
- Header / body transforms

## Phase 7 — Persistence & export (upcoming)
- SQLite / searchable history
- HAR / JSON export

## Phase 8 — Desktop shell (upcoming)
- Electron / Tauri wrapper
- System proxy helpers (Windows / macOS / Linux)
