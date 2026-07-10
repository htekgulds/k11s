use serde::Serialize;

use crate::kube::client::make_client;

#[derive(Debug, Clone, Serialize)]
pub(crate) struct PodLogsResponse {
    pub logs: String,
}

pub(crate) async fn get_pod_logs(
    context: Option<String>,
    name: String,
    namespace: String,
    previous: bool,
    container: Option<String>,
) -> Result<PodLogsResponse, String> {
    let client = make_client(context).await?;
    let pods: kube::Api<k8s_openapi::api::core::v1::Pod> = kube::Api::namespaced(client, &namespace);
    let logs = pods
        .logs(&name, &kube::api::LogParams { previous, container, ..Default::default() })
        .await
        .map_err(|e| format!("Failed to get logs: {e}"))?;
    Ok(PodLogsResponse { logs })
}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct LogStreamEventPayload {
    pub name: String,
    pub namespace: String,
    pub line: String,
    pub error: Option<String>,
}

pub(crate) async fn stream_pod_logs(
    app: tauri::AppHandle,
    context: Option<String>,
    name: String,
    namespace: String,
    previous: bool,
    container: Option<String>,
    cancel: tokio_util::sync::CancellationToken,
) {
    use futures::AsyncBufReadExt;
    use tauri::Emitter;

    let client = match make_client(context).await {
        Ok(c) => c,
        Err(e) => {
            let _ = app.emit(
                "log-line",
                LogStreamEventPayload {
                    name,
                    namespace,
                    line: String::new(),
                    error: Some(e),
                },
            );
            return;
        }
    };

    let pods: kube::Api<k8s_openapi::api::core::v1::Pod> = kube::Api::namespaced(client, &namespace);
    let lp = kube::api::LogParams {
        follow: true,
        previous,
        container: Some(container.clone().unwrap_or_default()),
        ..Default::default()
    };

    let mut stream = match pods.log_stream(&name, &lp).await {
        Ok(s) => s,
        Err(e) => {
            let _ = app.emit(
                "log-line",
                LogStreamEventPayload {
                    name,
                    namespace,
                    line: String::new(),
                    error: Some(format!("Failed to start log stream: {e}")),
                },
            );
            return;
        }
    };

    let mut line = String::new();
    loop {
        tokio::select! {
            _ = cancel.cancelled() => break,
            result = stream.read_line(&mut line) => {
                match result {
                    Ok(0) => break,
                    Ok(_) => {
                        let trimmed = if line.ends_with('\n') {
                            line[..line.len()-1].to_string()
                        } else {
                            line.clone()
                        };
                        let _ = app.emit("log-line", LogStreamEventPayload {
                            name: name.clone(),
                            namespace: namespace.clone(),
                            line: trimmed,
                            error: None,
                        });
                        line.clear();
                    }
                    Err(e) => {
                        let _ = app.emit("log-line", LogStreamEventPayload {
                            name,
                            namespace,
                            line: String::new(),
                            error: Some(format!("Stream error: {e}")),
                        });
                        break;
                    }
                }
            }
        }
    }
}
