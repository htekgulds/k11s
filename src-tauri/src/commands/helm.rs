use crate::kube::{self, HelmReleaseInfo};

#[tauri::command]
pub(crate) async fn list_helm_releases(
    context: Option<String>,
) -> Result<Vec<HelmReleaseInfo>, String> {
    kube::list_helm_releases(context).await
}
