use crate::kube;

#[tauri::command]
pub(crate) async fn get_events(
    context: Option<String>,
    name: String,
    namespace: Option<String>,
) -> Result<kube::EventsResponse, String> {
    kube::get_events(context, name, namespace).await
}
