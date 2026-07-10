use crate::kube;

#[tauri::command]
pub(crate) async fn get_yaml(
    context: Option<String>,
    kind: String,
    name: String,
    namespace: Option<String>,
    omit_managed_fields: Option<bool>,
) -> Result<kube::YamlResponse, String> {
    kube::get_yaml(context, kind, name, namespace, omit_managed_fields.unwrap_or(false)).await
}

#[tauri::command]
pub(crate) async fn apply_yaml(
    context: Option<String>,
    yaml_content: String,
) -> Result<String, String> {
    kube::apply_yaml(context, yaml_content).await
}
