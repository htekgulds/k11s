mod clusters;
mod k8s;
mod watchers;

use std::collections::HashMap;
use std::sync::Mutex;
use tokio_util::sync::CancellationToken;

struct LogStreamManager {
    streams: Mutex<HashMap<String, CancellationToken>>,
}

impl LogStreamManager {
    fn new() -> Self {
        Self {
            streams: Mutex::new(HashMap::new()),
        }
    }
}



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
    previous: bool,
    container: Option<String>,
) -> Result<k8s::PodLogsResponse, String> {
    k8s::get_pod_logs(context, name, namespace, previous, container).await
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
async fn apply_yaml(
    context: Option<String>,
    yaml_content: String,
) -> Result<String, String> {
    k8s::apply_yaml(context, yaml_content).await
}

#[tauri::command]
async fn delete_resource(
    context: Option<String>,
    kind: String,
    name: String,
    namespace: String,
    grace_period_seconds: Option<i64>,
    force: bool,
) -> Result<k8s::DeleteResponse, String> {
    k8s::delete_resource(context, kind, name, namespace, grace_period_seconds, force).await
}

#[tauri::command]
async fn get_events(
    context: Option<String>,
    name: String,
    namespace: Option<String>,
) -> Result<k8s::EventsResponse, String> {
    k8s::get_events(context, name, namespace).await
}

#[tauri::command]
async fn describe_resource(
    context: Option<String>,
    kind: String,
    name: String,
    namespace: Option<String>,
) -> Result<k8s::DescribeResponse, String> {
    k8s::describe_resource(context, kind, name, namespace).await
}

#[tauri::command]
async fn start_watchers(
    app_handle: tauri::AppHandle,
    context: String,
    state: tauri::State<'_, watchers::WatcherManager>,
) -> Result<(), String> {
    k8s::cluster_health(Some(context.clone())).await?;
    let resource_types = [
        "pods", "nodes", "deployments", "statefulsets", "services",
        "ingresses", "configmaps", "secrets", "pvcs",
    ];
    for rt in resource_types {
        state.start(app_handle.clone(), context.clone(), rt.to_string()).await?;
    }
    Ok(())
}

#[tauri::command]
fn add_kubeconfig_files(file_paths: Vec<String>) -> Result<Vec<clusters::ClusterInfo>, String> {
    clusters::add_kubeconfig_paths(&file_paths)
}

#[tauri::command]
fn add_kubeconfig_folder(folder_path: String) -> Result<Vec<clusters::ClusterInfo>, String> {
    clusters::add_kubeconfig_folder(&folder_path)
}

#[tauri::command]
fn get_kubeconfig_paths() -> Result<Vec<String>, String> {
    clusters::list_kubeconfig_paths()
}

#[tauri::command]
fn remove_kubeconfig_path(path: String) -> Result<Vec<clusters::ClusterInfo>, String> {
    clusters::remove_kubeconfig_path(&path)
}

#[tauri::command]
fn get_default_context() -> Option<String> {
    clusters::get_default_context()
}

#[tauri::command]
async fn stop_watchers(
    context: String,
    state: tauri::State<'_, watchers::WatcherManager>,
) -> Result<(), String> {
    state.stop_all(&context).await;
    Ok(())
}

#[tauri::command]
async fn start_log_stream(
    app_handle: tauri::AppHandle,
    context: Option<String>,
    name: String,
    namespace: String,
    previous: bool,
    container: Option<String>,
    state: tauri::State<'_, LogStreamManager>,
) -> Result<(), String> {
    let stream_id = format!("{:?}/{}/{}", context, namespace, name);
    let cancel = CancellationToken::new();
    state
        .streams
        .lock()
        .unwrap()
        .insert(stream_id.clone(), cancel.clone());

    tauri::async_runtime::spawn(k8s::stream_pod_logs(
        app_handle, context, name, namespace, previous, container, cancel,
    ));

    Ok(())
}

#[tauri::command]
async fn stop_log_stream(
    context: Option<String>,
    name: String,
    namespace: String,
    previous: bool,
    container: Option<String>,
    state: tauri::State<'_, LogStreamManager>,
) -> Result<(), String> {
    let stream_id = format!("{:?}/{}/{}", context, namespace, name);
    if let Some(cancel) = state.streams.lock().unwrap().remove(&stream_id) {
        cancel.cancel();
    }
    Ok(())
}

#[tauri::command]
async fn rollout_action(
    context: Option<String>,
    kind: String,
    name: String,
    namespace: String,
    action: String,
) -> Result<k8s::RolloutResponse, String> {
    k8s::rollout_action(context, kind, name, namespace, action).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Apply CLI args before Tauri initializes (e.g. --kubeconfig <path>)
    clusters::apply_cli_args();
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(watchers::WatcherManager::new())
        .manage(LogStreamManager::new())
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
            apply_yaml,
            delete_resource,
            get_events,
            describe_resource,
            start_watchers,
            stop_watchers,
            add_kubeconfig_files,
            add_kubeconfig_folder,
            start_log_stream,
            stop_log_stream,
            get_kubeconfig_paths,
            remove_kubeconfig_path,
            get_default_context,
            rollout_action,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
