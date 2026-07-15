use base64::Engine;
use k8s_openapi::api::core::v1::Namespace;
use kube::api::ListParams;
use kube::Api;
use serde::Serialize;

use crate::kube::client::make_client;

#[derive(Debug, Clone, Serialize)]
pub(crate) struct HelmReleaseInfo {
    pub name: String,
    pub namespace: String,
    pub chart: String,
    pub version: String,
    pub status: String,
    pub revision: i64,
    pub updated: String,
}

/// Parse a Helm release from the base64+gzip-compressed protobuf bytes
/// stored in Secret.data["release"].
///
/// The decompressed payload is a protobuf message (`hapi.release.Release`)
/// that contains a JSON-encoded sub-message starting at the first '{'.
/// We locate that JSON, parse it with serde_json, and extract the fields.
fn parse_helm_release(raw: &str) -> Result<HelmReleaseInfo, String> {
    // 1. Base64 decode
    let compressed = base64::engine::general_purpose::STANDARD
        .decode(raw)
        .map_err(|e| format!("base64 decode error: {e}"))?;

    // 2. Gzip decompress
    use std::io::Read;
    let mut decoder = flate2::read::GzDecoder::new(&compressed[..]);
    let mut decompressed = Vec::new();
    decoder
        .read_to_end(&mut decompressed)
        .map_err(|e| format!("gzip decompress error: {e}"))?;

    // 3. Find the embedded JSON (first '{' after protobuf header)
    let text = String::from_utf8_lossy(&decompressed);
    let json_start = text
        .find('{')
        .ok_or_else(|| "no JSON found in decompressed release data".to_string())?;

    let json_str = &text[json_start..];

    // 4. Parse JSON
    let release: serde_json::Value =
        serde_json::from_str(json_str).map_err(|e| format!("JSON parse error: {e}"))?;

    // 5. Extract fields
    let name = release["name"]
        .as_str()
        .unwrap_or("unknown")
        .to_string();

    let namespace = release["namespace"]
        .as_str()
        .unwrap_or("default")
        .to_string();

    let chart_name = release["chart"]["metadata"]["name"]
        .as_str()
        .unwrap_or("unknown")
        .to_string();

    let chart_version = release["chart"]["metadata"]["version"]
        .as_str()
        .unwrap_or("unknown")
        .to_string();

    let status_val = release["info"]["status"]["status"]
        .as_str()
        .unwrap_or("unknown")
        .to_string();

    let revision = release["version"].as_i64().unwrap_or(1);

    // Try last_deployed first, then first_deployed
    let updated = release["info"]["last_deployed"]
        .as_str()
        .or_else(|| release["info"]["first_deployed"].as_str())
        .unwrap_or("")
        .to_string();

    Ok(HelmReleaseInfo {
        name,
        namespace,
        chart: format!("{chart_name}-{chart_version}"),
        version: chart_version,
        status: status_val,
        revision,
        updated,
    })
}

/// List all Helm releases across all namespaces by inspecting Secrets
/// with label `owner=helm` and type `sh.helm.release.v1`.
pub(crate) async fn list_helm_releases(context: Option<String>) -> Result<Vec<HelmReleaseInfo>, String> {
    let client = make_client(context).await?;

    // List all namespaces
    let namespaces = Api::<Namespace>::all(client.clone())
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list namespaces: {e}"))?;

    let mut releases: Vec<HelmReleaseInfo> = Vec::new();

    for ns in namespaces.items {
        let ns_name = ns.metadata.name.as_deref().unwrap_or("default");

        let secrets: kube::Result<kube::core::ObjectList<k8s_openapi::api::core::v1::Secret>> =
            Api::namespaced(client.clone(), ns_name)
                .list(
                    &ListParams::default()
                        .labels("owner=helm"),
                )
                .await;

        let secrets = match secrets {
            Ok(s) => s,
            Err(_) => continue,
        };

        for secret in secrets.items {
            // Type must be sh.helm.release.v1
            let type_ = secret.type_.as_deref().unwrap_or("");
            if type_ != "sh.helm.release.v1" {
                continue;
            }

            let data = match &secret.data {
                Some(d) => d,
                None => continue,
            };

            let release_b64 = match data.get("release") {
                Some(v) => String::from_utf8_lossy(&v.0).to_string(),
                None => continue,
            };

            match parse_helm_release(&release_b64) {
                Ok(info) => releases.push(info),
                Err(e) => {
                    eprintln!(
                        "Warning: failed to parse helm release in {ns_name}/{}: {e}",
                        secret.metadata.name.as_deref().unwrap_or("<unknown>")
                    );
                }
            }
        }
    }

    Ok(releases)
}
