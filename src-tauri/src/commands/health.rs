use crate::kube;

#[tauri::command]
// ── Health check (reserved for future use) ──
#[allow(dead_code)]
pub(crate) async fn health_check(
    context: Option<String>,
) -> Result<bool, String> {
    kube::cluster_health(context).await
}
