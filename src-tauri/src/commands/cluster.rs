use crate::clusters;
use crate::kube;

#[tauri::command]
pub(crate) async fn list_clusters() -> Result<Vec<clusters::ClusterInfo>, String> {
    clusters::list_clusters()
}

#[tauri::command]
pub(crate) async fn cluster_health(context: Option<String>) -> Result<bool, String> {
    kube::cluster_health(context).await
}
