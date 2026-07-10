import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";

export async function addKubeconfig() {
  const files = await open({
    multiple: true,
    filters: [{
      name: "Kubeconfig",
      extensions: ["yaml", "yml", "json", "conf", "kubeconfig"],
    }],
  });
  if (files) {
    const paths = Array.isArray(files) ? files : [files];
    return invoke("add_kubeconfig_files", { filePaths: paths });
  }
  const folder = await open({ directory: true, multiple: false });
  if (!folder) return null;
  return invoke("add_kubeconfig_folder", { folderPath: folder });
}

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

export async function rolloutAction(clusterId, kind, name, namespace, action) {
  return invoke("rollout_action", { context: clusterId ?? null, kind, name, namespace, action });
}

/**
 * Listen for resource-update events.
 * Returns an unlisten function to be called on cleanup.
 * @param {(payload: WatchEventPayload) => void} callback
 */
export async function onResourceUpdate(callback) {
  return listen("resource-update", (event) => {
    callback(event.payload);
  });
}

// ── Shell Exec ──────────────────────────────────────────────────────────────

export function execPodShell(context, namespace, pod, container) {
  return invoke("exec_pod_shell", {
    context: context ?? null,
    namespace,
    pod,
    container: container ?? null,
  });
}

export function execPodStdin(sessionId, data) {
  return invoke("exec_pod_stdin", { sessionId, data });
}

export function execPodStop(sessionId) {
  return invoke("exec_pod_stop", { sessionId });
}

/**
 * Listen for shell-output events.
 * Returns an unlisten function.
 * @param {(payload: {session_id: string, type: string, data: string|null}) => void} callback
 */
export async function onShellOutput(callback) {
  return listen("shell-output", (event) => {
    callback(event.payload);
  });
}

export async function getKubeconfigPaths() {
  return invoke("get_kubeconfig_paths");
}

export async function removeKubeconfigPath(path) {
  return invoke("remove_kubeconfig_path", { path });
}

export async function getDefaultContext() {
  return invoke("get_default_context");
}

export async function addKubeconfigByPath(path) {
  return invoke("add_kubeconfig_files", { filePaths: [path] });
}

export function applyYaml(context, yamlContent) {
  return invoke("apply_yaml", { context: context ?? null, yamlContent });
}

export async function deleteResource(clusterId, kind, name, namespace, gracePeriodSeconds = null, force = false) {
  return invoke("delete_resource", {
    context: clusterId ?? null,
    kind,
    name,
    namespace,
    grace_period_seconds: gracePeriodSeconds,
    force,
  });
}
