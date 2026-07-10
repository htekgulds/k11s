use crate::kube;

#[tauri::command]
pub(crate) async fn list_pods(context: Option<String>) -> Result<Vec<kube::PodInfo>, String> {
    kube::list_pods(context).await
}
