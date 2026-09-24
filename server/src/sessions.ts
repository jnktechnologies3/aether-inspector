import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");
const JSONL_PATH = path.join(DATA_DIR, "sessions.jsonl");

const MAX_REQ_BODY = 256 * 1024;
const MAX_RES_BODY = 512 * 1024;

export interface SessionSummary {
  id: string;
  method: string;
  url: string;
  host: string;
  status: number | null;
  contentType: string | null;
  reqSize: number;
  resSize: number;
  durationMs: number | null;
  startedAt: string;
  kind: "http" | "connect";
}

export interface Session extends SessionSummary {
  reqHeaders: Record<string, string>;
  resHeaders: Record<string, string>;
  reqBody: string | null;
  resBody: string | null;
  error?: string;
}

type Listener = (session: Session) => void;

const sessions = new Map<string, Session>();
const listeners = new Set<Listener>();
let seq = 0;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function nextId(): string {
  seq += 1;
  return `s_${Date.now()}_${seq}`;
}

function truncate(buf: Buffer | string | null | undefined, max: number): { text: string | null; size: number } {
  if (buf == null) return { text: null, size: 0 };
  const raw = Buffer.isBuffer(buf) ? buf : Buffer.from(String(buf));
  const size = raw.length;
  if (size === 0) return { text: "", size: 0 };
  const clipped = size > max ? raw.subarray(0, max) : raw;
  const asText = clipped.toString("utf8");
  const looksBinary = /\u0000/.test(asText);
  if (looksBinary) {
    return { text: `[binary ${size} bytes, showing first ${clipped.length} as base64]\n${clipped.toString("base64")}`, size };
  }
  if (size > max) {
    return { text: asText + `\n… [truncated, ${size} bytes total]`, size };
  }
  return { text: asText, size };
}

function headersToObject(headers: Record<string, string | string[] | undefined> | NodeJS.Dict<string | string[]>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (v == null) continue;
    out[k.toLowerCase()] = Array.isArray(v) ? v.join(", ") : String(v);
  }
  return out;
}

function appendJsonl(session: Session) {
  ensureDataDir();
  fs.appendFileSync(JSONL_PATH, JSON.stringify(session) + "\n", "utf8");
}

function emit(session: Session) {
  for (const fn of listeners) {
    try {
      fn(session);
    } catch {
      /* ignore listener errors */
    }
  }
}

export function onSession(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function listSessions(): SessionSummary[] {
  return Array.from(sessions.values())
    .map((s) => ({
      id: s.id,
      method: s.method,
      url: s.url,
      host: s.host,
      status: s.status,
      contentType: s.contentType,
      reqSize: s.reqSize,
      resSize: s.resSize,
      durationMs: s.durationMs,
      startedAt: s.startedAt,
      kind: s.kind,
    }))
    .reverse();
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function clearSessions(): number {
  const n = sessions.size;
  sessions.clear();
  ensureDataDir();
  fs.writeFileSync(JSONL_PATH, "", "utf8");
  return n;
}

export function sessionCount(): number {
  return sessions.size;
}

export function captureHttp(opts: {
  method: string;
  url: string;
  host: string;
  reqHeaders: Record<string, string | string[] | undefined> | NodeJS.Dict<string | string[]>;
  resHeaders: Record<string, string | string[] | undefined> | NodeJS.Dict<string | string[]>;
  status: number;
  reqBody?: Buffer | string | null;
  resBody?: Buffer | string | null;
  durationMs: number;
  startedAt?: Date;
}): Session {
  const req = truncate(opts.reqBody, MAX_REQ_BODY);
  const res = truncate(opts.resBody, MAX_RES_BODY);
  const resHeaders = headersToObject(opts.resHeaders);
  const session: Session = {
    id: nextId(),
    method: opts.method.toUpperCase(),
    url: opts.url,
    host: opts.host,
    status: opts.status,
    contentType: resHeaders["content-type"] ?? null,
    reqSize: req.size,
    resSize: res.size,
    durationMs: opts.durationMs,
    startedAt: (opts.startedAt ?? new Date()).toISOString(),
    kind: "http",
    reqHeaders: headersToObject(opts.reqHeaders),
    resHeaders,
    reqBody: req.text,
    resBody: res.text,
  };
  sessions.set(session.id, session);
  appendJsonl(session);
  emit(session);
  return session;
}

export function captureConnect(opts: {
  url: string;
  status: number;
  error?: string;
  durationMs?: number;
}): Session {
  const session: Session = {
    id: nextId(),
    method: "CONNECT",
    url: opts.url,
    host: opts.url.split(":")[0] ?? opts.url,
    status: opts.status,
    contentType: null,
    reqSize: 0,
    resSize: 0,
    durationMs: opts.durationMs ?? null,
    startedAt: new Date().toISOString(),
    kind: "connect",
    reqHeaders: {},
    resHeaders: {},
    reqBody: null,
    resBody: null,
    error: opts.error,
  };
  sessions.set(session.id, session);
  appendJsonl(session);
  emit(session);
  return session;
}

export function loadFromDisk() {
  ensureDataDir();
  if (!fs.existsSync(JSONL_PATH)) return;
  const lines = fs.readFileSync(JSONL_PATH, "utf8").split("\n").filter(Boolean);
  for (const line of lines) {
    try {
      const s = JSON.parse(line) as Session;
      sessions.set(s.id, s);
    } catch {
      /* skip bad lines */
    }
  }
}
