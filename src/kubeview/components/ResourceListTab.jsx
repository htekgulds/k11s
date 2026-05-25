import { useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { COLUMNS } from "../constants";
import { mono } from "../theme";
import { nsColor } from "../utils/colors";
import { Pill } from "./ui/Pill";
import { Spinner } from "./ui/Spinner";
import { StatusDot } from "./ui/StatusDot";
import { Dropdown } from "./ui/Dropdown";

export function ResourceListTab({
  type,
  data,
  loading,
  onSelect,
  onMiddleClick,
  filter,
  setFilter,
  namespace,
  setNamespace,
  namespaces,
  onRefresh,
}) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState(1);
  const [hovered, setHovered] = useState(null);
  const filterRef = useRef(null);
  useHotkeys("/", () => filterRef.current?.focus(), { preventDefault: true, useKey: true }, []);
  useHotkeys("escape", () => { if (filter) setFilter(""); }, { enableOnFormTags: true }, [filter, setFilter]);

  const cols = COLUMNS[type] || Object.keys(data[0] || {});
  const rows = data.filter((r) => {
    const nsOk = !namespace || namespace === "All" || r.namespace === namespace || !r.namespace;
    const txOk =
      !filter || Object.values(r).some((v) => String(v).toLowerCase().includes(filter.toLowerCase()));
    return nsOk && txOk;
  });
  const sorted = sortCol
    ? [...rows].sort((a, b) => String(a[sortCol]).localeCompare(String(b[sortCol])) * sortDir)
    : rows;
  const handleSort = (c) => {
    if (sortCol === c) setSortDir((d) => -d);
    else {
      setSortCol(c);
      setSortDir(1);
    }
  };

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
        <span style={{ color: "#0e1f2e", ...mono, fontSize: "0.85rem" }}>ns:</span>
        <Dropdown value={namespace} options={namespaces} onChange={setNamespace} style={{ minWidth: 110 }} />
        <span style={{ color: "#0a1420", fontSize: "0.68em", marginLeft: 3 }}>/</span>
        <input
          ref={filterRef}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="filter…"
          style={{
            background: "#080e18",
            border: "1px solid #0e1f2e",
            borderRadius: 3,
            color: "#bcc",
            padding: "2px 8px",
            ...mono,
            fontSize: "0.68rem",
            outline: "none",
            width: 150,
          }}
        />
        {filter && (
          <button
            type="button"
            onClick={() => setFilter("")}
            style={{ background: "none", border: "none", color: "#1e3a52", cursor: "pointer", fontSize: "0.7rem" }}
          >
            ✕
          </button>
        )}
        <span style={{ color: "#0a1420", ...mono, fontSize: "0.62rem", marginLeft: 2 }}>
          {(data || []).length} items
        </span>
        <button
          type="button"
          onClick={onRefresh}
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
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {loading ? <Spinner /> : "↻"} refresh
        </button>
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
          <Spinner /> Loading {type}…
        </div>
      ) : (
        <div style={{ flex: 1, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", ...mono, fontSize: "0.74rem" }}>
            <thead>
              <tr style={{ position: "sticky", top: 0, background: "#050910", zIndex: 5 }}>
                {cols.map((c) => (
                  <th
                    key={c}
                    onClick={() => handleSort(c)}
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
                    {c.replace(/_/g, " ")}
                    {sortCol === c ? (sortDir > 0 ? " ↑" : " ↓") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                  <tr
                    key={`${row.name}-${i}`}
                    onClick={() => onSelect(row)}
                    onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); onMiddleClick?.(row); } }}
                    style={{
                    borderBottom: "1px solid #060c14",
                    cursor: "pointer",
                    background: hovered === i ? "#0a1420" : "transparent",
                    transition: "background 0.07s",
                  }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {cols.map((c) => (
                    <td
                      key={c}
                      style={{
                        padding: "7px 13px",
                        whiteSpace: "nowrap",
                        maxWidth: 260,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {c === "status" ? (
                        <StatusDot status={row[c]} />
                      ) : c === "namespace" ? (
                        <span style={{ color: nsColor(row[c]), fontSize: "0.71rem" }}>{row[c]}</span>
                      ) : c === "restarts" && row[c] > 5 ? (
                        <span style={{ color: "#ff4d4d", fontWeight: 700 }}>{row[c]}</span>
                      ) : c === "restarts" && row[c] > 0 ? (
                        <span style={{ color: "#f5c518" }}>{row[c]}</span>
                      ) : c === "ready" && row[c]?.startsWith("0") ? (
                        <span style={{ color: "#ff4d4d" }}>{row[c]}</span>
                      ) : c === "name" ? (
                        <span style={{ color: "#ccd", fontWeight: 600 }}>{row[c]}</span>
                      ) : c === "type" && row[c] === "LoadBalancer" ? (
                        <Pill label={row[c]} color="#39ff8a" />
                      ) : c === "external_ip" && row[c] !== "<none>" ? (
                        <span style={{ color: "#f5c518" }}>{row[c]}</span>
                      ) : c === "image" ? (
                        <span style={{ color: "#7a6aaa", fontSize: "0.69rem" }}>{row[c]}</span>
                      ) : (
                        <span style={{ color: "#3a5878" }}>{String(row[c] ?? "—")}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td
                    colSpan={cols.length}
                    style={{
                      textAlign: "center",
                      color: "#0e1a26",
                      padding: "50px",
                      ...mono,
                      fontSize: "0.72rem",
                    }}
                  >
                    No {type} found{filter ? ` matching "${filter}"` : ""}
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
