import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Hexagon, Box, AlertTriangle, Info, Server, Cloud, Cpu, Database } from "lucide-react";
import { mono, PROVIDER_ICON } from "../../theme";
import { getClusterDashboard } from "../../api/dashboard";

// ── Styles (inline, matching existing theme) ──────────────────────────────

const styles = {
  container: {
    flex: 1, overflowY: "auto", padding: "12px 16px",
    background: "#060a10",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 14,
  },
  title: {
    color: "#bdd", ...mono, fontSize: "0.85rem", fontWeight: 600,
    display: "flex", alignItems: "center", gap: 8,
  },
  refreshBtn: {
    background: "none", border: "1px solid #0e1f2e",
    borderRadius: 4, color: "#4a7a8a", cursor: "pointer",
    padding: "4px 10px", ...mono, fontSize: "0.62rem",
    display: "flex", alignItems: "center", gap: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#4a7a8a", ...mono, fontSize: "0.57rem",
    letterSpacing: "0.12em", textTransform: "uppercase",
    marginBottom: 8,
  },
  cardGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
    gap: 8,
  },
  card: {
    background: "#080e18", border: "1px solid #0e1f2e",
    borderRadius: 6, padding: "10px 12px",
    ...mono,
  },
  cardValue: {
    fontSize: "1.2rem", fontWeight: 600, lineHeight: 1.2,
  },
  cardLabel: {
    fontSize: "0.62rem", color: "#2d4a6a", marginTop: 4,
  },
  resGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(76px, 1fr))",
    gap: 6,
  },
  resItem: {
    background: "#080e18", border: "1px solid #0e1f2e",
    borderRadius: 4, padding: "8px 8px", textAlign: "center" },
  resCount: {
    fontSize: "1.1rem", fontWeight: 600, lineHeight: 1.3,
  },
  resLabel: {
    fontSize: "0.55rem", color: "#2d4a6a", marginTop: 2,
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  table: {
    width: "100%", borderCollapse: "collapse",
    ...mono, fontSize: "0.65rem",
  },
  th: {
    textAlign: "left", padding: "6px 8px", color: "#2d4a6a",
    borderBottom: "1px solid #0e1f2e", fontWeight: 400,
    whiteSpace: "nowrap",
  },
  td: {
    padding: "5px 8px", borderBottom: "1px solid #080e18",
    color: "#c8d6e5", maxWidth: 160, overflow: "hidden",
    textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  warnRow: {
    background: "#1a1000",
  },
  warnText: {
    color: "#f5c518",
  },
  normalText: {
    color: "#7dd3fc",
  },
  infoBox: {
    background: "#080e18", border: "1px solid #0e1f2e",
    borderRadius: 6, padding: "10px 14px",
    display: "flex", alignItems: "center", gap: 10,
    ...mono,
  },
  infoLabel: {
    fontSize: "0.6rem", color: "#2d4a6a",
  },
  infoValue: {
    fontSize: "0.75rem", color: "#bdd",
  },
  spinner: {
    color: "#4a7a8a", fontSize: "0.71rem", ...mono, padding: 20,
  },
  errorBox: {
    background: "#1a0808", border: "1px solid #ff4d4d44",
    borderRadius: 6, padding: "10px 14px", color: "#ff4d4d",
    ...mono, fontSize: "0.71rem",
  },
};

// ── Color helpers ─────────────────────────────────────────────────────────

const healthColor = (ready, total) => {
  if (total === 0) return "#4a7a8a";
  if (ready === total) return "#39ff8a";
  if (ready > 0) return "#f5c518";
  return "#ff4d4d";
};

const eventTypeColor = (type) => {
  if (type === "Warning") return "#f5c518";
  if (type === "Normal") return "#7dd3fc";
  return "#c8d6e5";
};

// ── Mini card component ───────────────────────────────────────────────────

function StatCard({ icon, value, label, color }) {
  return (
    <div style={styles.card}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        {icon}
        <span style={{ fontSize: "0.55rem", color: "#2d4a6a" }}>{label}</span>
      </div>
      <div style={{ ...styles.cardValue, color: color || "#bdd" }}>{value}</div>
    </div>
  );
}

// ── Resource button ───────────────────────────────────────────────────────

function ResItem({ count, label, color }) {
  return (
    <div style={styles.resItem}>
      <div style={{ ...styles.resCount, color: color || "#bdd" }}>{count}</div>
      <div style={styles.resLabel}>{label}</div>
    </div>
  );
}

// ── Event row ─────────────────────────────────────────────────────────────

function EventRow({ ev, isWarn }) {
  return (
    <tr style={isWarn ? styles.warnRow : undefined}>
      <td style={{ ...styles.td, width: 60, color: eventTypeColor(ev.type) }}>
        {ev.type === "Warning" ? <AlertTriangle size={10} /> : <Info size={10} />}
      </td>
      <td style={{ ...styles.td, width: 80, color: isWarn ? "#f5c518" : "#7dd3fc" }}>
        {ev.reason}
      </td>
      <td style={{ ...styles.td }}>{ev.namespace}/{ev.name}</td>
      <td style={{ ...styles.td, maxWidth: 300 }}>{ev.message}</td>
      <td style={{ ...styles.td, width: 40, textAlign: "right", color: "#2d4a6a" }}>
        {ev.count > 1 ? `×${ev.count}` : ""}
      </td>
      <td style={{ ...styles.td, width: 50, textAlign: "right", color: "#2d4a6a" }}>
        {ev.last_seen}
      </td>
    </tr>
  );
}

// ── Main Dashboard component ──────────────────────────────────────────────

export function Dashboard({ clusterId, onRefreshResource }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    if (!clusterId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getClusterDashboard(clusterId);
      setData(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [clusterId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.spinner}>Fetching cluster dashboard…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBox}>
          <AlertTriangle size={12} style={{ marginRight: 6 }} />
          Failed to load dashboard: {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { node_health: nh, resource_counts: rc, recent_events: events, cluster_info: ci } = data;

  const resources = [
    { key: "pods", count: rc.pods, label: "Pods", color: "#39ff8a" },
    { key: "deployments", count: rc.deployments, label: "Deployments", color: "#7dd3fc" },
    { key: "statefulsets", count: rc.statefulsets, label: "StatefulSets", color: "#a5f3fc" },
    { key: "services", count: rc.services, label: "Services", color: "#f9a8d4" },
    { key: "ingresses", count: rc.ingresses, label: "Ingresses", color: "#fde68a" },
    { key: "configmaps", count: rc.configmaps, label: "ConfigMaps", color: "#c4b5fd" },
    { key: "secrets", count: rc.secrets, label: "Secrets", color: "#fb923c" },
    { key: "pvcs", count: rc.pvcs, label: "Volumes", color: "#fdba74" },
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.title}>
          <Hexagon size={16} color="#39ff8a" />
          Cluster Dashboard — {ci.name || clusterId}
        </div>
        <button type="button" onClick={fetchDashboard} style={styles.refreshBtn}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#bdd"; e.currentTarget.style.borderColor = "#1a3a4a"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#4a7a8a"; e.currentTarget.style.borderColor = "#0e1f2e"; }}
        >
          <RefreshCw size={10} /> Refresh
        </button>
      </div>

      {/* Cluster Info */}
      <div style={{ ...styles.infoBox, marginBottom: 16 }}>
        <Server size={14} color="#4a7a8a" />
        <div>
          <div style={styles.infoLabel}>Cluster</div>
          <div style={styles.infoValue}>{ci.version}</div>
        </div>
        <div style={{ width: 1, height: 24, background: "#0e1f2e", margin: "0 10px" }} />
        <div>
          <div style={styles.infoLabel}>Platform</div>
          <div style={{ ...styles.infoValue, display: "flex", alignItems: "center", gap: 4 }}>
            {PROVIDER_ICON[ci.platform?.toLowerCase()] || <Cloud size={12} />}
            {ci.platform}
          </div>
        </div>
        <div style={{ width: 1, height: 24, background: "#0e1f2e", margin: "0 10px" }} />
        <div>
          <div style={styles.infoLabel}>Context</div>
          <div style={styles.infoValue}>{clusterId}</div>
        </div>
      </div>

      {/* Node Health */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Node Health</div>
        <div style={styles.cardGrid}>
          <StatCard
            icon={<Hexagon size={14} color="#39ff8a" />}
            value={nh.ready}
            label="Ready"
            color="#39ff8a"
          />
          <StatCard
            icon={<Hexagon size={14} color="#ff4d4d" />}
            value={nh.not_ready}
            label="Not Ready"
            color={nh.not_ready > 0 ? "#ff4d4d" : "#2d4a6a"}
          />
          <StatCard
            icon={<Hexagon size={14} color="#f5c518" />}
            value={nh.unknown}
            label="Unknown"
            color={nh.unknown > 0 ? "#f5c518" : "#2d4a6a"}
          />
          <StatCard
            icon={<Hexagon size={14} color="#bdd" />}
            value={`${nh.ready}/${nh.total}`}
            label="Total Health"
            color={healthColor(nh.ready, nh.total)}
          />
          <StatCard
            icon={<Cpu size={14} color="#7dd3fc" />}
            value={nh.total_cpu || "—"}
            label="Total CPU"
            color={nh.total_cpu ? "#7dd3fc" : "#2d4a6a"}
          />
          <StatCard
            icon={<Database size={14} color="#f9a8d4" />}
            value={nh.total_memory || "—"}
            label="Total Memory"
            color={nh.total_memory ? "#f9a8d4" : "#2d4a6a"}
          />
        </div>
      </div>

      {/* Resource Counts */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Resource Counts</div>
        <div style={styles.resGrid}>
          {resources.map((r) => (
            <ResItem key={r.key} count={r.count} label={r.label} color={r.color} />
          ))}
        </div>
      </div>

      {/* Recent Events */}
      {events.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            Recent Events
            <span style={{ fontSize: "0.55rem", color: "#0e1f2e", marginLeft: 6 }}>
              ({events.length})
            </span>
          </div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Reason</th>
                <th style={styles.th}>Source</th>
                <th style={styles.th}>Message</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Count</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Age</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev, i) => (
                <EventRow key={`${ev.namespace}/${ev.name}/${i}`} ev={ev} isWarn={ev.type === "Warning"} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {events.length === 0 && (
        <div style={{ color: "#2d4a6a", ...mono, fontSize: "0.65rem", padding: "12px 0" }}>
          No recent events to display.
        </div>
      )}
    </div>
  );
}
