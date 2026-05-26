export const mono = { fontFamily: "'JetBrains Mono', monospace" };

export const STATUS_COLOR = {
  Running: "#39ff8a",
  Ready: "#39ff8a",
  Bound: "#39ff8a",
  Pending: "#f5c518",
  NotReady: "#ff4d4d",
  CrashLoopBackOff: "#ff4d4d",
  Error: "#ff4d4d",
  Terminating: "#f5c518",
  OOMKilled: "#ff4d4d",
};

export const NS_COLORS = [
  "#7dd3fc",
  "#f9a8d4",
  "#86efac",
  "#fde68a",
  "#c4b5fd",
  "#fb923c",
  "#67e8f9",
];

export const kindColorMap = {
  Deployment: "#7dd3fc",
  Pod: "#39ff8a",
  Service: "#f9a8d4",
  Ingress: "#fde68a",
  ConfigMap: "#c4b5fd",
  Secret: "#fb923c",
  Node: "#67e8f9",
  StatefulSet: "#a5f3fc",
  PVC: "#fdba74",
};

export const ENV_STYLE = {
  prod: { bg: "#1a0808", border: "#ff4d4d44", text: "#ff4d4d" },
  staging: { bg: "#1a1500", border: "#f5c51844", text: "#f5c518" },
  dev: { bg: "#081a0a", border: "#39ff8a44", text: "#39ff8a" },
};

import { Cloud, Hexagon, Box, Triangle, Circle } from "lucide-react";

export const PROVIDER_ICON = {
  eks: <Cloud size={12} />,
  gke: <Hexagon size={12} />,
  kind: <Box size={12} />,
  aks: <Triangle size={12} />,
  k8s: <Circle size={12} />,
};
