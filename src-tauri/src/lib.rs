mod clusters;
mod k8s;

#[tauri::command]
fn list_clusters() -> Result<Vec<clusters::ClusterInfo>, String> {
    clusters::list_clusters()
}

#[tauri::command]
async fn cluster_health(context: Option<String>) -> Result<bool, String> {
    k8s::cluster_health(context).await
}

#[tauri::command]
async fn list_nodes(context: Option<String>) -> Result<Vec<k8s::NodeInfo>, String> {
    k8s::list_nodes(context).await
}

#[tauri::command]
async fn list_pods(context: Option<String>) -> Result<Vec<k8s::PodInfo>, String> {
    k8s::list_pods(context).await
}

#[tauri::command]
async fn list_deployments(context: Option<String>) -> Result<Vec<k8s::DeploymentInfo>, String> {
    k8s::list_deployments(context).await
}

#[tauri::command]
async fn list_statefulsets(context: Option<String>) -> Result<Vec<k8s::StatefulSetInfo>, String> {
    k8s::list_statefulsets(context).await
}

#[tauri::command]
async fn list_services(context: Option<String>) -> Result<Vec<k8s::ServiceInfo>, String> {
    k8s::list_services(context).await
}

#[tauri::command]
async fn list_ingresses(context: Option<String>) -> Result<Vec<k8s::IngressInfo>, String> {
    k8s::list_ingresses(context).await
}

#[tauri::command]
async fn list_configmaps(context: Option<String>) -> Result<Vec<k8s::ConfigMapInfo>, String> {
    k8s::list_configmaps(context).await
}

#[tauri::command]
async fn list_secrets(context: Option<String>) -> Result<Vec<k8s::SecretInfo>, String> {
    k8s::list_secrets(context).await
}

#[tauri::command]
async fn list_persistentvolumeclaims(
    context: Option<String>,
) -> Result<Vec<k8s::PvcInfo>, String> {
    k8s::list_persistentvolumeclaims(context).await
}

#[tauri::command]
async fn get_pod_logs(
    context: Option<String>,
    name: String,
    namespace: String,
) -> Result<k8s::PodLogsResponse, String> {
    k8s::get_pod_logs(context, name, namespace).await
}

#[tauri::command]
async fn get_yaml(
    context: Option<String>,
    kind: String,
    name: String,
    namespace: Option<String>,
    omit_managed_fields: bool,
) -> Result<k8s::YamlResponse, String> {
    k8s::get_yaml(context, kind, name, namespace, omit_managed_fields).await
}

#[tauri::command]
async fn get_events(
    context: Option<String>,
    name: String,
    namespace: Option<String>,
) -> Result<k8s::EventsResponse, String> {
    k8s::get_events(context, name, namespace).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_clusters,
            cluster_health,
            list_nodes,
            list_pods,
            list_deployments,
            list_statefulsets,
            list_services,
            list_ingresses,
            list_configmaps,
            list_secrets,
            list_persistentvolumeclaims,
            get_pod_logs,
            get_yaml,
            get_events,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
