/// Ingress rules: extract routing rules from all Ingress resources.
///
/// Each Ingress can define multiple rules, each with multiple HTTP paths.
/// We flatten these into a Vec<IngressRuleInfo> for frontend display.

use k8s_openapi::api::networking::v1::Ingress;
use kube::api::ListParams;
use kube::Api;
use serde::Serialize;

use crate::kube::client::make_client;

#[derive(Debug, Clone, Serialize)]
pub(crate) struct IngressRuleInfo {
    pub host: String,
    pub path: String,
    pub path_type: String,
    pub service_name: String,
    pub service_port: String,
    pub tls_hosts: String,
}

/// Flatten a single Ingress object into zero or more rule entries.
fn ingress_to_rules(ing: Ingress) -> Vec<IngressRuleInfo> {
    let spec = match ing.spec {
        Some(ref s) => s,
        None => return vec![],
    };

    // Collect all TLS hosts defined on this ingress.
    let tls_hosts: Vec<String> = spec
        .tls
        .as_ref()
        .iter()
        .flat_map(|tls_list| {
            tls_list
                .iter()
                .filter_map(|t| t.hosts.as_ref())
                .flatten()
                .cloned()
        })
        .collect();
    let tls_hosts_str = if tls_hosts.is_empty() {
        String::new()
    } else {
        tls_hosts.join(", ")
    };

    let rules = match spec.rules {
        Some(ref r) => r,
        None => return vec![],
    };

    let mut result = Vec::new();
    for rule in rules {
        let host = rule.host.clone().unwrap_or_default();
        let http = match rule.http {
            Some(ref h) => h,
            None => continue,
        };

        for path_item in &http.paths {
            let path = path_item.path.clone().unwrap_or_default();
            let path_type = path_item.path_type.clone();

            let (service_name, service_port) = match &path_item.backend.service {
                Some(svc) => {
                    let port = match &svc.port {
                        Some(p) => match &p.name {
                            Some(name) => name.clone(),
                            None => p.number.map(|n| n.to_string()).unwrap_or_default(),
                        },
                        None => String::new(),
                    };
                    (svc.name.clone(), port)
                }
                None => (String::new(), String::new()),
            };

            result.push(IngressRuleInfo {
                host: host.clone(),
                path,
                path_type,
                service_name,
                service_port,
                tls_hosts: tls_hosts_str.clone(),
            });
        }
    }

    result
}

/// List all Ingress rules across all namespaces.
pub(crate) async fn list_ingress_rules(
    context: Option<String>,
) -> Result<Vec<IngressRuleInfo>, String> {
    let client = make_client(context).await?;
    let ingresses = Api::<Ingress>::all(client)
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list ingress rules: {e}"))?;

    Ok(ingresses
        .items
        .into_iter()
        .flat_map(ingress_to_rules)
        .collect())
}
