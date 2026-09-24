import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearSessions,
  fetchSession,
  fetchSessions,
  fetchStatus,
  INSPECTOR_BASE,
  type Session,
  type SessionSummary,
  type Status,
} from "../lib/api";

export function useInspector() {
  const [status, setStatus] = useState<Status | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Session | null>(null);
  const [filter, setFilter] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const refreshSessions = useCallback(async () => {
    try {
      const list = await fetchSessions();
      setSessions(list);
    } catch {
      /* proxy down */
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const s = await fetchStatus();
      if (alive) setStatus(s);
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  useEffect(() => {
    if (!status?.ok) return;
    const es = new EventSource(`${INSPECTOR_BASE}/events`);
    esRef.current = es;
    es.addEventListener("session", (ev) => {
      try {
        const session = JSON.parse((ev as MessageEvent).data) as SessionSummary;
        setSessions((prev) => {
          if (prev.some((p) => p.id === session.id)) return prev;
          return [session, ...prev];
        });
      } catch {
        /* ignore */
      }
    });
    es.onerror = () => {
      es.close();
      esRef.current = null;
    };
    return () => {
      es.close();
      esRef.current = null;
    };
  }, [status?.ok]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    fetchSession(selectedId)
      .then((s) => {
        if (!cancelled) setDetail(s);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const onClear = useCallback(async () => {
    await clearSessions();
    setSessions([]);
    setSelectedId(null);
    setDetail(null);
  }, []);

  const filtered = sessions.filter((s) => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return (
      s.url.toLowerCase().includes(q) ||
      s.method.toLowerCase().includes(q) ||
      String(s.status ?? "").includes(q) ||
      s.host.toLowerCase().includes(q)
    );
  });

  return {
    status,
    sessions: filtered,
    selectedId,
    setSelectedId,
    detail,
    filter,
    setFilter,
    loadingDetail,
    onClear,
  };
}
