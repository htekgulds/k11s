import { mono } from "../theme";
import { nsColor } from "../utils/colors";
import { FieldRow } from "./ui/FieldRow";
import { Pill } from "./ui/Pill";
import { StatusDot } from "./ui/StatusDot";
import { kindColor } from "../utils/colors";
import { STATUS_COLOR } from "../theme";

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

export function InfoTab({ obj, type, related, onNavigate }) {
  return (
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
  );
}
