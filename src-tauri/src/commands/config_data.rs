use crate::kube::config_data::{list_config_data as kube_list_config_data, ConfigDataEntry};

#[tauri::command]
pub(crate) async fn list_config_data(
    context: Option<String>,
    kind: String,
    name: String,
    namespace: String,
) -> Result<Vec<ConfigDataEntry>, String> {
    kube_list_config_data(context, kind, name, namespace).await
}
