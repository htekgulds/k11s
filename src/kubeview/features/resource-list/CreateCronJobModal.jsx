import { useState, useMemo } from "react";
import { Clock, Plus, X } from "lucide-react";
import { applyYaml } from "../../api";
import { cn } from "../../utils/cn";
import { Spinner } from "../../components/ui/Spinner";

export function CreateCronJobModal({ open, onClose, clusterId, namespace }) {
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [schedule, setSchedule] = useState("");
  const [command, setCommand] = useState("");
  const [backoffLimit, setBackoffLimit] = useState(6);
  const [concurrencyPolicy, setConcurrencyPolicy] = useState("Allow");
  const [startingDeadlineSeconds, setStartingDeadlineSeconds] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);

  const resetForm = () => {
    setName("");
    setImage("");
    setSchedule("");
    setCommand("");
    setBackoffLimit(6);
    setConcurrencyPolicy("Allow");
    setStartingDeadlineSeconds("");
    setShowPreview(false);
    setResult(null);
    setApplying(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const cronJobYaml = useMemo(() => {
    if (!name || !image || !schedule) return "";

    const lines = [];
    lines.push("apiVersion: batch/v1");
    lines.push("kind: CronJob");
    lines.push("metadata:");
    lines.push(`  name: ${name}`);
    lines.push("spec:");
    lines.push(`  schedule: "${schedule}"`);
    lines.push(`  concurrencyPolicy: ${concurrencyPolicy}`);
    if (startingDeadlineSeconds) {
      lines.push(`  startingDeadlineSeconds: ${parseInt(startingDeadlineSeconds, 10)}`);
    }
    lines.push("  jobTemplate:");
    lines.push("    spec:");
    lines.push(`      backoffLimit: ${parseInt(backoffLimit, 10)}`);
    lines.push("      template:");
    lines.push("        spec:");
    lines.push("          containers:");
    lines.push("          - name: cron");
    lines.push(`            image: ${image}`);
    if (command.trim()) {
      const parts = command.trim().split(/\s+/);
      lines.push(`            command:`);
      for (const p of parts) {
        lines.push(`            - ${p}`);
      }
    }
    lines.push("          restartPolicy: OnFailure");
    return lines.join("\n");
  }, [name, image, schedule, command, backoffLimit, concurrencyPolicy, startingDeadlineSeconds]);

  const handleApply = async () => {
    if (!cronJobYaml) return;
    setApplying(true);
    setResult(null);
    try {
      const res = await applyYaml(clusterId, cronJobYaml, namespace || null);
      setResult({ ok: true, message: res });
    } catch (err) {
      setResult({ ok: false, message: String(err) });
    } finally {
      setApplying(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[2500] flex items-center justify-center",
        "bg-black/82 animate-[fadeIn_0.13s_ease]"
      )}
      onClick={handleClose}
    >
      <div
        className={cn(
          "w-[min(560px,92vw)] max-h-[85vh] flex flex-col overflow-hidden",
          "bg-[#0a0f18] border border-[#0e1f2e] rounded-lg",
          "shadow-[0_24px_64px_rgba(0,0,0,0.95)] animate-[fadeIn_0.13s_ease]"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={cn(
          "px-[14px] py-[10px] border-b border-[#0a1420]",
          "flex items-center gap-[9px] flex-shrink-0"
        )}>
          <Clock size={14} color="#39ff8a" />
          <span className="text-[0.71rem] text-[#39ff8a] font-mono">
            Create CronJob
          </span>
          <button
            type="button"
            onClick={handleClose}
            className={cn(
              "ml-auto px-[8px] py-[2px] rounded text-[0.67rem] font-mono cursor-pointer",
              "bg-transparent border border-[#1a1a2e] text-[#4a7a8a]",
              "hover:bg-[#0a1420] hover:border-[#1a3a4a] hover:text-[#7dd3fc]"
            )}
          >
            ✕ close
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-[12px_14px]">
          {!showPreview ? (
            <div className="flex flex-col gap-[10px]">
              {/* Name */}
              <div>
                <label className={cn("block mb-[3px] font-mono text-[0.65rem] text-[#4a7a8a]")}>
                  Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="my-cronjob"
                  className={cn(
                    "w-full box-border px-[8px] py-[5px] rounded text-[0.72rem] font-mono outline-none",
                    "bg-[#080e18] border border-[#0e1f2e] text-[#bcc]"
                  )}
                />
              </div>

              {/* Image */}
              <div>
                <label className={cn("block mb-[3px] font-mono text-[0.65rem] text-[#4a7a8a]")}>
                  Image *
                </label>
                <input
                  type="text"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="busybox:1.36"
                  className={cn(
                    "w-full box-border px-[8px] py-[5px] rounded text-[0.72rem] font-mono outline-none",
                    "bg-[#080e18] border border-[#0e1f2e] text-[#bcc]"
                  )}
                />
              </div>

              {/* Schedule */}
              <div>
                <label className={cn("block mb-[3px] font-mono text-[0.65rem] text-[#4a7a8a]")}>
                  Schedule (cron syntax) *
                </label>
                <input
                  type="text"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  placeholder="*/5 * * * *"
                  className={cn(
                    "w-full box-border px-[8px] py-[5px] rounded text-[0.72rem] font-mono outline-none",
                    "bg-[#080e18] border border-[#0e1f2e] text-[#bcc]"
                  )}
                />
              </div>

              {/* Command (optional) */}
              <div>
                <label className={cn("block mb-[3px] font-mono text-[0.65rem] text-[#4a7a8a]")}>
                  Command (optional)
                </label>
                <input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="/bin/sh -c echo hello"
                  className={cn(
                    "w-full box-border px-[8px] py-[5px] rounded text-[0.72rem] font-mono outline-none",
                    "bg-[#080e18] border border-[#0e1f2e] text-[#bcc]"
                  )}
                />
              </div>

              {/* Row: backoffLimit + concurrencyPolicy */}
              <div className="flex gap-[10px]">
                <div className="flex-1">
                  <label className={cn("block mb-[3px] font-mono text-[0.65rem] text-[#4a7a8a]")}>
                    Backoff Limit
                  </label>
                  <input
                    type="number"
                    value={backoffLimit}
                    onChange={(e) => setBackoffLimit(parseInt(e.target.value, 10) || 0)}
                    min={0}
                    className={cn(
                      "w-full box-border px-[8px] py-[5px] rounded text-[0.72rem] font-mono outline-none",
                      "bg-[#080e18] border border-[#0e1f2e] text-[#bcc]"
                    )}
                  />
                </div>
                <div className="flex-1">
                  <label className={cn("block mb-[3px] font-mono text-[0.65rem] text-[#4a7a8a]")}>
                    Concurrency Policy
                  </label>
                  <select
                    value={concurrencyPolicy}
                    onChange={(e) => setConcurrencyPolicy(e.target.value)}
                    className={cn(
                      "w-full box-border px-[8px] py-[5px] rounded text-[0.72rem] font-mono outline-none",
                      "bg-[#080e18] border border-[#0e1f2e] text-[#bcc] cursor-pointer"
                    )}
                  >
                    <option value="Allow">Allow</option>
                    <option value="Forbid">Forbid</option>
                    <option value="Replace">Replace</option>
                  </select>
                </div>
              </div>

              {/* Starting Deadline Seconds (optional) */}
              <div>
                <label className={cn("block mb-[3px] font-mono text-[0.65rem] text-[#4a7a8a]")}>
                  Starting Deadline Seconds (optional)
                </label>
                <input
                  type="number"
                  value={startingDeadlineSeconds}
                  onChange={(e) => setStartingDeadlineSeconds(e.target.value)}
                  placeholder="60"
                  min={0}
                  className={cn(
                    "w-full box-border px-[8px] py-[5px] rounded text-[0.72rem] font-mono outline-none",
                    "bg-[#080e18] border border-[#0e1f2e] text-[#bcc]"
                  )}
                />
              </div>
            </div>
          ) : (
            /* YAML preview */
            <div>
              <pre className={cn(
                "m-0 font-mono text-[0.71rem] leading-[1.9] whitespace-pre-wrap",
                "bg-[#020408] border border-[#0e1f2e] rounded p-[10px]",
                "max-h-[400px] overflow-auto"
              )}>
                {cronJobYaml.split("\n").map((line, i) => {
                  const ind = line.match(/^(\s*)/)?.[1]?.length ?? 0;
                  let c = "#4a7a8a";
                  if (line.trim().startsWith("#")) c = "#1e3a52";
                  else if (ind === 0 && /\w+:/.test(line)) c = "#7dd3fc";
                  else if (ind <= 2 && /\w+:/.test(line)) c = "#c4b5fd";
                  else if (/\w+:/.test(line)) c = "#a5f3fc";
                  else if (/^(\s*)-/.test(line)) c = "#86efac";
                  else c = "#fde68a";
                  return (
                    <span key={i} className="block" style={{ color: c }}>
                      {line}
                    </span>
                  );
                })}
              </pre>

              {result && (
                <div className={cn(
                  "mt-[10px] p-[8px_10px] rounded font-mono text-[0.68rem]",
                  result.ok
                    ? "bg-[#0a2a10] border border-[#1a5a20] text-[#39ff8a]"
                    : "bg-[#2a0808] border border-[#5a1010] text-[#ff6b6b]"
                )}>
                  {result.ok ? "✅ " : "❌ "}{result.message}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={cn(
          "px-[14px] py-[10px] border-t border-[#0a1420]",
          "flex items-center gap-[10px] flex-shrink-0"
        )}>
          {!showPreview ? (
            <>
              <div className="flex-1" />
              <button
                type="button"
                onClick={handleClose}
                className={cn(
                  "px-[12px] py-[4px] rounded text-[0.67rem] font-mono cursor-pointer",
                  "bg-transparent border border-[#0e1f2e] text-[#4a7a8a]",
                  "hover:bg-[#0a1420] hover:border-[#1a3a4a] hover:text-[#7dd3fc]"
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                disabled={!name || !image || !schedule}
                className={cn(
                  "px-[14px] py-[4px] rounded text-[0.7rem] font-mono cursor-pointer",
                  "flex items-center gap-[6px] transition-colors",
                  name && image && schedule
                    ? "bg-[#0a2a10] border border-[#1a5a20] text-[#39ff8a] hover:bg-[#103a18]"
                    : "bg-transparent border border-[#0e1f2e] text-[#1e3a52] cursor-not-allowed"
                )}
              >
                <Plus size={14} /> Review & Create
              </button>
            </>
          ) : (
            <>
              {result && result.ok ? (
                <div className="flex-1 flex justify-end">
                  <button
                    type="button"
                    onClick={handleClose}
                    className={cn(
                      "px-[14px] py-[4px] rounded text-[0.7rem] font-mono cursor-pointer",
                      "bg-[#0a2a10] border border-[#1a5a20] text-[#39ff8a]"
                    )}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowPreview(false)}
                    disabled={applying}
                    className={cn(
                      "px-[12px] py-[4px] rounded text-[0.67rem] font-mono cursor-pointer",
                      "bg-transparent border border-[#0e1f2e]",
                      applying
                        ? "text-[#1e3a52] cursor-not-allowed"
                        : "text-[#4a7a8a] hover:bg-[#0a1420] hover:border-[#1a3a4a] hover:text-[#7dd3fc]"
                    )}
                  >
                    ← Back
                  </button>
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={applying || !cronJobYaml}
                    className={cn(
                      "px-[14px] py-[4px] rounded text-[0.7rem] font-mono cursor-pointer",
                      "flex items-center gap-[6px] border border-[#1a3a1a]",
                      applying
                        ? "bg-[#0a1a0a] text-[#1e3a52] cursor-not-allowed"
                        : "bg-transparent text-[#39ff8a] hover:bg-[#0a1a0a] hover:border-[#39ff8a]"
                    )}
                  >
                    {applying && <Spinner />}
                    {applying ? "applying…" : "▶ Apply"}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}