import { useCallback, useEffect, useState } from "react";
import { k8sInvoke } from "../api";
import { mono } from "../theme";
import { Spinner } from "./ui/Spinner";

export function LogsTab({ obj, clusterId }) {
  const [logs, setLogs] = useState(null);
  const [fetching, setFetching] = useState(false);

  const load = useCallback(
    async (force) => {
      if (!force && logs) return;
      setFetching(true);
      try {
        const res = await k8sInvoke(
          "get_pod_logs",
          { name: obj.name, namespace: obj.namespace },
          clusterId,
        );
        setLogs(res);
      } catch (err) {
        setLogs({ error: String(err) });
      } finally {
        setFetching(false);
      }
    },
    [obj.name, obj.namespace, clusterId, logs],
  );

  useEffect(() => { load(); }, [load]);

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
        </span>
        <button
          type="button"
          onClick={() => load(true)}
          style={{
            marginLeft: "auto",
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
      <div style={{ flex: 1, overflow: "auto", padding: "10px 13px" }}>
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
