use crate::kube::PvUsageInfo;

#[tauri::command]
pub(crate) async fn list_pv_usage(context: Option<String>) -> Result<Vec<PvUsageInfo>, String> {
    crate::kube::list_pv_usage(context).await
}
