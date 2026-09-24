import type { Status } from "../lib/api";

export function StatusPill({ status }: { status: Status | null }) {
  const up = Boolean(status?.ok);
  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
        up
          ? "border-emerald-800/60 bg-emerald-950/50 text-emerald-300"
          : "border-rose-800/60 bg-rose-950/50 text-rose-300"
      }`}
      title={up ? `Proxy :${status?.proxyPort}` : "Proxy unreachable"}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${up ? "bg-emerald-400" : "bg-rose-400"}`}
      />
      {up ? (
        <>
          Proxy :{status!.proxyPort} · {status!.sessionCount} sessions · {status!.phase}
        </>
      ) : (
        <>Proxy offline</>
      )}
    </div>
  );
}
