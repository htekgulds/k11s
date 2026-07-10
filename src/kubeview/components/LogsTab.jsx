import { useCallback, useEffect, useRef, useState } from "react";
import { k8sInvoke } from "../api";
import { mono } from "../theme";
import { Spinner } from "./ui/Spinner";
import { listen } from "@tauri-apps/api/event";

export function LogsTab({ obj, clusterId }) {
  const [logs, setLogs] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [previous, setPrevious] = useState(false);
  const [container, setContainer] = useState(null);
  const [tailing, setTailing] = useState(false);
  const loadedRef = useRef(false);
  const unlistenRef = useRef(null);
  const streamLinesRef = useRef([]);
  const scrollRef = useRef(null);

  const containers = obj?.containers || [];
  const multiContainer = containers.length > 1;

  const stopTail = useCallback(() => {
    k8sInvoke("stop_log_stream", { name: obj.name, namespace: obj.namespace, previous, container }, clusterId).catch(() => {});
    if (unlistenRef.current) {
      unlistenRef.current();
      unlistenRef.current = null;
    }
  }, [obj.name, obj.namespace, clusterId, previous, container]);

  const load = useCallback(
    async (force) => {
      if (!force && loadedRef.current) return;
      loadedRef.current = true;
      setFetching(true);
      try {
        const res = await k8sInvoke(
          "get_pod_logs",
          { name: obj.name, namespace: obj.namespace, previous, container },
          clusterId,
        );
        setLogs(res);
      } catch (err) {
        setLogs({ error: String(err) });
      } finally {
        setFetching(false);
      }
    },
    [obj.name, obj.namespace, clusterId, previous, container],
  );

  const startTail = useCallback(async () => {
    stopTail();
    streamLinesRef.current = [];
    setTailing(true);

    const unlisten = await listen("log-line", (event) => {
      const { name, namespace, line, error } = event.payload;
      if (name !== obj.name || namespace !== obj.namespace) return;
      if (error) {
        streamLinesRef.current = streamLinesRef.current.concat([`[STREAM ERROR] ${error}`]);
      } else {
        streamLinesRef.current = streamLinesRef.current.concat([line]);
      }
      setLogs((prev) => {
        if (!prev || prev.error) return { logs: streamLinesRef.current.join("\n") };
        return { logs: streamLinesRef.current.join("\n") };
      });
    });
    unlistenRef.current = unlisten;

    await k8sInvoke("start_log_stream", { name: obj.name, namespace: obj.namespace, previous, container }, clusterId);

    setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 50);
  }, [obj, clusterId, stopTail, previous, container]);

  const toggleTail = useCallback(() => {
    if (tailing) {
      stopTail();
      setTailing(false);
    } else {
      startTail();
    }
  }, [tailing, startTail, stopTail]);

  useEffect(() => {
    return () => {
      stopTail();
    };
  }, [stopTail]);

  useEffect(() => {
    loadedRef.current = false;
    load();
  }, [load]);

  useEffect(() => {
    if (tailing && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, tailing]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div
        style={{
          padding: "5px 13px",
          borderBottom: "1px solid #0a1018",
          display: "flex",
          gap: 8,
          alignItems: "center",
          background: "#050910",
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: "0.59rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#1e3a52",
            ...mono,
          }}
        >
          stdout · stderr
          {previous && <span style={{ color: "#f9a8d4", marginLeft: 6 }}>· previous</span>}
          {multiContainer && container && <span style={{ color: "#39ff8a", marginLeft: 6 }}>· {container}</span>}
        </span>

        {multiContainer && (
          <select
            value={container || ""}
            onChange={(e) => setContainer(e.target.value || null)}
            style={{
              background: "#0a1018",
              border: "1px solid #0e1f2e",
              borderRadius: 3,
              color: "#39ff8a",
              ...mono,
              fontSize: "0.67rem",
              padding: "2px 5px",
            }}
          >
            <option value="">all containers</option>
            {containers.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={() => setPrevious((p) => !p)}
          style={{
            marginLeft: (previous || multiContainer) ? undefined : "auto",
            background: previous ? "#f9a8d420" : "none",
            border: `1px solid ${previous ? "#f9a8d4" : "#0e1f2e"}`,
            borderRadius: 3,
            color: previous ? "#f9a8d4" : "#667",
            cursor: "pointer",
            padding: "2px 7px",
            ...mono,
            fontSize: "0.67rem",
          }}
          title="Show logs from previous container instance (--previous)"
        >
          prev
        </button>
        <button
          type="button"
          onClick={toggleTail}
          style={{
            background: tailing ? "#39ff8a20" : "none",
            border: `1px solid ${tailing ? "#39ff8a" : "#0e1f2e"}`,
            borderRadius: 3,
            color: tailing ? "#39ff8a" : "#667",
            cursor: "pointer",
            padding: "2px 7px",
            ...mono,
            fontSize: "0.67rem",
          }}
          title="Stream logs live (tail -f)"
        >
          {tailing ? "● tailing" : "tail"}
        </button>
        <button
          type="button"
          onClick={() => load(true)}
          style={{
            background: "none",
            border: "1px solid #0e1f2e",
            borderRadius: 3,
            color: "#39ff8a",
            cursor: "pointer",
            padding: "2px 7px",
            ...mono,
            fontSize: "0.67rem",
          }}
        >
          ↻ refresh
        </button>
      </div>
      <div ref={scrollRef} style={{ flex: 1, overflow: "auto", padding: "10px 13px" }}>
        {fetching ? (
          <div style={{ color: "#39ff8a", ...mono, fontSize: "0.72rem", display: "flex", gap: 6 }}>
            <Spinner /> Loading…
          </div>
        ) : (
          <pre style={{ margin: 0, ...mono, fontSize: "0.71rem", lineHeight: 1.9, whiteSpace: "pre-wrap" }}>
            {(logs?.error || logs?.logs || "No logs").split("\n").map((line, i) => {
              const c =
                line.includes("[ERROR]") || line.includes("[FATAL]") || line.includes("Error")
                  ? "#ff6b6b"
                  : line.includes("[WARN]") || line.includes("Warning")
                    ? "#f5c518"
                    : "#4a7a8a";
              const ts = line.match(/^\S+T[\d:.Z]+/)?.[0];
              return (
                <span key={i} style={{ display: "block" }}>
                  {ts && <span style={{ color: "#1e3a52" }}>{ts}</span>}
                  <span style={{ color: c }}>{ts ? line.slice(ts.length) : line}</span>
                </span>
              );
            })}
          </pre>
        )}
      </div>
    </div>
  );
}
