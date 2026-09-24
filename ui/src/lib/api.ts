export const INSPECTOR_BASE = "http://127.0.0.1:8888/__inspector__";

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

export interface Status {
  ok: boolean;
  proxyPort: number;
  sessionCount: number;
  phase: string;
}

export async function fetchStatus(): Promise<Status | null> {
  try {
    const res = await fetch(`${INSPECTOR_BASE}/status`);
    if (!res.ok) return null;
    return (await res.json()) as Status;
  } catch {
    return null;
  }
}

export async function fetchSessions(): Promise<SessionSummary[]> {
  const res = await fetch(`${INSPECTOR_BASE}/sessions`);
  if (!res.ok) throw new Error(`sessions ${res.status}`);
  return (await res.json()) as SessionSummary[];
}

export async function fetchSession(id: string): Promise<Session> {
  const res = await fetch(`${INSPECTOR_BASE}/sessions/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`session ${res.status}`);
  return (await res.json()) as Session;
}

export async function clearSessions(): Promise<void> {
  const res = await fetch(`${INSPECTOR_BASE}/sessions`, { method: "DELETE" });
  if (!res.ok) throw new Error(`clear ${res.status}`);
}
