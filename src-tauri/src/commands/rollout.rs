use crate::kube;

#[tauri::command]
pub(crate) async fn rollout_action(
    context: Option<String>,
    kind: String,
    name: String,
    namespace: String,
    action: String,
) -> Result<kube::RolloutResponse, String> {
    kube::rollout_action(context, kind, name, namespace, action).await
}
