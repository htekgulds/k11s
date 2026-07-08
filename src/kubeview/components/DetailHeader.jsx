import { ScrollText, Terminal, ArrowUpDown, RefreshCw, Edit, Trash2, AlertTriangle, Copy, ClipboardCopy, ArrowRightLeft } from "lucide-react";
import { RESOURCE_TYPES } from "../constants";
import { STATUS_COLOR, mono } from "../theme";
import { nsColor } from "../utils/colors";
import { Pill } from "./ui/Pill";
import { k8sInvoke } from "../api";
import { useState } from "react";

const copyBtn = (txt, label) => (
  <button
    type="button"
    title={`Copy ${label}`}
    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(txt); }}
    style={{
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#1e3a52",
      padding: "1px 3px",
      borderRadius: 3,
      display: "inline-flex",
      alignItems: "center",
      opacity: 0.4,
      transition: "opacity 0.1s",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
    onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.4"; }}
  >
    <Copy size={12} />
  </button>
);

export function DetailHeader({ obj, type, onGoTab, clusterId }) {
  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardPort, setForwardPort] = useState("");
  const [feedback, setFeedback] = useState(null);
  const isErr = ["CrashLoopBackOff", "Error", "OOMKilled", "NotReady"].includes(obj.status);
  const statCol = STATUS_COLOR[obj.status] || "#556";
  const kindLbl = RESOURCE_TYPES.find((r) => r.key === type)?.label.replace(/s$/, "") || type;

  const handlePortForward = async () => {
    if (!forwardPort) return;
    try {
      await k8sInvoke("start_port_forward", {
        namespace: obj.namespace,
        podName: obj.name,
        remotePort: parseInt(forwardPort, 10),
      }, clusterId);
      setFeedback({ action: "port-forward", status: "ok", msg: `Forwarding :${forwardPort}` });
      setForwardOpen(false);
      setForwardPort("");
    } catch (e) {
      setFeedback({ action: "port-forward", status: "err", msg: String(e) });
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  const actions = [
    ...(type === "pods"
      ? [
          { label: "Logs", icon: <ScrollText size={14} />, color: "#fde68a", fn: () => onGoTab("logs") },
          {
            label: "Shell",
            icon: <Terminal size={14} />,
            color: "#c4b5fd",
            fn: () => alert(`kubectl exec -it ${obj.name} -n ${obj.namespace} -- sh`),
          },
          { label: "Forward", icon: <ArrowRightLeft size={14} />, color: "#fb923c", fn: () => setForwardOpen(true) },
        ]
      : []),
    ...(type === "deployments" || type === "statefulsets"
      ? [
          { label: "Scale", icon: <ArrowUpDown size={14} />, color: "#f9a8d4", fn: () => alert("Scale") },
          { label: "Redeploy", icon: <RefreshCw size={14} />, color: "#67e8f9", fn: () => alert("Restart") },
        ]
      : []),
    { label: "Edit YAML", icon: <Edit size={14} />, color: "#fb923c", fn: () => onGoTab("yaml") },
    { label: "Delete", icon: <Trash2 size={14} />, color: "#ff4d4d", fn: () => alert(`Delete ${obj.name}`) },
  ];

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 11, marginBottom: 11 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 4 }}>
          <span style={{ ...mono, fontWeight: 700, fontSize: "0.92rem", color: "#dde", wordBreak: "break-all" }}>
            {obj.name}
          </span>
          {copyBtn(obj.name, "name")}
          {obj.namespace && copyBtn(`${obj.namespace}/${obj.name}`, "namespace/name")}
          <Pill label={kindLbl} color={statCol} />
          {isErr && <Pill label={<span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><AlertTriangle size={12} /> degraded</span>} color="#ff4d4d" />}
        </div>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          {obj.namespace && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: "0.67rem", color: nsColor(obj.namespace), ...mono }}>
                ns/{obj.namespace}
              </span>
              {copyBtn(obj.namespace, "namespace")}
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
            {a.icon}
            <span>{a.label}</span>
          </button>
        ))}
        {feedback && (
          <span style={{
            ...mono, fontSize: "0.62rem", color: feedback.status === "err" ? "#ff4d4d" : "#39ff8a",
            alignSelf: "center", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {feedback.msg}
          </span>
        )}
      </div>

      {forwardOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.6)",
          }}
          onClick={() => setForwardOpen(false)}
        >
          <div
            style={{
              background: "#0a1018",
              border: "1px solid #fb923c40",
              borderRadius: 8,
              padding: 20,
              minWidth: 300,
              ...mono,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <ArrowRightLeft size={18} color="#fb923c" />
              <span style={{ color: "#fb923c", fontWeight: 700, fontSize: "0.85rem" }}>
                Port Forward
              </span>
            </div>

            <div style={{ marginBottom: 14, fontSize: "0.72rem", lineHeight: "1.6" }}>
              <span style={{ color: "#889" }}>Pod: </span>
              <span style={{ color: "#bcc", fontWeight: 600 }}>{obj.name}</span>
              {obj.namespace && (
                <>
                  <br />
                  <span style={{ color: "#889" }}>Namespace: </span>
                  <span style={{ color: nsColor(obj.namespace) }}>{obj.namespace}</span>
                </>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ color: "#889", fontSize: "0.67rem", display: "flex", alignItems: "center", gap: 6 }}>
                Remote port:
                <input
                  type="number"
                  min="1"
                  max="65535"
                  value={forwardPort}
                  onChange={(e) => setForwardPort(e.target.value)}
                  placeholder="e.g. 8080"
                  style={{
                    background: "#080e18",
                    border: "1px solid #1e3a52",
                    borderRadius: 3,
                    color: "#bcc",
                    padding: "4px 8px",
                    ...mono,
                    fontSize: "0.68rem",
                    outline: "none",
                    width: 120,
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") handlePortForward(); }}
                />
              </label>
              <div style={{ color: "#667", fontSize: "0.62rem", marginTop: 6 }}>
                Local port will be chosen automatically (starts at :9999).
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => { setForwardOpen(false); setForwardPort(""); }}
                style={{
                  background: "transparent",
                  border: "1px solid #66728",
                  borderRadius: 4,
                  color: "#667",
                  cursor: "pointer",
                  padding: "4px 9px",
                  ...mono,
                  fontSize: "0.67rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <ArrowRightLeft size={12} /> Cancel
              </button>
              <button
                type="button"
                onClick={handlePortForward}
                style={{
                  background: "#0a1018",
                  border: `1px solid ${forwardPort ? "#fb923c28" : "#66728"}`,
                  borderRadius: 4,
                  color: forwardPort ? "#fb923c" : "#667",
                  cursor: forwardPort ? "pointer" : "default",
                  padding: "4px 9px",
                  ...mono,
                  fontSize: "0.67rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  opacity: forwardPort ? 1 : 0.5,
                }}
                disabled={!forwardPort}
              >
                <ArrowRightLeft size={12} /> Forward
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
