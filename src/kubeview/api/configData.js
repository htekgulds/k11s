import { invoke } from "@tauri-apps/api/core";

export async function listConfigData(clusterId, kind, name, namespace) {
  return invoke("list_config_data", {
    context: clusterId ?? null,
    kind,
    name,
    namespace,
  });
}
