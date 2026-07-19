use crate::kube::{self, IngressRuleInfo};

#[tauri::command]
pub(crate) async fn list_ingress_rules(
    context: Option<String>,
) -> Result<Vec<IngressRuleInfo>, String> {
    kube::list_ingress_rules(context).await
}
