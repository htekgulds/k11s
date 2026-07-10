use crate::kube;
use crate::state::LogStreamManager;
use tokio_util::sync::CancellationToken;

#[tauri::command]
pub(crate) async fn get_pod_logs(
    _app: tauri::AppHandle,
    context: Option<String>,
    name: String,
    namespace: String,
    previous: bool,
    container: Option<String>,
) -> Result<kube::PodLogsResponse, String> {
    kube::get_pod_logs(context, name, namespace, previous, container).await
}

#[tauri::command]
pub(crate) async fn start_log_stream(
    app: tauri::AppHandle,
    state: tauri::State<'_, LogStreamManager>,
    context: Option<String>,
    namespace: String,
    name: String,
    previous: bool,
    container: Option<String>,
) -> Result<(), String> {
    let cancel = CancellationToken::new();
    let key = format!("{namespace}/{name}");
    state.streams.lock().map_err(|e| e.to_string())?.insert(key.clone(), cancel.clone());

    tokio::spawn(async move {
        kube::stream_pod_logs(app, context, name, namespace, previous, container, cancel).await;
    });

    Ok(())
}

#[tauri::command]
pub(crate) async fn stop_log_stream(
    state: tauri::State<'_, LogStreamManager>,
    namespace: String,
    name: String,
) -> Result<(), String> {
    let key = format!("{namespace}/{name}");
    let cancel = state
        .streams
        .lock()
        .map_err(|e| e.to_string())?
        .remove(&key);
    if let Some(token) = cancel {
        token.cancel();
    }
    Ok(())
}
