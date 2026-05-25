import { invoke } from "@tauri-apps/api/core";

export async function listClusters() {
  return invoke("list_clusters");
}

export async function clusterHealth(clusterId) {
  return invoke("cluster_health", { context: clusterId ?? null });
}

export async function k8sInvoke(cmd, args = {}, clusterId = null) {
  const payload = { context: clusterId ?? null, ...args };
  return invoke(cmd, payload);
}
