import { Hexagon, Box, Layers, Database, Radio, ArrowRightLeft, FileText, Lock, HardDrive, Clock, Crosshair, Activity, Package } from "lucide-react";

// ── Common resources (dedicated sidebar items with icons + shortcuts) ──────

export const COMMON_RESOURCES = [
  { key: "nodes", label: "Nodes", icon: <Hexagon size={12} />, shortcut: "N", cmd: "list_nodes" },
  { key: "pods", label: "Pods", icon: <Box size={12} />, shortcut: "P", cmd: "list_pods" },
  { key: "deployments", label: "Deployments", icon: <Layers size={12} />, shortcut: "D", cmd: "list_deployments" },
  { key: "statefulsets", label: "StatefulSets", icon: <Database size={12} />, shortcut: "S", cmd: "list_statefulsets" },
  { key: "services", label: "Services", icon: <Radio size={12} />, shortcut: "V", cmd: "list_services" },
  { key: "ingresses", label: "Ingresses", icon: <ArrowRightLeft size={12} />, shortcut: "I", cmd: "list_ingresses" },
  { key: "configmaps", label: "ConfigMaps", icon: <FileText size={12} />, shortcut: "C", cmd: "list_configmaps" },
  { key: "secrets", label: "Secrets", icon: <Lock size={12} />, shortcut: "X", cmd: "list_secrets" },
  { key: "pvcs", label: "Volumes", icon: <HardDrive size={12} />, shortcut: "L", cmd: "list_persistentvolumeclaims" },
  { key: "daemonsets", label: "DaemonSets", icon: <Layers size={12} />, shortcut: "M", cmd: "list_daemonsets" },
  { key: "cronjobs", label: "CronJobs", icon: <Clock size={12} />, shortcut: "J", cmd: "list_cronjobs" },
  { key: "jobs", label: "Jobs", icon: <Crosshair size={12} />, shortcut: "B", cmd: "list_jobs" },
  { key: "hpas", label: "HPAs", icon: <Activity size={12} />, shortcut: "H", cmd: "list_hpas" },
  { key: "helm", label: "Helm Releases", icon: <Package size={12} />, shortcut: "E", cmd: "list_helm_releases" },
];

// Get icon for any resource (common or other)
export function getResourceIcon(plural) {
  const found = COMMON_RESOURCES.find((r) => r.key === plural);
  if (found) return found.icon;
  return <Box size={12} />;
}

// Heuristic: split k8s plural name into readable label
// e.g. "horizontalpodautoscalers" -> "HorizontalPodAutoscaler"
// Falls back to kind name from API discovery if available.
function pluralToLabel(plural, kind) {
  if (kind && kind !== plural) return kind;
  // Common irregular plurals
  const map = {
    endpoints: "Endpoints",
    events: "Events",
    namespaces: "Namespaces",
    persistentvolumeclaims: "PersistentVolumeClaim",
    persistentvolumes: "PersistentVolume",
    pods: "Pod",
    nodes: "Node",
  };
  if (map[plural]) return map[plural];
  // Generic: title-case, strip trailing 's'
  const singular = plural.endsWith("ies")
    ? plural.slice(0, -3) + "y"
    : plural.endsWith("es")
      ? plural.slice(0, -2)
      : plural.endsWith("s") && !plural.endsWith("ss")
        ? plural.slice(0, -1)
        : plural;
  return singular.charAt(0).toUpperCase() + singular.slice(1);
}

// ── Column definitions for known resource types ───────────────────────────

export const COLUMNS = {
  nodes: ["name", "status", "roles", "version", "cpu", "mem", "pods", "age"],
  pods: ["name", "namespace", "status", "ready", "restarts", "node", "ip", "age"],
  deployments: ["name", "namespace", "ready", "up_to_date", "available", "image", "age"],
  statefulsets: ["name", "namespace", "ready", "image", "age"],
  services: ["name", "namespace", "type", "cluster_ip", "external_ip", "ports", "age"],
  ingresses: ["name", "namespace", "class", "hosts", "address", "ports", "age"],
  configmaps: ["name", "namespace", "data", "age"],
  secrets: ["name", "namespace", "type", "data", "age"],
  pvcs: ["name", "namespace", "status", "capacity", "access_modes", "storageclass", "age"],
  daemonsets: ["name", "namespace", "desired", "current", "ready", "available", "node_selector", "age"],
  cronjobs: ["name", "namespace", "schedule", "suspend", "last_schedule", "age"],
  jobs: ["name", "namespace", "completions", "parallelism", "duration", "conditions", "age"],
  hpas: ["name", "namespace", "min", "max", "replicas", "target", "age"],
  helm: ["name", "namespace", "chart", "version", "status", "revision", "updated"],
};

// Fallback columns for unknown resource types
export const DEFAULT_COLUMNS = ["name", "namespace", "age"];

// ── Detail tabs per resource type ─────────────────────────────────────────

export const DETAIL_TABS_MAP = {
  pods: ["info", "metrics", "logs", "shell", "yaml", "events", "describe", "graph"],
  deployments: ["info", "yaml", "events", "describe", "graph"],
  statefulsets: ["info", "yaml", "events", "describe", "graph"],
  services: ["info", "yaml", "describe", "graph"],
  nodes: ["info", "yaml", "events", "describe", "graph"],
  configmaps: ["info", "yaml", "describe", "graph"],
  secrets: ["info", "yaml", "describe", "graph"],
  ingresses: ["info", "yaml", "describe", "graph"],
  pvcs: ["info", "yaml", "describe", "graph"],
  daemonsets: ["info", "yaml", "events", "describe", "graph"],
  cronjobs: ["info", "yaml", "events", "describe", "graph"],
  jobs: ["info", "yaml", "events", "describe", "graph"],
  hpas: ["info", "yaml", "describe", "graph"],
  helm: [],
  default: ["info", "yaml", "graph"],
};

// ── Default nav state ─────────────────────────────────────────────────────

export const defaultNavState = () => ({
  tabs: [],
  activeTab: null,
  activeResource: "dashboard",
});

// ── Column helpers ────────────────────────────────────────────────────────

export function getColumns(type) {
  return COLUMNS[type] || DEFAULT_COLUMNS;
}
