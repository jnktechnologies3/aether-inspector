import type { SessionSummary } from "../lib/api";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function statusColor(status: number | null): string {
  if (status == null) return "text-zinc-500";
  if (status >= 500) return "text-rose-400";
  if (status >= 400) return "text-amber-400";
  if (status >= 300) return "text-sky-400";
  if (status >= 200) return "text-emerald-400";
  return "text-zinc-300";
}

function methodColor(method: string): string {
  switch (method) {
    case "GET":
      return "text-cyan-400";
    case "POST":
      return "text-violet-400";
    case "PUT":
      return "text-amber-400";
    case "DELETE":
      return "text-rose-400";
    case "CONNECT":
      return "text-zinc-400";
    default:
      return "text-zinc-300";
  }
}

export function SessionTable({
  sessions,
  selectedId,
  onSelect,
}: {
  sessions: SessionSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 bg-zinc-900 text-[11px] uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-3 py-2 font-medium">Time</th>
            <th className="px-3 py-2 font-medium">Method</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">URL</th>
            <th className="px-3 py-2 font-medium text-right">Duration</th>
            <th className="px-3 py-2 font-medium text-right">Size</th>
          </tr>
        </thead>
        <tbody>
          {sessions.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-10 text-center text-zinc-500">
                No sessions yet. Try:{" "}
                <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-cyan-300">
                  curl -x http://127.0.0.1:8888 http://example.com
                </code>
              </td>
            </tr>
          ) : (
            sessions.map((s) => {
              const selected = s.id === selectedId;
              const t = new Date(s.startedAt);
              const time = t.toLocaleTimeString();
              return (
                <tr
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  className={`cursor-pointer border-t border-zinc-800/80 hover:bg-zinc-800/40 ${
                    selected ? "bg-cyan-950/40" : ""
                  }`}
                >
                  <td className="whitespace-nowrap px-3 py-1.5 font-mono text-xs text-zinc-400">
                    {time}
                  </td>
                  <td className={`px-3 py-1.5 font-mono text-xs font-semibold ${methodColor(s.method)}`}>
                    {s.method}
                  </td>
                  <td className={`px-3 py-1.5 font-mono text-xs ${statusColor(s.status)}`}>
                    {s.status ?? "—"}
                  </td>
                  <td className="max-w-[420px] truncate px-3 py-1.5 font-mono text-xs text-zinc-200" title={s.url}>
                    {s.url}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono text-xs text-zinc-400">
                    {s.durationMs != null ? `${s.durationMs} ms` : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono text-xs text-zinc-400">
                    {formatBytes(s.resSize)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
