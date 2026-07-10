use k8s_openapi::api::core::v1::Pod;
use kube::Api;
use serde::Serialize;
use tokio_util::sync::CancellationToken;

use crate::kube::client::make_client;

#[derive(Debug, Clone, Serialize)]
pub(crate) struct PortForwardInfo {
    pub id: String,
    pub pod_name: String,
    pub namespace: String,
    pub local_port: u16,
    pub remote_port: u16,
}

/// Start a port-forward from a local TCP port to a pod port.
/// Accepts multiple connections — each one opens a fresh WebSocket tunnel.
pub(crate) async fn start_port_forward(
    context: Option<String>,
    namespace: String,
    pod_name: String,
    remote_port: u16,
    cancel: CancellationToken,
) -> Result<PortForwardInfo, String> {
    let _client = make_client(context).await?;

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| format!("Failed to bind TCP: {e}"))?;
    let local_port = listener
        .local_addr()
        .map_err(|e| format!("{e}"))?
        .port();

    let id = format!("{namespace}/{pod_name}:{remote_port}");
    let info = PortForwardInfo {
        id: id.clone(),
        pod_name: pod_name.clone(),
        namespace: namespace.clone(),
        local_port,
        remote_port,
    };

    tokio::spawn(async move {
        loop {
            tokio::select! {
                _ = cancel.cancelled() => {
                    break;
                }
                result = listener.accept() => {
                    let (mut tcp, _) = match result {
                        Ok(v) => v,
                        Err(_) => break,
                    };
                    let client = match make_client(None).await {
                        Ok(c) => c,
                        Err(_) => continue,
                    };
                    let api = Api::<Pod>::namespaced(client, &namespace);
                    let mut pf = match api.portforward(&pod_name, &[remote_port]).await {
                        Ok(p) => p,
                        Err(_) => continue,
                    };
                    let mut duplex = match pf.take_stream(remote_port) {
                        Some(s) => s,
                        None => continue,
                    };
                    tokio::spawn(async move {
                        let _ = tokio::io::copy_bidirectional(
                            &mut tcp,
                            &mut duplex,
                        ).await;
                    });
                }
            }
        }
    });

    Ok(info)
}
