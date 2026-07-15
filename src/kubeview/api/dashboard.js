import { k8sInvoke } from "./resources";

export async function getClusterDashboard(context) {
  return k8sInvoke("get_cluster_dashboard", { context });
}
