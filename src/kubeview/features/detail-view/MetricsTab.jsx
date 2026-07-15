import { useEffect, useState } from "react";
import { getPodMetrics } from "../../api/metrics";
import { mono } from "../../theme";

function Bar({ value, max, label, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const barColor =
    color || (pct > 90 ? "#ff4d4d" : pct > 70 ? "#f5c518" : "#39ff8a");
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginTop: 4,
      }}
    >
      <div
        style={{
          flex: 1,
          height: 10,
          background: "#0a1018",
          borderRadius: 5,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: barColor,
            borderRadius: 5,
            transition: "width 0.3s",
          }}
        />
      </div>
      <span style={{ ...mono, fontSize: "0.65rem", color: "#556", minWidth: 60, textAlign: "right" }}>
        {label}
      </span>
    </div>
  );
}

export function MetricsTab({ obj, clusterId }) {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!obj?.namespace || !obj?.name) return;
    setLoading(true);
    setError(null);
    getPodMetrics(obj.namespace, obj.name)
      .then((m) => {
        setMetrics(m);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }, [obj?.namespace, obj?.name, clusterId]);

  if (loading) {
    return (
      <div
        style={{
          padding: 24,
          color: "#556",
          ...mono,
          fontSize: "0.75rem",
        }}
      >
        Loading metrics…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <div
          style={{
            color: "#ff4d4d",
            ...mono,
            fontSize: "0.75rem",
            marginBottom: 8,
          }}
        >
          ⚠ {error}
        </div>
        {error.toLowerCase().includes("metrics-server") && (
          <div style={{ color: "#7dd3fc", fontSize: "0.72rem", lineHeight: 1.6 }}>
            The metrics-server must be installed in the cluster to view resource usage.
            <br />
            Install with:
            <pre
              style={{
                background: "#0a1018",
                padding: "8px 12px",
                borderRadius: 4,
                marginTop: 6,
                ...mono,
                fontSize: "0.7rem",
                color: "#c4b5fd",
              }}
            >
              kubectl apply -f{" "}
              https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
            </pre>
          </div>
        )}
      </div>
    );
  }

  if (!metrics || metrics.length === 0) {
    return (
      <div
        style={{
          padding: 24,
          color: "#556",
          ...mono,
          fontSize: "0.75rem",
        }}
      >
        No metrics available for this pod.
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        overflow: "auto",
        height: "100%",
      }}
    >
      {metrics.map((m) => (
        <div
          key={m.container}
          style={{
            background: "#050910",
            border: "1px solid #0a1018",
            borderRadius: 6,
            padding: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <span style={{ color: "#dde", ...mono, fontWeight: 700, fontSize: "0.72rem" }}>
              {m.container}
            </span>
            <span style={{ color: "#556", ...mono, fontSize: "0.6rem" }}>
              {new Date(m.timestamp).toLocaleTimeString()}
            </span>
          </div>

          {/* CPU */}
          <div style={{ marginBottom: 10 }}>
            <div
              style={{
                color: "#7dd3fc",
                ...mono,
                fontSize: "0.65rem",
                marginBottom: 2,
              }}
            >
              CPU
            </div>
            <div
              style={{
                color: "#aac",
                ...mono,
                fontSize: "0.6rem",
                marginBottom: 2,
              }}
            >
              {m.cpu_usage_millicores.toFixed(1)}m
              {m.cpu_limit_millicores != null
                ? ` / ${m.cpu_limit_millicores.toFixed(0)}m`
                : ""}
              {m.cpu_request_millicores != null
                ? ` (req ${m.cpu_request_millicores.toFixed(0)}m)`
                : ""}
            </div>
            {m.cpu_limit_millicores != null && (
              <Bar
                value={m.cpu_usage_millicores}
                max={m.cpu_limit_millicores}
                label={`${(
                  (m.cpu_usage_millicores / m.cpu_limit_millicores) *
                  100
                ).toFixed(0)}%`}
              />
            )}
          </div>

          {/* Memory */}
          <div>
            <div
              style={{
                color: "#c4b5fd",
                ...mono,
                fontSize: "0.65rem",
                marginBottom: 2,
              }}
            >
              Memory
            </div>
            <div
              style={{
                color: "#aac",
                ...mono,
                fontSize: "0.6rem",
                marginBottom: 2,
              }}
            >
              {m.mem_usage_mib.toFixed(1)} MiB
              {m.mem_limit_mib != null
                ? ` / ${m.mem_limit_mib.toFixed(0)} MiB`
                : ""}
              {m.mem_request_mib != null
                ? ` (req ${m.mem_request_mib.toFixed(0)} MiB)`
                : ""}
            </div>
            {m.mem_limit_mib != null && (
              <Bar
                value={m.mem_usage_mib}
                max={m.mem_limit_mib}
                label={`${(
                  (m.mem_usage_mib / m.mem_limit_mib) *
                  100
                ).toFixed(0)}%`}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
