import { k8sInvoke } from "./resources";

export async function listHelmReleases(context) {
  return k8sInvoke("list_helm_releases", { context });
}
