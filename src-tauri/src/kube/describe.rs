use serde::Serialize;

use crate::kube::client::make_client;

#[derive(Debug, Clone, Serialize)]
pub(crate) struct DescribeResponse {
    pub describe: String,
}

pub(crate) fn format_describe(value: &serde_json::Value, indent: usize) -> String {
    let pad = " ".repeat(indent);
    let pad2 = " ".repeat(indent + 2);
    let mut out = String::new();

    match value {
        serde_json::Value::Object(map) => {
            for (key, val) in map {
                let label = key.replace('_', " ");
                match val {
                    serde_json::Value::Null => {}
                    serde_json::Value::String(s) => {
                        if !s.is_empty() && s != "<nil>" {
                            out.push_str(&format!("{pad}{label:<25} {s}\n"));
                        }
                    }
                    serde_json::Value::Number(n) => {
                        out.push_str(&format!("{pad}{label:<25} {n}\n"));
                    }
                    serde_json::Value::Bool(b) => {
                        out.push_str(&format!("{pad}{label:<25} {b}\n"));
                    }
                    serde_json::Value::Array(arr) => {
                        if !arr.is_empty() {
                            let flat: Vec<String> = arr
                                .iter()
                                .filter_map(|v| match v {
                                    serde_json::Value::String(s) => Some(s.clone()),
                                    serde_json::Value::Object(_o) => {
                                        let inner = format_describe(v, indent + 4);
                                        if inner.trim().is_empty() {
                                            None
                                        } else {
                                            Some(inner.trim().to_string())
                                        }
                                    }
                                    _ => Some(format!("{v}")),
                                })
                                .collect();
                            if !flat.is_empty() && flat.iter().all(|s| s.len() < 60) {
                                out.push_str(&format!("{pad}{label:<25} {}\n", flat.join(", ")));
                            } else {
                                out.push_str(&format!("{pad}{label}:\n"));
                                for item in &flat {
                                    for line in item.lines() {
                                        out.push_str(&format!("{pad2}- {line}\n"));
                                    }
                                }
                            }
                        }
                    }
                    serde_json::Value::Object(_) => {
                        let inner = format_describe(val, indent + 2);
                        if !inner.trim().is_empty() {
                            out.push_str(&format!("{pad}{label}:\n{inner}"));
                        }
                    }
                }
            }
        }
        _ => {
            out.push_str(&format!("{pad}{value}\n"));
        }
    }
    out
}

pub(crate) async fn describe_resource(
    context: Option<String>,
    kind: String,
    name: String,
    namespace: Option<String>,
) -> Result<DescribeResponse, String> {
    use k8s_openapi::api::apps::v1::{Deployment, StatefulSet};
    use k8s_openapi::api::core::v1::{ConfigMap, Node, PersistentVolumeClaim, Pod, Secret, Service};
    use k8s_openapi::api::networking::v1::Ingress;
    use kube::Api;

    let client = make_client(context).await?;

    let value: serde_json::Value = match kind.as_str() {
        "pods" | "Pod" => {
            let ns = namespace.ok_or("namespace required for pods")?;
            let obj = Api::<Pod>::namespaced(client, &ns)
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get pod: {e}"))?;
            serde_json::to_value(&obj).map_err(|e| format!("Serialization error: {e}"))?
        }
        "deployments" | "Deployment" => {
            let ns = namespace.ok_or("namespace required")?;
            let obj = Api::<Deployment>::namespaced(client, &ns)
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get deployment: {e}"))?;
            serde_json::to_value(&obj).map_err(|e| format!("Serialization error: {e}"))?
        }
        "statefulsets" | "StatefulSet" => {
            let ns = namespace.ok_or("namespace required")?;
            let obj = Api::<StatefulSet>::namespaced(client, &ns)
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get statefulset: {e}"))?;
            serde_json::to_value(&obj).map_err(|e| format!("Serialization error: {e}"))?
        }
        "services" | "Service" => {
            let ns = namespace.ok_or("namespace required")?;
            let obj = Api::<Service>::namespaced(client, &ns)
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get service: {e}"))?;
            serde_json::to_value(&obj).map_err(|e| format!("Serialization error: {e}"))?
        }
        "nodes" | "Node" => {
            let obj = Api::<Node>::all(client)
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get node: {e}"))?;
            serde_json::to_value(&obj).map_err(|e| format!("Serialization error: {e}"))?
        }
        "configmaps" | "ConfigMap" => {
            let ns = namespace.ok_or("namespace required")?;
            let obj = Api::<ConfigMap>::namespaced(client, &ns)
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get configmap: {e}"))?;
            serde_json::to_value(&obj).map_err(|e| format!("Serialization error: {e}"))?
        }
        "secrets" | "Secret" => {
            let ns = namespace.ok_or("namespace required")?;
            let obj = Api::<Secret>::namespaced(client, &ns)
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get secret: {e}"))?;
            serde_json::to_value(&obj).map_err(|e| format!("Serialization error: {e}"))?
        }
        "ingresses" | "Ingress" => {
            let ns = namespace.ok_or("namespace required")?;
            let obj = Api::<Ingress>::namespaced(client, &ns)
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get ingress: {e}"))?;
            serde_json::to_value(&obj).map_err(|e| format!("Serialization error: {e}"))?
        }
        "pvcs" | "PersistentVolumeClaim" => {
            let ns = namespace.ok_or("namespace required")?;
            let obj = Api::<PersistentVolumeClaim>::namespaced(client, &ns)
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get pvc: {e}"))?;
            serde_json::to_value(&obj).map_err(|e| format!("Serialization error: {e}"))?
        }
        _ => return Err(format!("Unsupported resource kind: {kind}")),
    };

    let describe = format_describe(&value, 0);
    Ok(DescribeResponse { describe })
}
