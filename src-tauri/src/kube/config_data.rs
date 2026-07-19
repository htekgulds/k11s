use k8s_openapi::api::core::v1::{ConfigMap, Secret};
use kube::Api;
use serde::Serialize;
use base64::Engine;

use crate::kube::client::make_client;

#[derive(Debug, Clone, Serialize)]
pub(crate) struct ConfigDataEntry {
    pub key: String,
    pub value: String,
    pub binary: bool,
    pub source_name: String,
    pub source_namespace: String,
    pub source_kind: String,
}

pub(crate) async fn list_config_data(
    context: Option<String>,
    kind: String,
    name: String,
    namespace: String,
) -> Result<Vec<ConfigDataEntry>, String> {
    let client = make_client(context).await?;

    let source_name = name.clone();
    let source_namespace = namespace.clone();

    match kind.as_str() {
        "configmaps" | "configmap" | "ConfigMap" => {
            let api = Api::<ConfigMap>::namespaced(client, &namespace);
            let cm = api
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get ConfigMap: {e}"))?;

            let mut entries = Vec::new();

            // Regular .data entries (String values)
            if let Some(data) = cm.data {
                for (key, value) in data {
                    entries.push(ConfigDataEntry {
                        key,
                        value,
                        binary: false,
                        source_name: source_name.clone(),
                        source_namespace: source_namespace.clone(),
                        source_kind: "ConfigMap".to_string(),
                    });
                }
            }

            // .binary_data entries (ByteString values)
            if let Some(binary_data) = cm.binary_data {
                for (key, byte_string) in binary_data {
                    let bytes = &byte_string.0;
                    let value = if let Ok(s) = String::from_utf8(bytes.clone()) {
                        s
                    } else {
                        let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
                        format!("base64: {encoded}")
                    };
                    entries.push(ConfigDataEntry {
                        key,
                        value,
                        binary: true,
                        source_name: source_name.clone(),
                        source_namespace: source_namespace.clone(),
                        source_kind: "ConfigMap".to_string(),
                    });
                }
            }

            Ok(entries)
        }
        "secrets" | "secret" | "Secret" => {
            let api = Api::<Secret>::namespaced(client, &namespace);
            let secret = api
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get Secret: {e}"))?;

            let mut entries = Vec::new();

            if let Some(data) = secret.data {
                for (key, byte_string) in data {
                    let bytes = &byte_string.0;
                    // Try to interpret as UTF-8 string
                    if let Ok(s) = String::from_utf8(bytes.clone()) {
                        entries.push(ConfigDataEntry {
                            key,
                            value: s,
                            binary: false,
                            source_name: source_name.clone(),
                            source_namespace: source_namespace.clone(),
                            source_kind: "Secret".to_string(),
                        });
                    } else {
                        // Binary data — re-base64-encode for display
                        let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
                        entries.push(ConfigDataEntry {
                            key,
                            value: format!("base64: {encoded}"),
                            binary: true,
                            source_name: source_name.clone(),
                            source_namespace: source_namespace.clone(),
                            source_kind: "Secret".to_string(),
                        });
                    }
                }
            }

            Ok(entries)
        }
        _ => Err(format!("Unsupported kind: {kind}")),
    }
}
