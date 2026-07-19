import { invoke } from "@tauri-apps/api/core";

export function listIngressRules(context) {
  return invoke("list_ingress_rules", { context: context ?? null });
}
