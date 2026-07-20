import { mono } from "../../theme";
import { kindColor, nsColor } from "../../utils/colors";
import { cn } from "../../utils/cn";

export function GraphView({ graph, onNavigate }) {
  const { nodes, edges } = graph;
  if (!nodes.length) {
    return (
      <div className={cn(
        "flex items-center justify-center h-full",
        "text-[#1a2d3d] font-mono text-[0.73rem]"
      )}>
        No related resources found
      </div>
    );
  }
  const n = nodes.length;
  const cx = 500;
  const cy = 230;
  const r = 165;
  const pos = nodes.map((nd, i) => ({
    ...nd,
    x: cx + Math.cos(i === 0 ? -Math.PI / 2 : -Math.PI / 2 + (2 * Math.PI * i) / Math.max(n - 1, 1)) * (i === 0 ? 0 : r),
    y: cy + Math.sin(i === 0 ? -Math.PI / 2 : -Math.PI / 2 + (2 * Math.PI * i) / Math.max(n - 1, 1)) * (i === 0 ? 0 : r),
  }));
  const posMap = Object.fromEntries(pos.map((nd) => [nd.id, nd]));
  const isErr = (nd) => ["error", "CrashLoopBackOff", "NotReady", "Error", "OOMKilled"].includes(nd.status);

  return (
    <div className={cn(
      "w-full h-full flex items-center justify-center overflow-auto"
    )}>
      <svg viewBox="0 0 1000 460" className="w-full max-w-[1000px] min-h-[280px]">
        <defs>
          <marker id="arr" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
            <path d="M0,0 L0,7 L7,3.5 z" fill="#1e3a52" />
          </marker>
          <filter id="g2">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="g1">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {edges.map((e, i) => {
          const f = posMap[e.from];
          const t = posMap[e.to];
          if (!f || !t) return null;
          return (
            <g key={i}>
              <line
                x1={f.x}
                y1={f.y}
                x2={t.x}
                y2={t.y}
                stroke="#0e1f2e"
                strokeWidth="1.5"
                markerEnd="url(#arr)"
                strokeDasharray="5 3"
              />
              {e.label && (
                <text
                  x={(f.x + t.x) / 2}
                  y={(f.y + t.y) / 2 - 8}
                  textAnchor="middle"
                  fill="#1e3a52"
                  fontSize="9"
                  fontFamily="'JetBrains Mono', monospace"
                >
                  {e.label}
                </text>
              )}
            </g>
          );
        })}
        {pos.map((nd, i) => {
          const col = kindColor(nd.kind);
          const err = isErr(nd);
          const rad = i === 0 ? 44 : 32;
          return (
            <g key={nd.id} className="cursor-pointer" onClick={() => onNavigate?.(nd)}>
              {err && (
                <circle
                  cx={nd.x}
                  cy={nd.y}
                  r={rad + 7}
                  fill="none"
                  stroke="#ff4d4d"
                  strokeWidth="1"
                  opacity="0.2"
                  strokeDasharray="4 4"
                />
              )}
              <circle
                cx={nd.x}
                cy={nd.y}
                r={rad}
                fill="#060a10"
                stroke={err ? "#ff4d4d" : col}
                strokeWidth={i === 0 ? 2.5 : 1.5}
                filter={i === 0 ? "url(#g2)" : "url(#g1)"}
              />
              <text
                x={nd.x}
                y={nd.y - 9}
                textAnchor="middle"
                fill={err ? "#ff6060" : col}
                fontSize={i === 0 ? 11 : 9}
                fontFamily="'JetBrains Mono', monospace"
                fontWeight="700"
              >
                {nd.kind}
              </text>
              <text
                x={nd.x}
                y={nd.y + 4}
                textAnchor="middle"
                fill="#aac"
                fontSize={i === 0 ? 9 : 8}
                fontFamily="'JetBrains Mono', monospace"
              >
                {nd.label.length > 20 ? `${nd.label.slice(0, 18)}…` : nd.label}
              </text>
              {nd.ns && (
                <text
                  x={nd.x}
                  y={nd.y + 17}
                  textAnchor="middle"
                  fill={nsColor(nd.ns)}
                  fontSize="7.5"
                  fontFamily="'JetBrains Mono', monospace"
                  opacity="0.8"
                >
                  {nd.ns}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}