import { useCallback, useEffect, useState } from "react";
import { k8sInvoke } from "../api";
import { DETAIL_TABS_MAP, RESOURCE_TYPES } from "../constants";
import { STATUS_COLOR, kindColorMap, mono } from "../theme";
import { buildGraph, getRelated } from "../utils/graph";
import { kindColor, nsColor } from "../utils/colors";
import { GraphView } from "./GraphView";
import { FieldRow } from "./ui/FieldRow";
import { Pill } from "./ui/Pill";
import { Spinner } from "./ui/Spinner";
import { StatusDot } from "./ui/StatusDot";

function detailFields(obj, type) {
  if (type === "pods") {
    return [
      { l: "Status", v: <StatusDot status={obj.status} /> },
      { l: "Namespace", v: <Pill label={obj.namespace} color={nsColor(obj.namespace)} /> },
      {
        l: "Ready",
        v: (
          <span style={{ color: obj.ready?.startsWith("0") ? "#ff4d4d" : "#39ff8a", ...mono }}>
            {obj.ready}
          </span>
        ),
      },
      {
        l: "Restarts",
        v: (
          <span
            style={{
              color: obj.restarts > 5 ? "#ff4d4d" : obj.restarts > 0 ? "#f5c518" : "#39ff8a",
              ...mono,
              fontWeight: 700,
            }}
          >
            {obj.restarts}
          </span>
        ),
      },
      { l: "Node", v: <span style={{ color: "#7dd3fc", ...mono }}>{obj.node}</span> },
      { l: "Pod IP", v: <span style={{ color: "#aac", ...mono }}>{obj.ip}</span> },
      { l: "Image", v: <span style={{ color: "#c4b5fd", ...mono }}>{obj.image}</span>, wide: true },
      { l: "Age", v: <span style={{ color: "#556", ...mono }}>{obj.age}</span> },
    ];
  }
  if (type === "deployments") {
    return [
      {
        l: "Ready",
        v: (
          <span
            style={{
              color: obj.ready?.startsWith("0") ? "#ff4d4d" : "#39ff8a",
              ...mono,
              fontWeight: 700,
            }}
          >
            {obj.ready}
          </span>
        ),
      },
      { l: "Namespace", v: <Pill label={obj.namespace} color={nsColor(obj.namespace)} /> },
      { l: "Up-to-date", v: <span style={{ color: "#aac", ...mono }}>{obj.up_to_date}</span> },
      {
        l: "Available",
        v: (
          <span style={{ color: obj.available === 0 ? "#ff4d4d" : "#39ff8a", ...mono, fontWeight: 700 }}>
            {obj.available}
          </span>
        ),
      },
      { l: "Strategy", v: <Pill label={obj.strategy || "RollingUpdate"} color="#7dd3fc" /> },
      { l: "Image", v: <span style={{ color: "#c4b5fd", ...mono }}>{obj.image}</span>, wide: true },
      { l: "Age", v: <span style={{ color: "#556", ...mono }}>{obj.age}</span> },
    ];
  }
  if (type === "services") {
    return [
      {
        l: "Type",
        v: <Pill label={obj.type} color={obj.type === "LoadBalancer" ? "#39ff8a" : "#7dd3fc"} />,
      },
      { l: "Namespace", v: <Pill label={obj.namespace} color={nsColor(obj.namespace)} /> },
      { l: "Cluster IP", v: <span style={{ color: "#7dd3fc", ...mono }}>{obj.cluster_ip}</span> },
      {
        l: "External IP",
        v: (
          <span style={{ color: obj.external_ip === "<none>" ? "#334" : "#f5c518", ...mono }}>
            {obj.external_ip}
          </span>
        ),
      },
      { l: "Ports", v: <span style={{ color: "#fde68a", ...mono }}>{obj.ports}</span>, wide: true },
      { l: "Age", v: <span style={{ color: "#556", ...mono }}>{obj.age}</span> },
    ];
  }
  if (type === "nodes") {
    return [
      { l: "Status", v: <StatusDot status={obj.status} /> },
      { l: "Roles", v: <Pill label={obj.roles} color="#7dd3fc" /> },
      { l: "Version", v: <span style={{ color: "#c4b5fd", ...mono }}>{obj.version}</span> },
      { l: "CPU", v: <span style={{ color: "#fde68a", ...mono }}>{obj.cpu}</span> },
      { l: "Memory", v: <span style={{ color: "#86efac", ...mono }}>{obj.mem}</span> },
      { l: "Pods", v: <span style={{ color: "#aac", ...mono }}>{obj.pods}</span> },
      { l: "Age", v: <span style={{ color: "#556", ...mono }}>{obj.age}</span> },
    ];
  }
  return Object.entries(obj).map(([k, v]) => ({
    l: k.replace(/_/g, " "),
    v: <span style={{ color: "#aac", ...mono }}>{String(v)}</span>,
  }));
}

export function DetailView({ obj, type, allData, clusterId, onNavigate }) {
  const [subTab, setSubTab] = useState("info");
  const [cache, setCache] = useState({});
  const [fetching, setFetching] = useState({});
  const graph = buildGraph(obj, type, allData);
  const related = getRelated(obj, type, allData);
  const dtabs = DETAIL_TABS_MAP[type] || DETAIL_TABS_MAP.default;

  const load = useCallback(
    async (tab, force = false) => {
      let skipped = false;
      setCache((prev) => {
        if (!force && prev[tab]) skipped = true;
        return prev;
      });
      if (skipped) return;

      setFetching((p) => {
        if (p[tab]) {
          skipped = true;
          return p;
        }
        return { ...p, [tab]: true };
      });
      if (skipped) return;

      let res;
      try {
        if (tab === "logs") {
          res = await k8sInvoke(
            "get_pod_logs",
            { name: obj.name, namespace: obj.namespace },
            clusterId,
          );
        } else if (tab === "yaml") {
          res = await k8sInvoke(
            "get_yaml",
            { kind: type, name: obj.name, namespace: obj.namespace || null },
            clusterId,
          );
        } else if (tab === "events") {
          res = await k8sInvoke(
            "get_events",
            { name: obj.name, namespace: obj.namespace || null },
            clusterId,
          );
        }
        setCache((p) => ({ ...p, [tab]: res }));
      } catch (err) {
        setCache((p) => ({
          ...p,
          [tab]: { error: String(err) },
        }));
      } finally {
        setFetching((p) => ({ ...p, [tab]: false }));
      }
    },
    [obj.name, obj.namespace, type, clusterId],
  );

  useEffect(() => {
    setCache({});
    setSubTab("info");
    load("yaml", true);
  }, [obj.name, clusterId, load]);

  const goTab = (tab) => {
    setSubTab(tab);
    if (["logs", "yaml", "events"].includes(tab)) load(tab);
  };

  const isErr = ["CrashLoopBackOff", "Error", "OOMKilled", "NotReady"].includes(obj.status);
  const statCol = STATUS_COLOR[obj.status] || "#556";
  const kindLbl = RESOURCE_TYPES.find((r) => r.key === type)?.label.replace(/s$/, "") || type;

  const actions = [
    ...(type === "pods"
      ? [
          { label: "Logs", icon: "📋", color: "#fde68a", fn: () => goTab("logs") },
          {
            label: "Shell",
            icon: "$_",
            color: "#c4b5fd",
            fn: () => alert(`kubectl exec -it ${obj.name} -n ${obj.namespace} -- sh`),
          },
        ]
      : []),
    ...(type === "deployments" || type === "statefulsets"
      ? [
          { label: "Scale", icon: "⇅", color: "#f9a8d4", fn: () => alert("Scale") },
          { label: "Redeploy", icon: "↺", color: "#67e8f9", fn: () => alert("Restart") },
        ]
      : []),
    { label: "Edit YAML", icon: "✏️", color: "#fb923c", fn: () => goTab("yaml") },
    { label: "Delete", icon: "🗑", color: "#ff4d4d", fn: () => alert(`Delete ${obj.name}`) },
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div
        style={{
          padding: "12px 16px 0",
          background: "#050910",
          borderBottom: "1px solid #0a1018",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 11, marginBottom: 11 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 6,
              background: `${statCol}10`,
              border: `1px solid ${statCol}35`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.1rem",
              flexShrink: 0,
            }}
          >
            {RESOURCE_TYPES.find((r) => r.key === type)?.icon || "◎"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 4 }}>
              <span style={{ ...mono, fontWeight: 700, fontSize: "0.92rem", color: "#dde", wordBreak: "break-all" }}>
                {obj.name}
              </span>
              <Pill label={kindLbl} color={statCol} />
              {isErr && <Pill label="⚠ degraded" color="#ff4d4d" />}
            </div>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              {obj.namespace && (
                <span style={{ fontSize: "0.67rem", color: nsColor(obj.namespace), ...mono }}>
                  ns/{obj.namespace}
                </span>
              )}
              {obj.age && (
                <span style={{ fontSize: "0.67rem", color: "#1e3a52", ...mono }}>age/{obj.age}</span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", flexShrink: 0 }}>
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={a.fn}
                style={{
                  background: "#0a1018",
                  border: `1px solid ${a.color}28`,
                  borderRadius: 4,
                  color: a.color,
                  cursor: "pointer",
                  padding: "4px 9px",
                  ...mono,
                  fontSize: "0.67rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${a.color}10`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#0a1018";
                }}
              >
                <span>{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex" }}>
          {dtabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => goTab(t)}
              style={{
                background: "none",
                border: "none",
                borderBottom: subTab === t ? "2px solid #39ff8a" : "2px solid transparent",
                color: subTab === t ? "#dde" : "#2d4a6a",
                padding: "5px 13px",
                cursor: "pointer",
                ...mono,
                fontSize: "0.69rem",
                fontWeight: subTab === t ? 700 : 400,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflow: "hidden", display: "flex", minHeight: 0 }}>
        {subTab === "info" && (
          <div style={{ flex: 1, overflow: "hidden", display: "flex", minWidth: 0 }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 22px" }}>
                {detailFields(obj, type).map((f, i) => (
                  <FieldRow key={i} label={f.l} wide={f.wide}>
                    {f.v}
                  </FieldRow>
                ))}
              </div>
              <div style={{ marginTop: 18 }}>
                <div
                  style={{
                    fontSize: "0.6rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#1e3a52",
                    ...mono,
                    marginBottom: 7,
                  }}
                >
                  Labels
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {[`app=${obj.name.split("-")[0]}`, `env=prod`, `managed-by=helm`].map((l) => (
                    <span
                      key={l}
                      style={{
                        background: "#081420",
                        border: "1px solid #0e2030",
                        borderRadius: 3,
                        color: "#5a8aaa",
                        padding: "2px 8px",
                        fontSize: "0.67rem",
                        ...mono,
                      }}
                    >
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {related.length > 0 && (
              <div
                style={{
                  width: 200,
                  borderLeft: "1px solid #0a1018",
                  overflowY: "auto",
                  background: "#050910",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    padding: "9px 11px 4px",
                    fontSize: "0.59rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#1e3a52",
                    ...mono,
                  }}
                >
                  Related
                </div>
                {related.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onNavigate(r.resourceType, r.obj)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      width: "100%",
                      background: "none",
                      border: "none",
                      borderBottom: "1px solid #080e16",
                      padding: "7px 11px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#0a1420";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "none";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span
                        style={{
                          fontSize: "0.61rem",
                          color: kindColor(r.kind),
                          ...mono,
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                        }}
                      >
                        {r.kind}
                      </span>
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: STATUS_COLOR[r.status] || "#39ff8a",
                          flexShrink: 0,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "#7a9aaa",
                        ...mono,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.name}
                    </span>
                    {r.ns && <span style={{ fontSize: "0.62rem", color: nsColor(r.ns) }}>{r.ns}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {subTab === "logs" && (
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
                onClick={() => load("logs", true)}
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
              {fetching.logs ? (
                <div style={{ color: "#39ff8a", ...mono, fontSize: "0.72rem", display: "flex", gap: 6 }}>
                  <Spinner /> Loading…
                </div>
              ) : (
                <pre style={{ margin: 0, ...mono, fontSize: "0.71rem", lineHeight: 1.9, whiteSpace: "pre-wrap" }}>
                  {(cache.logs?.error || cache.logs?.logs || "No logs").split("\n").map((line, i) => {
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
        )}
        {subTab === "yaml" && (
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
                manifest
              </span>
              <button
                type="button"
                style={{
                  marginLeft: "auto",
                  background: "none",
                  border: "1px solid #0e1f2e",
                  borderRadius: 3,
                  color: "#fb923c",
                  cursor: "pointer",
                  padding: "2px 7px",
                  ...mono,
                  fontSize: "0.67rem",
                }}
              >
                ✏️ edit & apply
              </button>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: "10px 13px" }}>
              {fetching.yaml ? (
                <div style={{ color: "#39ff8a", ...mono, fontSize: "0.72rem", display: "flex", gap: 6 }}>
                  <Spinner /> Loading…
                </div>
              ) : (
                <pre style={{ margin: 0, ...mono, fontSize: "0.71rem", lineHeight: 1.9, whiteSpace: "pre-wrap" }}>
                  {(cache.yaml?.error || cache.yaml?.yaml || "").split("\n").map((line, i) => {
                    const ind = line.match(/^(\s*)/)?.[1]?.length ?? 0;
                    let c = "#4a7a8a";
                    if (line.trim().startsWith("#")) c = "#1e3a52";
                    else if (ind === 0 && /\w+:/.test(line)) c = "#7dd3fc";
                    else if (ind <= 2 && /\w+:/.test(line)) c = "#c4b5fd";
                    else if (/\w+:/.test(line)) c = "#a5f3fc";
                    else if (/^(\s*)-/.test(line)) c = "#86efac";
                    else c = "#fde68a";
                    return (
                      <span key={i} style={{ color: c, display: "block" }}>
                        {line}
                      </span>
                    );
                  })}
                </pre>
              )}
            </div>
          </div>
        )}
        {subTab === "events" && (
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
                {fetching.events ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 20 }}>
                      <div style={{ color: "#39ff8a", ...mono, fontSize: "0.72rem", display: "flex", gap: 6 }}>
                        <Spinner /> Loading…
                      </div>
                    </td>
                  </tr>
                ) : (
                  (cache.events?.events || []).map((ev, i) => (
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
        )}
        {subTab === "graph" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div
              style={{
                padding: "5px 13px",
                borderBottom: "1px solid #0a1018",
                display: "flex",
                gap: 10,
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
                resource graph · click nodes to navigate
              </span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(kindColorMap).map(([k, c]) => (
                  <span
                    key={k}
                    style={{
                      fontSize: "0.61rem",
                      color: c,
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      ...mono,
                    }}
                  >
                    <span
                      style={{ width: 5, height: 5, borderRadius: "50%", background: c, display: "inline-block" }}
                    />
                    {k}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <GraphView
                graph={graph}
                onNavigate={(nd) => {
                  const rt = RESOURCE_TYPES.find(
                    (r) => r.label.replace(/s$/, "") === nd.kind || `${r.key.slice(0, -1)}` === nd.kind.toLowerCase(),
                  );
                  if (rt) {
                    const found = (allData[rt.key] || []).find((o) => o.name === nd.id);
                    if (found) onNavigate(rt.key, found);
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
