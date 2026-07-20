import { ScrollText, Terminal, ArrowUpDown, RefreshCw, Edit, Trash2, AlertTriangle, Copy, ClipboardCopy, ArrowRightLeft, Undo2, History } from "lucide-react";
import { COMMON_RESOURCES } from "../../constants";
import { STATUS_COLOR, mono } from "../../theme";
import { nsColor } from "../../utils/colors";
import { Pill } from "../../components/ui/Pill";
import { k8sInvoke, rolloutAction } from "../../api";
import { useState } from "react";
import { cn } from "../../utils/cn";

const copyBtn = (txt, label) => (
  <button
    type="button"
    title={`Copy ${label}`}
    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(txt); }}
    className={cn(
      "inline-flex items-center p-[1px_3px] rounded text-[0.5rem] cursor-pointer transition-opacity",
      "bg-transparent border-none text-[#1e3a52] opacity-40 hover:opacity-100"
    )}
  >
    <Copy size={12} />
  </button>
);

export function DetailHeader({ obj, type, onGoTab, clusterId }) {
  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardPort, setForwardPort] = useState("");
  const [showShellPicker, setShowShellPicker] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const isErr = ["CrashLoopBackOff", "Error", "OOMKilled", "NotReady"].includes(obj.status);
  const statCol = STATUS_COLOR[obj.status] || "#556";
  const kindLbl = COMMON_RESOURCES.find((r) => r.key === type)?.label.replace(/s$/, "") || type;
  const kind = type === "statefulsets" ? "statefulset" : type === "deployments" ? "deployment" : type;

  const runRollout = async (action) => {
    setFeedback({ action, status: "running" });
    try {
      const res = await rolloutAction(clusterId, kind, obj.name, obj.namespace, action);
      setFeedback({ action, status: "ok", msg: res.message });
    } catch (e) {
      setFeedback({ action, status: "err", msg: String(e) });
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  const isRolloutKind = type === "deployments" || type === "statefulsets";

  const containers = obj?.containers || [];
  const multiContainer = containers.length > 1;

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
            fn: () =>
              multiContainer
                ? setShowShellPicker(true)
                : alert(`kubectl exec -it ${obj.name} -n ${obj.namespace} -- sh`),
          },
          { label: "Forward", icon: <ArrowRightLeft size={14} />, color: "#fb923c", fn: () => setForwardOpen(true) },
        ]
      : []),
    ...(isRolloutKind
      ? [
          { label: "Restart", icon: <RefreshCw size={14} />, color: "#67e8f9", fn: () => runRollout("restart") },
          { label: "Undo", icon: <Undo2 size={14} />, color: "#f9a8d4", fn: () => runRollout("undo") },
          { label: "History", icon: <History size={14} />, color: "#c4b5fd", fn: () => runRollout("history") },
        ]
      : []),
    { label: "Edit YAML", icon: <Edit size={14} />, color: "#fb923c", fn: () => onGoTab("yaml") },
    { label: "Delete", icon: <Trash2 size={14} />, color: "#ff4d4d", fn: () => alert(`Delete ${obj.name}`) },
  ];

  const closeAllModals = () => { setForwardOpen(false); setForwardPort(""); setShowShellPicker(false); };

  const actionBtnStyle = (a) => cn(
    "px-[9px] py-[4px] rounded text-[0.67rem] font-mono cursor-pointer transition-all",
    "flex items-center gap-1.5",
    `border border-${a.color}28 bg-[#0a1018] text-[${a.color}]`,
    "hover:bg-[${a.color}10]",
    feedback?.status === "running" && "cursor-wait opacity-50"
  );

  return (
    <div className="flex items-start gap-[11px] mb-[11px]">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[7px] flex-wrap mb-1">
          <span className={cn(
            "font-mono font-bold text-[0.92rem] text-[#dde] break-all"
          )}>
            {obj.name}
          </span>
          {copyBtn(obj.name, "name")}
          {obj.namespace && copyBtn(`${obj.namespace}/${obj.name}`, "namespace/name")}
          <Pill label={kindLbl} color={statCol} />
          {isErr && (
            <Pill
              label={<span className="inline-flex items-center gap-[3px]"><AlertTriangle size={12} /> degraded</span>}
              color="#ff4d4d"
            />
          )}
        </div>
        <div className="flex gap-[9px] flex-wrap">
          {obj.namespace && (
            <span className="inline-flex items-center gap-[3px]">
              <span style={{ fontSize: "0.67rem", color: nsColor(obj.namespace) }} className="font-mono">
                ns/{obj.namespace}
              </span>
              {copyBtn(obj.namespace, "namespace")}
            </span>
          )}
          {obj.age && (
            <span style={{ fontSize: "0.67rem", color: "#1e3a52" }} className="font-mono">
              age/{obj.age}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-[5px] flex-wrap flex-shrink-0">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={a.fn}
            disabled={feedback?.status === "running"}
            className={actionBtnStyle(a)}
          >
            {a.icon}
            <span>{a.label}</span>
          </button>
        ))}
        {feedback && (
          <span className={cn(
            "items-center self-center max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[0.62rem]",
            feedback.status === "err" ? "text-[#ff4d4d]" : "text-[#39ff8a]"
          )}>
            {feedback.status === "running"
              ? `${feedback.action}…`
              : feedback.msg || (feedback.status === "ok" ? "✓ done" : "✗ failed")}
          </span>
        )}
      </div>

      {(forwardOpen || showShellPicker) && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60"
          onClick={closeAllModals}
        >
          <div
            className={cn(
              "p-5 rounded-lg min-w-[300px] font-mono",
              forwardOpen
                ? "bg-[#0a1018] border border-[#fb923c40]"
                : "bg-[#0a1018] border border-[#c4b5fd40]"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {forwardOpen ? (
              <>
                <div className="flex items-center gap-2 mb-[14px]">
                  <ArrowRightLeft size={18} color="#fb923c" />
                  <span style={{ color: "#fb923c", fontWeight: 700, fontSize: "0.85rem" }}>
                    Port Forward
                  </span>
                </div>

                <div className="mb-[14px] text-[0.72rem] leading-[1.6]">
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

                <div className="mb-[16px]">
                  <label className="flex items-center gap-2" style={{ color: "#889", fontSize: "0.67rem" }}>
                    Remote port:
                    <input
                      type="number"
                      min="1"
                      max="65535"
                      value={forwardPort}
                      onChange={(e) => setForwardPort(e.target.value)}
                      placeholder="e.g. 8080"
                      onKeyDown={(e) => { if (e.key === "Enter") handlePortForward(); }}
                      className={cn(
                        "px-2 py-1 rounded text-[0.68rem] font-mono outline-none w-[120px]",
                        "bg-[#080e18] border border-[#1e3a52] text-[#bcc]"
                      )}
                    />
                  </label>
                  <div style={{ color: "#667", fontSize: "0.62rem", marginTop: 6 }}>
                    Local port will be chosen automatically (starts at :9999).
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => { setForwardOpen(false); setForwardPort(""); }}
                    className={cn(
                      "px-[9px] py-[4px] rounded text-[0.67rem] font-mono cursor-pointer",
                      "flex items-center gap-1.5",
                      "bg-transparent border border-[#66728] text-[#667]",
                      "hover:bg-[#0a1420] hover:border-[#1a3a4a]"
                    )}
                  >
                    <ArrowRightLeft size={12} /> Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePortForward}
                    disabled={!forwardPort}
                    className={cn(
                      "px-[9px] py-[4px] rounded text-[0.67rem] font-mono cursor-pointer",
                      "flex items-center gap-1.5",
                      "bg-[#0a1018] border text-[#fb923c]",
                      forwardPort
                        ? "border-[#fb923c28] cursor-pointer opacity-100 hover:bg-[#fb923c10]"
                        : "border-[#66728] cursor-default opacity-50"
                    )}
                  >
                    <ArrowRightLeft size={12} /> Forward
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-[14px]">
                  <Terminal size={18} color="#c4b5fd" />
                  <span style={{ color: "#c4b5fd", fontWeight: 700, fontSize: "0.85rem" }}>
                    Open Shell
                  </span>
                </div>

                <div className="mb-[14px] text-[0.72rem] leading-[1.6]">
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

                <div style={{ color: "#667", fontSize: "0.62rem", marginBottom: 12 }}>
                  Select container to open a shell:
                </div>

                {containers.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `kubectl exec -it ${obj.name} -c ${c} -n ${obj.namespace} -- sh`
                      );
                      setShowShellPicker(false);
                    }}
                    className={cn(
                      "w-full text-left p-[6px_10px] rounded text-[0.72rem] font-mono cursor-pointer mb-1",
                      "bg-[#080e18] border border-[#1e3a52] text-[#bcc]",
                      "hover:bg-[#0e1f2e]"
                    )}
                  >
                    {c}
                    <span style={{ color: "#667", fontSize: "0.62rem", marginLeft: 8 }}>
                      copy command
                    </span>
                  </button>
                ))}

                <div className="flex justify-end mt-[10px]">
                  <button
                    type="button"
                    onClick={() => setShowShellPicker(false)}
                    className={cn(
                      "px-[9px] py-[4px] rounded text-[0.67rem] font-mono cursor-pointer",
                      "bg-transparent border border-[#66728] text-[#667]",
                      "hover:bg-[#0a1420] hover:border-[#1a3a4a]"
                    )}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}