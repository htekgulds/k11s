import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

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

export async function startWatchers(clusterId) {
  const ctx = clusterId || "";
  return invoke("start_watchers", { context: ctx });
}

export async function stopWatchers(clusterId) {
  const ctx = clusterId || "";
  return invoke("stop_watchers", { context: ctx });
}

/**
 * Listen for resource-update events.
 * Returns an unlisten function to be called on cleanup.
 * @param {(payload: WatchEventPayload) => void} callback
 */
export function onResourceUpdate(callback) {
  return listen("resource-update", (event) => {
    callback(event.payload);
  });
}
