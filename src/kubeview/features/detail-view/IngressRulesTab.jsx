import { useState, useEffect, useMemo } from "react";
import { mono } from "../../theme";
import { listIngressRules } from "../../api/ingressRules";

export function IngressRulesTab({ clusterId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    setLoading(true);
    setFilterText("");
    listIngressRules(clusterId)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [clusterId]);

  const rows = useMemo(() => {
    if (!filterText) return data;
    const lf = filterText.toLowerCase();
    return data.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(lf))
    );
  }, [data, filterText]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
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
          placeholder="Filter rules…"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{
            ...mono,
            fontSize: "0.72rem",
            background: "#0a1018",
            border: "1px solid #121c28",
            color: "#8ab",
            padding: "4px 8px",
            borderRadius: 3,
            outline: "none",
            width: 180,
          }}
        />
        <span style={{ color: "#0a1420", ...mono, fontSize: "0.62rem", marginLeft: "auto" }}>
          {(data || []).length} rules
        </span>
      </div>
      {loading ? (
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
          Loading ingress rules…
        </div>
      ) : (
        <div style={{ flex: 1, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", ...mono, fontSize: "0.74rem" }}>
            <thead>
              <tr style={{ position: "sticky", top: 0, background: "#050910", zIndex: 5 }}>
                {["Host", "Path", "PathType", "Service", "Port", "TLS"].map((c) => (
                  <th
                    key={c}
                    style={{
                      padding: "7px 13px",
                      textAlign: "left",
                      color: "#1e3a52",
                      fontWeight: 700,
                      fontSize: "0.61rem",
                      letterSpacing: "0.09em",
                      textTransform: "uppercase",
                      borderBottom: "1px solid #0a1018",
                      cursor: "pointer",
                      userSelect: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={`${row.host}-${row.path}-${i}`}
                  style={{
                    borderBottom: "1px solid #060c14",
                    transition: "background 0.07s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#0a1420"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <td style={{ padding: "7px 13px", whiteSpace: "nowrap", color: "#ccd", fontWeight: 600 }}>
                    {row.host || "*"}
                  </td>
                  <td style={{ padding: "7px 13px", whiteSpace: "nowrap", color: "#7a6aaa", ...mono }}>
                    {row.path}
                  </td>
                  <td style={{ padding: "7px 13px", whiteSpace: "nowrap", color: "#3a5878" }}>
                    {row.path_type}
                  </td>
                  <td style={{ padding: "7px 13px", whiteSpace: "nowrap", color: "#a0c0d0" }}>
                    {row.service_name}
                  </td>
                  <td style={{ padding: "7px 13px", whiteSpace: "nowrap", color: "#3a5878" }}>
                    {row.service_port}
                  </td>
                  <td style={{ padding: "7px 13px", whiteSpace: "nowrap", color: "#39ff8a" }}>
                    {row.tls_hosts || "\u2014"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: "center",
                      color: "#0e1a26",
                      padding: "50px",
                      ...mono,
                      fontSize: "0.72rem",
                    }}
                  >
                    No ingress rules found{filterText ? ` matching "${filterText}"` : ""}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
