import { useMemo, useState } from "react";
import type { Session } from "../lib/api";

type Tab = "headers" | "request" | "response" | "timing";

function prettyBody(body: string | null, contentType: string | null): string {
  if (body == null) return "(empty)";
  if (contentType && contentType.toLowerCase().includes("json")) {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }
  const trimmed = body.trim();
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      /* fall through */
    }
  }
  return body;
}

function HeadersView({ headers }: { headers: Record<string, string> }) {
  const entries = Object.entries(headers).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) {
    return <p className="text-sm text-zinc-500">No headers</p>;
  }
  return (
    <dl className="space-y-1 font-mono text-xs">
      {entries.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[140px_1fr] gap-2 border-b border-zinc-800/60 py-1">
          <dt className="text-cyan-500/90">{k}</dt>
          <dd className="break-all text-zinc-300">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DetailPanel({
  session,
  loading,
}: {
  session: Session | null;
  loading: boolean;
}) {
  const [tab, setTab] = useState<Tab>("headers");

  const tabs: { id: Tab; label: string }[] = [
    { id: "headers", label: "Headers" },
    { id: "request", label: "Request" },
    { id: "response", label: "Response" },
    { id: "timing", label: "Timing" },
  ];

  const reqPretty = useMemo(
    () => prettyBody(session?.reqBody ?? null, session?.reqHeaders?.["content-type"] ?? null),
    [session]
  );
  const resPretty = useMemo(
    () => prettyBody(session?.resBody ?? null, session?.contentType ?? null),
    [session]
  );

  if (!session && !loading) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-zinc-500">
        Select a session to inspect
      </div>
    );
  }

  if (loading && !session) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800 px-3 py-2">
        <div className="truncate font-mono text-xs text-zinc-400">{session.method} {session.url}</div>
        <div className="mt-1 flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded px-2 py-1 text-xs ${
                tab === t.id
                  ? "bg-cyan-900/50 text-cyan-200"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {tab === "headers" && (
          <div className="space-y-4">
            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Request Headers
              </h3>
              <HeadersView headers={session.reqHeaders} />
            </section>
            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Response Headers
              </h3>
              <HeadersView headers={session.resHeaders} />
            </section>
          </div>
        )}

        {tab === "request" && (
          <pre className="whitespace-pre-wrap break-all rounded bg-zinc-950 p-2 font-mono text-xs text-zinc-300">
            {reqPretty}
          </pre>
        )}

        {tab === "response" && (
          <pre className="whitespace-pre-wrap break-all rounded bg-zinc-950 p-2 font-mono text-xs text-zinc-300">
            {resPretty}
          </pre>
        )}

        {tab === "timing" && (
          <dl className="space-y-2 font-mono text-xs">
            <div className="flex justify-between border-b border-zinc-800 py-1">
              <dt className="text-zinc-500">Started</dt>
              <dd>{new Date(session.startedAt).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between border-b border-zinc-800 py-1">
              <dt className="text-zinc-500">Duration</dt>
              <dd>{session.durationMs != null ? `${session.durationMs} ms` : "—"}</dd>
            </div>
            <div className="flex justify-between border-b border-zinc-800 py-1">
              <dt className="text-zinc-500">Req size</dt>
              <dd>{session.reqSize} B</dd>
            </div>
            <div className="flex justify-between border-b border-zinc-800 py-1">
              <dt className="text-zinc-500">Res size</dt>
              <dd>{session.resSize} B</dd>
            </div>
            <div className="flex justify-between border-b border-zinc-800 py-1">
              <dt className="text-zinc-500">Kind</dt>
              <dd>{session.kind}</dd>
            </div>
            {session.error && (
              <div className="flex justify-between border-b border-zinc-800 py-1 text-rose-400">
                <dt>Error</dt>
                <dd>{session.error}</dd>
              </div>
            )}
          </dl>
        )}
      </div>
    </div>
  );
}
