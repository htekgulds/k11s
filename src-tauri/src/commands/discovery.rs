use crate::kube;

#[tauri::command]
pub(crate) async fn discover_resources(
    context: Option<String>,
) -> Result<Vec<kube::DiscoveredResource>, String> {
    kube::discover_resources(context).await
}

#[tauri::command]
pub(crate) async fn list_resource(
    context: Option<String>,
    group: String,
    version: String,
    kind: String,
    plural: String,
    namespaced: bool,
) -> Result<Vec<serde_json::Value>, String> {
    kube::list_resource(context, group, version, kind, plural, namespaced).await
}
