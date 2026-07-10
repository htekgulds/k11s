use crate::kube::client::make_client;

pub(crate) async fn cluster_health(context: Option<String>) -> Result<bool, String> {
    let client = make_client(context).await?;
    client
        .apiserver_version()
        .await
        .map(|_| true)
        .map_err(|e| format!("API unreachable: {e}"))
}
