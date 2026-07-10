use crate::kube;

#[tauri::command]
pub(crate) async fn exec_pod_shell(
    app: tauri::AppHandle,
    context: Option<String>,
    namespace: String,
    pod: String,
    container: Option<String>,
) -> Result<String, String> {
    kube::exec_pod_shell(context, namespace, pod, container, app).await
}

#[tauri::command]
pub(crate) async fn exec_pod_stdin(
    session_id: String,
    data: String,
) -> Result<(), String> {
    kube::exec_pod_stdin(session_id, data).await
}

#[tauri::command]
pub(crate) async fn exec_pod_stop(
    session_id: String,
) -> Result<(), String> {
    kube::exec_pod_stop(session_id).await
}
