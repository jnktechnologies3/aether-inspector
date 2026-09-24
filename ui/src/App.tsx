import { StatusPill } from "./components/StatusPill";
import { SessionTable } from "./components/SessionTable";
import { DetailPanel } from "./components/DetailPanel";
import { useInspector } from "./hooks/useInspector";

export default function App() {
  const {
    status,
    sessions,
    selectedId,
    setSelectedId,
    detail,
    filter,
    setFilter,
    loadingDetail,
    onClear,
  } = useInspector();

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="flex items-center gap-4 border-b border-zinc-800 bg-zinc-900/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight text-cyan-400">Aether Inspector</span>
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium uppercase text-zinc-400">
            Phase 1 · HTTP
          </span>
        </div>
        <StatusPill status={status} />
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => onClear()}
            className="rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
          >
            Clear
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-zinc-800 px-4 py-2">
            <input
              type="search"
              placeholder="Filter by method, status, host, URL…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-600 focus:outline-none"
            />
          </div>
          <SessionTable
            sessions={sessions}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </main>

        <aside className="w-[420px] shrink-0 border-l border-zinc-800 bg-zinc-900/40">
          <DetailPanel session={detail} loading={loadingDetail} />
        </aside>
      </div>
    </div>
  );
}
