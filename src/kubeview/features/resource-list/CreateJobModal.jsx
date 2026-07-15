import { useState, useMemo } from "react";
import { Play, Plus } from "lucide-react";
import { applyYaml } from "../../api";
import { mono } from "../../theme";
import { Spinner } from "../../components/ui/Spinner";

export function CreateJobModal({ open, onClose, clusterId, namespace }) {
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [command, setCommand] = useState("");
  const [backoffLimit, setBackoffLimit] = useState(6);
  const [parallelism, setParallelism] = useState("");
  const [completions, setCompletions] = useState("");
  const [ttlSecondsAfterFinished, setTtlSecondsAfterFinished] = useState("");
  const [restartPolicy, setRestartPolicy] = useState("Never");
  const [showPreview, setShowPreview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);

  const resetForm = () => {
    setName("");
    setImage("");
    setCommand("");
    setBackoffLimit(6);
    setParallelism("");
    setCompletions("");
    setTtlSecondsAfterFinished("");
    setRestartPolicy("Never");
    setShowPreview(false);
    setResult(null);
    setApplying(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const jobYaml = useMemo(() => {
    if (!name || !image) return "";

    const lines = [];
    lines.push("apiVersion: batch/v1");
    lines.push("kind: Job");
    lines.push("metadata:");
    lines.push(`  name: ${name}`);
    lines.push("spec:");
    lines.push(`  backoffLimit: ${parseInt(backoffLimit, 10)}`);
    if (parallelism) {
      lines.push(`  parallelism: ${parseInt(parallelism, 10)}`);
    }
    if (completions) {
      lines.push(`  completions: ${parseInt(completions, 10)}`);
    }
    if (ttlSecondsAfterFinished) {
      lines.push(`  ttlSecondsAfterFinished: ${parseInt(ttlSecondsAfterFinished, 10)}`);
    }
    lines.push("  template:");
    lines.push("    spec:");
    lines.push("      containers:");
    lines.push("      - name: job");
    lines.push(`        image: ${image}`);
    if (command.trim()) {
      const parts = command.trim().split(/\s+/);
      lines.push(`        command:`);
      for (const p of parts) {
        lines.push(`        - ${p}`);
      }
    }
    lines.push(`      restartPolicy: ${restartPolicy}`);
    return lines.join("\n");
  }, [name, image, command, backoffLimit, parallelism, completions, ttlSecondsAfterFinished, restartPolicy]);

  const handleApply = async () => {
    if (!jobYaml) return;
    setApplying(true);
    setResult(null);
    try {
      const res = await applyYaml(clusterId, jobYaml, namespace || null);
      setResult({ ok: true, message: res });
    } catch (err) {
      setResult({ ok: false, message: String(err) });
    } finally {
      setApplying(false);
    }
  };

  if (!open) return null;

  const inputStyle = {
    background: "#080e18",
    border: "1px solid #0e1f2e",
    borderRadius: 3,
    color: "#bcc",
    padding: "5px 8px",
    ...mono,
    fontSize: "0.72rem",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  const labelStyle = {
    ...mono,
    fontSize: "0.65rem",
    color: "#4a7a8a",
    marginBottom: 3,
    display: "block",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.82)",
        zIndex: 2500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.13s ease",
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: "#0a0f18",
          border: "1px solid #0e1f2e",
          borderRadius: 8,
          width: "min(560px, 92vw)",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,0.95)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid #0a1420",
            display: "flex",
            alignItems: "center",
            gap: 9,
            flexShrink: 0,
          }}
        >
          <Play size={14} color="#39ff8a" />
          <span style={{ fontSize: "0.71rem", color: "#39ff8a", ...mono }}>
            Create Job
          </span>
          <button
            type="button"
            onClick={handleClose}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "1px solid #1a1a2e",
              borderRadius: 3,
              color: "#4a7a8a",
              cursor: "pointer",
              padding: "2px 8px",
              ...mono,
              fontSize: "0.67rem",
            }}
          >
            ✕ close
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px 14px" }}>
          {!showPreview ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Name */}
              <div>
                <label style={labelStyle}>Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="my-job"
                  style={inputStyle}
                />
              </div>

              {/* Image */}
              <div>
                <label style={labelStyle}>Image *</label>
                <input
                  type="text"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="busybox:1.36"
                  style={inputStyle}
                />
              </div>

              {/* Command (optional) */}
              <div>
                <label style={labelStyle}>Command (optional)</label>
                <input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="/bin/sh -c echo hello"
                  style={inputStyle}
                />
              </div>

              {/* Row: backoffLimit + restartPolicy */}
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Backoff Limit</label>
                  <input
                    type="number"
                    value={backoffLimit}
                    onChange={(e) => setBackoffLimit(parseInt(e.target.value, 10) || 0)}
                    min={0}
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Restart Policy</label>
                  <select
                    value={restartPolicy}
                    onChange={(e) => setRestartPolicy(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="Never">Never</option>
                    <option value="OnFailure">OnFailure</option>
                  </select>
                </div>
              </div>

              {/* Row: parallelism + completions */}
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Parallelism (optional)</label>
                  <input
                    type="number"
                    value={parallelism}
                    onChange={(e) => setParallelism(e.target.value)}
                    placeholder="1"
                    min={1}
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Completions (optional)</label>
                  <input
                    type="number"
                    value={completions}
                    onChange={(e) => setCompletions(e.target.value)}
                    placeholder="1"
                    min={1}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* TTL Seconds After Finished (optional) */}
              <div>
                <label style={labelStyle}>TTL Seconds After Finished (optional)</label>
                <input
                  type="number"
                  value={ttlSecondsAfterFinished}
                  onChange={(e) => setTtlSecondsAfterFinished(e.target.value)}
                  placeholder="300"
                  min={0}
                  style={inputStyle}
                />
              </div>
            </div>
          ) : (
            /* YAML preview */
            <div>
              <pre
                style={{
                  margin: 0,
                  ...mono,
                  fontSize: "0.71rem",
                  lineHeight: 1.9,
                  whiteSpace: "pre-wrap",
                  background: "#020408",
                  border: "1px solid #0e1f2e",
                  borderRadius: 4,
                  padding: 10,
                  maxHeight: 400,
                  overflow: "auto",
                }}
              >
                {jobYaml.split("\n").map((line, i) => {
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

              {result && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "8px 10px",
                    borderRadius: 4,
                    ...mono,
                    fontSize: "0.68rem",
                    background: result.ok ? "#0a2a10" : "#2a0808",
                    border: `1px solid ${result.ok ? "#1a5a20" : "#5a1010"}`,
                    color: result.ok ? "#39ff8a" : "#ff6b6b",
                  }}
                >
                  {result.ok ? "✅ " : "❌ "}{result.message}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "10px 14px",
            borderTop: "1px solid #0a1420",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          {!showPreview ? (
            <>
              <div style={{ flex: 1 }} />
              <button
                type="button"
                onClick={handleClose}
                style={{
                  background: "none",
                  border: "1px solid #0e1f2e",
                  borderRadius: 3,
                  color: "#4a7a8a",
                  cursor: "pointer",
                  padding: "4px 12px",
                  ...mono,
                  fontSize: "0.67rem",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                disabled={!name || !image}
                style={{
                  background: name && image ? "#0a2a10" : "none",
                  border: `1px solid ${name && image ? "#1a5a20" : "#0e1f2e"}`,
                  borderRadius: 3,
                  color: name && image ? "#39ff8a" : "#1e3a52",
                  cursor: name && image ? "pointer" : "not-allowed",
                  padding: "4px 14px",
                  ...mono,
                  fontSize: "0.7rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Plus size={14} />
                Review &amp; Create
              </button>
            </>
          ) : (
            <>
              {result && result.ok ? (
                <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={handleClose}
                    style={{
                      background: "#0a2a10",
                      border: "1px solid #1a5a20",
                      borderRadius: 3,
                      color: "#39ff8a",
                      cursor: "pointer",
                      padding: "4px 14px",
                      ...mono,
                      fontSize: "0.7rem",
                    }}
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
                    style={{
                      background: "none",
                      border: "1px solid #0e1f2e",
                      borderRadius: 3,
                      color: applying ? "#1e3a52" : "#4a7a8a",
                      cursor: applying ? "not-allowed" : "pointer",
                      padding: "4px 12px",
                      ...mono,
                      fontSize: "0.67rem",
                    }}
                  >
                    ← Back
                  </button>
                  <div style={{ flex: 1 }} />
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={applying || !jobYaml}
                    style={{
                      background: applying ? "#0a1a0a" : "none",
                      border: "1px solid #1a3a1a",
                      borderRadius: 3,
                      color: applying ? "#1e3a52" : "#39ff8a",
                      cursor: applying ? "not-allowed" : "pointer",
                      padding: "4px 14px",
                      ...mono,
                      fontSize: "0.7rem",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
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
