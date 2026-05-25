export const RESOURCE_TYPES = [
  { key: "nodes", label: "Nodes", icon: "⬡", cmd: "list_nodes", shortcut: "N" },
  { key: "pods", label: "Pods", icon: "◎", cmd: "list_pods", shortcut: "P" },
  { key: "deployments", label: "Deployments", icon: "⬢", cmd: "list_deployments", shortcut: "D" },
  { key: "statefulsets", label: "StatefulSets", icon: "◈", cmd: "list_statefulsets", shortcut: "S" },
  { key: "services", label: "Services", icon: "◉", cmd: "list_services", shortcut: "V" },
  { key: "ingresses", label: "Ingresses", icon: "⟹", cmd: "list_ingresses", shortcut: "I" },
  { key: "configmaps", label: "ConfigMaps", icon: "≡", cmd: "list_configmaps", shortcut: "C" },
  { key: "secrets", label: "Secrets", icon: "⬟", cmd: "list_secrets", shortcut: "X" },
  { key: "pvcs", label: "Volumes", icon: "⬛", cmd: "list_persistentvolumeclaims", shortcut: "L" },
];

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
};

export const DETAIL_TABS_MAP = {
  pods: ["info", "logs", "yaml", "events", "graph"],
  deployments: ["info", "yaml", "events", "graph"],
  statefulsets: ["info", "yaml", "events", "graph"],
  services: ["info", "yaml", "graph"],
  nodes: ["info", "yaml", "events", "graph"],
  default: ["info", "yaml", "graph"],
};

export const defaultNavState = () => ({
  tabs: [],
  activeTab: null,
  activeResource: "nodes",
});
