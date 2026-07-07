import { Hexagon, Box, Layers, Database, Radio, ArrowRightLeft, FileText, Lock, HardDrive } from "lucide-react";

export const RESOURCE_TYPES = [
  { key: "nodes", label: "Nodes", icon: <Hexagon size={12} />, cmd: "list_nodes", shortcut: "N" },
  { key: "pods", label: "Pods", icon: <Box size={12} />, cmd: "list_pods", shortcut: "P" },
  { key: "deployments", label: "Deployments", icon: <Layers size={12} />, cmd: "list_deployments", shortcut: "D" },
  { key: "statefulsets", label: "StatefulSets", icon: <Database size={12} />, cmd: "list_statefulsets", shortcut: "S" },
  { key: "services", label: "Services", icon: <Radio size={12} />, cmd: "list_services", shortcut: "V" },
  { key: "ingresses", label: "Ingresses", icon: <ArrowRightLeft size={12} />, cmd: "list_ingresses", shortcut: "I" },
  { key: "configmaps", label: "ConfigMaps", icon: <FileText size={12} />, cmd: "list_configmaps", shortcut: "C" },
  { key: "secrets", label: "Secrets", icon: <Lock size={12} />, cmd: "list_secrets", shortcut: "X" },
  { key: "pvcs", label: "Volumes", icon: <HardDrive size={12} />, cmd: "list_persistentvolumeclaims", shortcut: "L" },
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
  pods: ["info", "logs", "yaml", "events", "describe", "graph"],
  deployments: ["info", "yaml", "events", "describe", "graph"],
  statefulsets: ["info", "yaml", "events", "describe", "graph"],
  services: ["info", "yaml", "describe", "graph"],
  nodes: ["info", "yaml", "events", "describe", "graph"],
  configmaps: ["info", "yaml", "describe", "graph"],
  secrets: ["info", "yaml", "describe", "graph"],
  ingresses: ["info", "yaml", "describe", "graph"],
  pvcs: ["info", "yaml", "describe", "graph"],
  default: ["info", "yaml", "graph"],
};

export const defaultNavState = () => ({
  tabs: [],
  activeTab: null,
  activeResource: "nodes",
});
