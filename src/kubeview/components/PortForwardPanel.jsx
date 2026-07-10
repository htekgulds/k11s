import { useCallback, useEffect, useState } from "react";
import { k8sInvoke } from "../api";
import { mono } from "../theme";

export function PortForwardPanel({ clusterId }) {
  const [forwards, setForwards] = useState([]);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const list = await k8sInvoke("list_port_forwards", {}, clusterId);
      setForwards(list);
      setError(null);
    } catch (err) {
      setError(String(err));
    }
  }, [clusterId]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [refresh]);

  const handleStop = async (id) => {
    try {
      await k8sInvoke("stop_port_forward", { id }, clusterId);
      refresh();
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <div style={{ borderTop: "1px solid #080e18", padding: "4px 0" }}>
      <div
        style={{
          padding: "4px 10px 2px",
          color: "#0e1f2e",
          ...mono,
          fontSize: "0.57rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        Port Forwards
        {forwards.length > 0 && (
          <span style={{ color: "#fb923c", fontSize: "0.62rem", cursor: "pointer" }} onClick={refresh}>
            ↻
          </span>
        )}
      </div>
      {error && (
        <div style={{ padding: "2px 10px", fontSize: "0.62rem", color: "#ff4d4d", ...mono }}>
          {error}
        </div>
      )}
      {forwards.length === 0 ? (
        <div style={{ padding: "2px 10px", fontSize: "0.62rem", color: "#0e1f2e", ...mono }}>
          none
        </div>
      ) : (
        forwards.map((pf) => (
          <div
            key={pf.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "3px 9px 3px 10px",
              fontSize: "0.62rem",
              ...mono,
              color: "#39ff8a",
              borderLeft: "2px solid #fb923c",
              margin: "2px 0",
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {pf.local_port}:{pf.remote_port}
              <span style={{ color: "#4a7a8a", fontSize: "0.57rem" }}>
                {" "}{pf.pod_name}
              </span>
            </span>
            <button
              type="button"
              onClick={() => handleStop(pf.id)}
              style={{
                background: "none",
                border: "none",
                color: "#ff4d4d",
                cursor: "pointer",
                padding: "1px 4px",
                fontSize: "0.62rem",
                ...mono,
              }}
              title={`Stop forward ${pf.local_port}:${pf.remote_port}`}
            >
              ✕
            </button>
          </div>
        ))
      )}
    </div>
  );
}
