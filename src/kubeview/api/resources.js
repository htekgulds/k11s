import { invoke } from "@tauri-apps/api/core";

export async function k8sInvoke(cmd, args = {}, clusterId = null) {
  const payload = { context: clusterId ?? null, ...args };
  return invoke(cmd, payload);
}

export async function discoverResources(clusterId) {
  return invoke("discover_resources", { context: clusterId ?? null });
}

export async function listResource(clusterId, group, version, kind, plural, namespaced) {
  return invoke("list_resource", { context: clusterId ?? null, group, version, kind, plural, namespaced });
}

export async function deleteResource(clusterId, kind, name, namespace, gracePeriodSeconds = null, force = false) {
  return invoke("delete_resource", {
    context: clusterId ?? null, kind, name, namespace,
    grace_period_seconds: gracePeriodSeconds, force,
  });
}

export async function rolloutAction(clusterId, kind, name, namespace, action) {
  return invoke("rollout_action", { context: clusterId ?? null, kind, name, namespace, action });
}

export function applyYaml(context, yamlContent) {
  return invoke("apply_yaml", { context: context ?? null, yamlContent });
}
