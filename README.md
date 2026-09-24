# Aether Inspector

Fiddler-style local HTTP traffic inspector for developers. Phase 0/1: cleartext HTTP proxy + dark ops console.

**Repo:** https://github.com/jnktechnologies3/aether-inspector

## Ports

| Service | Bind |
|---------|------|
| UI (Vite) | `http://127.0.0.1:5174` |
| Proxy + Inspector API | `http://127.0.0.1:8888` |

Do **not** use 5173 or 4173.

## Quick start

```bash
cd aether-inspector
npm install
npm run dev
```

Open the UI: http://127.0.0.1:5174

### Capture with curl

```bash
curl -x http://127.0.0.1:8888 http://example.com
curl -x http://127.0.0.1:8888 http://httpbin.org/get
```

Absolute-form requests (`GET http://host/path HTTP/1.1`) are required — that is what `curl -x` sends.

### Browser proxy notes

Point the browser’s HTTP proxy to `127.0.0.1:8888`. HTTPS sites will show as `CONNECT` tunnels only (no decrypt in Phase 1). Prefer curl or HTTP-only sites for body inspection.

### Smoke test

```bash
npm run smoke
```

Spawns the proxy if needed, runs `curl -x` against example.com, asserts a session was captured.

## What works (Phase 1)

- HTTP forward proxy (absolute-form URLs)
- CONNECT blind TCP tunnel (HTTPS pass-through)
- Session capture: method, URL, host, status, headers, truncated bodies, duration
- Inspector API: `/__inspector__/status`, `/sessions`, SSE `/events`
- Dark React console with filter, table, detail tabs (Headers / Request / Response / Timing)
- JSONL persistence under `data/sessions.jsonl`

## What does not work yet

- **No HTTPS decrypt** — CONNECT is opaque; you will not see TLS request/response bodies
- No WebSocket frame inspection
- No rewrite / breakpoint / replay
- No system certificate install helpers

See [docs/PHASES.md](docs/PHASES.md) for the roadmap.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run proxy` | Start proxy only |
| `npm run ui` | Start UI only |
| `npm run dev` | Both (concurrently) |
| `npm run build` | Production UI build |
| `npm run smoke` | End-to-end smoke |

## License

MIT
