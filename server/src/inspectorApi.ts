import type { IncomingMessage, ServerResponse } from "node:http";
import {
  clearSessions,
  getSession,
  listSessions,
  onSession,
  sessionCount,
  type Session,
} from "./sessions.js";

const PROXY_PORT = 8888;
const CORS_ORIGIN = "http://127.0.0.1:5174";

function setCors(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function json(res: ServerResponse, status: number, body: unknown) {
  setCors(res);
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function notFound(res: ServerResponse) {
  json(res, 404, { error: "not_found" });
}

/** Returns true if the request was handled as an inspector API call. */
export function handleInspectorApi(req: IncomingMessage, res: ServerResponse): boolean {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);
  if (!url.pathname.startsWith("/__inspector__")) {
    return false;
  }

  if (req.method === "OPTIONS") {
    setCors(res);
    res.writeHead(204);
    res.end();
    return true;
  }

  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (path === "/__inspector__/status" && req.method === "GET") {
    json(res, 200, {
      ok: true,
      proxyPort: PROXY_PORT,
      sessionCount: sessionCount(),
      phase: "1-http",
    });
    return true;
  }

  if (path === "/__inspector__/sessions" && req.method === "GET") {
    json(res, 200, listSessions());
    return true;
  }

  if (path === "/__inspector__/sessions" && req.method === "DELETE") {
    const cleared = clearSessions();
    json(res, 200, { cleared });
    return true;
  }

  const match = path.match(/^\/__inspector__\/sessions\/([^/]+)$/);
  if (match && req.method === "GET") {
    const session = getSession(decodeURIComponent(match[1]));
    if (!session) {
      notFound(res);
      return true;
    }
    json(res, 200, session);
    return true;
  }

  if (path === "/__inspector__/events" && req.method === "GET") {
    setCors(res);
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    res.write(`event: hello\ndata: ${JSON.stringify({ ok: true })}\n\n`);

    const send = (session: Session) => {
      res.write(`event: session\ndata: ${JSON.stringify(session)}\n\n`);
    };
    const unsub = onSession(send);

    const ping = setInterval(() => {
      res.write(`: ping ${Date.now()}\n\n`);
    }, 15000);

    req.on("close", () => {
      clearInterval(ping);
      unsub();
    });
    return true;
  }

  notFound(res);
  return true;
}

export { PROXY_PORT };
