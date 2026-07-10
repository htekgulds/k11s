import { invoke } from "@tauri-apps/api/core";

export async function listClusters() {
  return invoke("list_clusters");
}

export async function clusterHealth(clusterId) {
  return invoke("cluster_health", { context: clusterId ?? null });
}

export async function getDefaultContext() {
  return invoke("get_default_context");
}

export async function addKubeconfig() {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const files = await open({
    multiple: true,
    filters: [{ name: "Kubeconfig", extensions: ["yaml", "yml", "json", "conf", "kubeconfig"] }],
  });
  if (files) {
    const paths = Array.isArray(files) ? files : [files];
    return invoke("add_kubeconfig_files", { filePaths: paths });
  }
  const folder = await open({ directory: true, multiple: false });
  if (!folder) return null;
  return invoke("add_kubeconfig_folder", { folderPath: folder });
}

export async function addKubeconfigByPath(path) {
  return invoke("add_kubeconfig_files", { filePaths: [path] });
}

export async function getKubeconfigPaths() {
  return invoke("get_kubeconfig_paths");
}

export async function removeKubeconfigPath(path) {
  return invoke("remove_kubeconfig_path", { path });
}
