use crate::kube;

#[tauri::command]
pub(crate) async fn get_pod_metrics(
    context: Option<String>,
    namespace: String,
    pod: String,
) -> Result<Vec<kube::ContainerMetrics>, String> {
    kube::get_pod_metrics(context, namespace, pod).await
}
