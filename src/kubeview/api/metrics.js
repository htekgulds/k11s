import { invoke } from "@tauri-apps/api/core";

export async function getPodMetrics(namespace, pod) {
  return invoke("get_pod_metrics", { namespace, pod });
}
