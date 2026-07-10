import { useState, useEffect } from "react";
import { k8sInvoke } from "../api";
import { mono } from "../theme";
import { Spinner } from "./ui/Spinner";

export function DescribeTab({ obj, clusterId }) {
  const [describe, setDescribe] = useState(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFetching(true);
      try {
        const res = await k8sInvoke(
          "describe_resource",
          { kind: obj.resourceType, name: obj.name, namespace: obj.namespace },
          clusterId,
        );
        if (!cancelled) setDescribe(res.describe);
      } catch (e) {
        if (!cancelled) setDescribe(`Error: ${e}`);
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => { cancelled = true; };
  }, [obj.name, obj.namespace, obj.resourceType, clusterId]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          background: "#050910",
          flexShrink: 0,
          borderBottom: "1px solid #0e1f2e",
        }}
      >
        <span style={{ color: "#fbbf24", ...mono, fontSize: "0.67rem" }}>
          describe
        </span>
        {fetching && <Spinner />}
      </div>
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "10px 13px",
          whiteSpace: "pre-wrap",
          fontFamily: "monospace",
          fontSize: "0.70rem",
          lineHeight: 1.5,
          color: "#bcc",
        }}
      >
        {fetching && !describe ? "Loading…" : describe}
      </div>
    </div>
  );
}
