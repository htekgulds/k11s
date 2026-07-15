use crate::kube;

#[tauri::command]
pub(crate) async fn get_cluster_dashboard(
    context: Option<String>,
) -> Result<kube::dashboard::DashboardData, String> {
    kube::dashboard::get_cluster_dashboard(context).await
}
