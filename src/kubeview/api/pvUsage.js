import { invoke } from "@tauri-apps/api/core";

export function listPvUsage(context) {
  return invoke("list_pv_usage", { context: context ?? null });
}
