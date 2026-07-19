import { useState, useMemo } from "react";
import { mono } from "../../theme";
import { listConfigData } from "../../api";

function obfuscate(val) {
  return "\u2022\u2022\u2022\u2022 (base64 encoded)";
}

function truncate(val, max = 200) {
  if (val.length <= max) return val;
  return val.slice(0, max) + "...";
}

export function ConfigDataTab({ kind, name, namespace, clusterId }) {
  const [entries, setEntries] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("");
  const [revealed, setRevealed] = useState({});

  useMemo(() => {
    if (!kind || !name || !namespace) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    listConfigData(clusterId, kind, name, namespace)
      .then((data) => {
        setEntries(data || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, [kind, name, namespace, clusterId]);

  const filtered = useMemo(() => {
    if (!entries) return [];
    if (!filter) return entries;
    const lf = filter.toLowerCase();
    return entries.filter((e) => e.key.toLowerCase().includes(lf));
  }, [entries, filter]);

  const toggleReveal = (key) => {
    setRevealed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const sourceLabel = (entry) => {
    const color = entry.source_kind === "Secret" ? "#fb923c" : "#c4b5fd";
    return { label: `${entry.source_kind}/${entry.source_name}`, color };
  };

  if (loading) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          color: "#39ff8a",
          ...mono,
          fontSize: "0.76rem",
        }}
      >
        Loading config data…
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ff4d4d",
          ...mono,
          fontSize: "0.76rem",
          padding: 20,
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Filter toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "4px 12px",
          background: "#050910",
          borderBottom: "1px solid #080e18",
          flexShrink: 0,
        }}
      >
        <input
          type="text"
          placeholder="Filter by key…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            flex: 1,
            background: "#0a1420",
            border: "1px solid #12202e",
            borderRadius: 3,
            color: "#d4e6f5",
            padding: "3px 8px",
            ...mono,
            fontSize: "0.7rem",
            outline: "none",
          }}
        />
        <span
          style={{ color: "#0a1420", ...mono, fontSize: "0.62rem" }}
        >
          {(entries || []).length} entries
        </span>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            ...mono,
            fontSize: "0.74rem",
          }}
        >
          <thead>
            <tr
              style={{
                background: "#050910",
                color: "#4a7a8a",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontSize: "0.65rem",
                position: "sticky",
                top: 0,
                zIndex: 1,
              }}
            >
              <th
                style={{
                  padding: "6px 10px",
                  textAlign: "left",
                  borderBottom: "1px solid #080e18",
                }}
              >
                Key
              </th>
              <th
                style={{
                  padding: "6px 10px",
                  textAlign: "left",
                  borderBottom: "1px solid #080e18",
                }}
              >
                Value
              </th>
              <th
                style={{
                  padding: "6px 10px",
                  textAlign: "left",
                  borderBottom: "1px solid #080e18",
                  width: 70,
                }}
              >
                Binary
              </th>
              <th
                style={{
                  padding: "6px 10px",
                  textAlign: "left",
                  borderBottom: "1px solid #080e18",
                }}
              >
                Source
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "#4a7a8a",
                  }}
                >
                  {entries && entries.length === 0
                    ? "No data entries"
                    : "No matching entries"}
                </td>
              </tr>
            ) : (
              filtered.map((entry, i) => {
                const src = sourceLabel(entry);
                const isRevealed = revealed[entry.key];
                const displayValue =
                  entry.binary || entry.source_kind === "Secret"
                    ? isRevealed
                      ? entry.value
                      : obfuscate()
                    : entry.value;
                const showToggle =
                  entry.binary || entry.source_kind === "Secret";
                const shortValue = truncate(displayValue);

                return (
                  <tr
                    key={entry.key + "-" + i}
                    style={{
                      background:
                        i % 2 === 0
                          ? "transparent"
                          : "rgba(255,255,255,0.015)",
                      borderBottom: "1px solid #080e18",
                    }}
                  >
                    <td
                      style={{
                        padding: "5px 10px",
                        color: "#d4e6f5",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {entry.key}
                    </td>
                    <td
                      style={{
                        padding: "5px 10px",
                        color: "#a0c0d0",
                        maxWidth: 400,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        wordBreak: "break-all",
                      }}
                    >
                      {shortValue}
                      {showToggle && (
                        <button
                          type="button"
                          onClick={() => toggleReveal(entry.key)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#39ff8a",
                            cursor: "pointer",
                            ...mono,
                            fontSize: "0.65rem",
                            marginLeft: 6,
                            textDecoration: "underline",
                            textUnderlineOffset: 2,
                          }}
                        >
                          {isRevealed ? "hide" : "reveal"}
                        </button>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "5px 10px",
                        color: entry.binary ? "#fb923c" : "#4a7a8a",
                      }}
                    >
                      {entry.binary ? "\u2713" : "\u2014"}
                    </td>
                    <td
                      style={{
                        padding: "5px 10px",
                        color: src.color,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {src.label}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
