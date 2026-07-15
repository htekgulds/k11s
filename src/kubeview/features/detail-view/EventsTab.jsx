import { useCallback, useEffect, useState } from "react";
import { k8sInvoke } from "../../api";
import { exportContent } from "../../api/export";
import { mono } from "../../theme";
import { Spinner } from "../../components/ui/Spinner";

export function EventsTab({ obj, clusterId }) {
  const [events, setEvents] = useState(null);
  const [fetching, setFetching] = useState(false);

  const load = useCallback(
    async () => {
      setFetching(true);
      try {
        const res = await k8sInvoke(
          "get_events",
          { name: obj.name, namespace: obj.namespace || null },
          clusterId,
        );
        setEvents(res);
      } catch (err) {
        setEvents({ events: [], error: String(err) });
      } finally {
        setFetching(false);
      }
    },
    [obj.name, obj.namespace, clusterId],
  );

  useEffect(() => { load(); }, [load]);

  const items = events?.events || [];
  const eventsText = items.length
    ? items.map((ev) =>
        `[${ev.type}] ${ev.reason} (${ev.age})\n  From: ${ev.from}\n  Message: ${ev.message}`
      ).join("\n\n")
    : "No events";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "5px 10px",
          background: "#050910",
          borderBottom: "1px solid #0e1f2e",
          flexShrink: 0,
        }}
      >
        <span style={{ color: "#7dd3fc", ...mono, fontSize: "0.67rem" }}>
          events
        </span>
        {fetching && <Spinner />}
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => exportContent(
            eventsText,
            `${obj.name}_events.txt`,
            [{ name: "Text", extensions: ["txt"] }],
          )}
          style={{
            background: "none",
            border: "1px solid #0e1f2e",
            borderRadius: 3,
            color: "#4a7a8a",
            cursor: "pointer",
            padding: "2px 7px",
            ...mono,
            fontSize: "0.67rem",
          }}
          title="Export to file"
        >
          ⬇ export
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", ...mono, fontSize: "0.71rem" }}>
        <thead>
          <tr style={{ position: "sticky", top: 0, background: "#050910" }}>
            {["Type", "Reason", "Age", "From", "Message"].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "7px 13px",
                  color: "#1e3a52",
                  fontWeight: 700,
                  fontSize: "0.61rem",
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  borderBottom: "1px solid #0a1018",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fetching ? (
            <tr>
              <td colSpan={5} style={{ padding: 20 }}>
                <div style={{ color: "#39ff8a", ...mono, fontSize: "0.72rem", display: "flex", gap: 6 }}>
                  <Spinner /> Loading…
                </div>
              </td>
            </tr>
          ) : (
            items.map((ev, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #080e18" }}>
                <td
                  style={{
                    padding: "7px 13px",
                    color: ev.type === "Warning" ? "#f5c518" : "#39ff8a",
                    fontWeight: 700,
                  }}
                >
                  {ev.type}
                </td>
                <td style={{ padding: "7px 13px", color: "#7dd3fc" }}>{ev.reason}</td>
                <td style={{ padding: "7px 13px", color: "#1e3a52" }}>{ev.age}</td>
                <td style={{ padding: "7px 13px", color: "#2d4a6a" }}>{ev.from}</td>
                <td
                  style={{
                    padding: "7px 13px",
                    color: "#6a8898",
                    maxWidth: 300,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ev.message}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
