use crate::kube;

#[tauri::command]
pub(crate) async fn delete_resource(
    context: Option<String>,
    kind: String,
    name: String,
    namespace: String,
    grace_period_seconds: Option<i64>,
    force: bool,
) -> Result<kube::DeleteResponse, String> {
    kube::delete_resource(context, kind, name, namespace, grace_period_seconds, force).await
}
