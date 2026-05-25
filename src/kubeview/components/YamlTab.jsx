import { useCallback, useEffect, useState } from "react";
import { k8sInvoke } from "../api";
import { mono } from "../theme";
import { Spinner } from "./ui/Spinner";

export function YamlTab({ obj, type, clusterId }) {
  const [yaml, setYaml] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [hideMF, setHideMF] = useState(true);

  const load = useCallback(
    async (omit) => {
      setFetching(true);
      try {
        const res = await k8sInvoke(
          "get_yaml",
          { kind: type, name: obj.name, namespace: obj.namespace || null, omitManagedFields: omit },
          clusterId,
        );
        setYaml(res);
      } catch (err) {
        setYaml({ error: String(err) });
      } finally {
        setFetching(false);
      }
    },
    [type, obj.name, obj.namespace, clusterId],
  );

  useEffect(() => { load(hideMF); }, [hideMF, load]);

  return (
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
          onClick={() => setHideMF((p) => !p)}
          style={{
            marginLeft: "auto",
            background: "none",
            border: "1px solid #0e1f2e",
            borderRadius: 3,
            color: hideMF ? "#1e3a52" : "#7dd3fc",
            cursor: "pointer",
            padding: "2px 7px",
            ...mono,
            fontSize: "0.67rem",
          }}
        >
          {hideMF ? "show managed fields" : "hide managed fields"}
        </button>
        <button
          type="button"
          style={{
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
        {fetching ? (
          <div style={{ color: "#39ff8a", ...mono, fontSize: "0.72rem", display: "flex", gap: 6 }}>
            <Spinner /> Loading…
          </div>
        ) : (
          <pre style={{ margin: 0, ...mono, fontSize: "0.71rem", lineHeight: 1.9, whiteSpace: "pre-wrap" }}>
            {(yaml?.error || yaml?.yaml || "").split("\n").map((line, i) => {
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
  );
}
