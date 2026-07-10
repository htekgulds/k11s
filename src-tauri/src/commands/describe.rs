use crate::kube;

#[tauri::command]
pub(crate) async fn describe_resource(
    context: Option<String>,
    kind: String,
    name: String,
    namespace: Option<String>,
) -> Result<kube::DescribeResponse, String> {
    kube::describe_resource(context, kind, name, namespace).await
}
