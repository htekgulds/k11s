use crate::kube;
use crate::state::PortForwardManager;
use tokio_util::sync::CancellationToken;

#[tauri::command]
pub(crate) async fn start_port_forward(
    _app: tauri::AppHandle,
    state: tauri::State<'_, PortForwardManager>,
    context: Option<String>,
    namespace: String,
    pod_name: String,
    remote_port: u16,
) -> Result<kube::PortForwardInfo, String> {
    let cancel = CancellationToken::new();
    let info = kube::start_port_forward(context, namespace.clone(), pod_name.clone(), remote_port, cancel.clone()).await?;

    state
        .forwards
        .lock()
        .map_err(|e| e.to_string())?
        .insert(info.id.clone(), (info.clone(), cancel));

    Ok(info)
}

#[tauri::command]
pub(crate) async fn stop_port_forward(
    state: tauri::State<'_, PortForwardManager>,
    forward_id: String,
) -> Result<(), String> {
    let (_, cancel) = state
        .forwards
        .lock()
        .map_err(|e| e.to_string())?
        .remove(&forward_id)
        .ok_or_else(|| "Port forward not found".to_string())?;
    cancel.cancel();
    Ok(())
}

#[tauri::command]
pub(crate) async fn list_port_forwards(
    state: tauri::State<'_, PortForwardManager>,
) -> Result<Vec<kube::PortForwardInfo>, String> {
    let forwards = state.forwards.lock().map_err(|e| e.to_string())?;
    Ok(forwards.values().map(|(info, _)| info.clone()).collect())
}
