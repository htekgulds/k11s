import { RESOURCE_TYPES } from "../constants";
import { kindColorMap, mono } from "../theme";
import { GraphView } from "./GraphView";

export function GraphTab({ graph, allData, onNavigate }) {

  return (
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
  );
}
