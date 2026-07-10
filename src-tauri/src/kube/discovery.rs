use std::collections::HashSet;

use serde::Serialize;

use crate::kube::client::make_client;

#[derive(Debug, Clone, Serialize)]
pub(crate) struct DiscoveredResource {
    pub plural: String,
    pub group: String,
    pub version: String,
    pub kind: String,
    pub namespaced: bool,
    pub is_common: bool,
    pub verbs: Vec<String>,
}

pub(crate) const COMMON_RESOURCES: &[&str] = &[
    "pods", "deployments", "services", "nodes", "configmaps",
    "secrets", "persistentvolumeclaims", "ingresses", "statefulsets",
    "daemonsets", "jobs", "cronjobs", "horizontalpodautoscalers",
    "networkpolicies",
];

pub(crate) async fn discover_resources(
    context: Option<String>,
) -> Result<Vec<DiscoveredResource>, String> {
    let client = make_client(context).await?;
    let common_set: HashSet<&str> = COMMON_RESOURCES.iter().copied().collect();

    let mut result = Vec::new();

    // Core group (v1)
    let core: serde_json::Value = client
        .request(kube::core::Request::new("/api/v1").list(&kube::api::ListParams::default()).map_err(|e| format!("Core discovery request: {e}"))?)
        .await
        .map_err(|e| format!("Core API discovery failed: {e}"))?;
    if let Some(resources) = core["resources"].as_array() {
        for res in resources {
            let name = res["name"].as_str().unwrap_or("");
            if name.contains('/') {
                continue;
            }
            result.push(DiscoveredResource {
                plural: name.to_string(),
                group: String::new(),
                version: "v1".to_string(),
                kind: res["kind"].as_str().unwrap_or("").to_string(),
                namespaced: res["namespaced"].as_bool().unwrap_or(false),
                is_common: common_set.contains(name),
                verbs: res["verbs"]
                    .as_array()
                    .map(|a| {
                        a.iter()
                            .filter_map(|v| v.as_str().map(String::from))
                            .collect()
                    })
                    .unwrap_or_default(),
            });
        }
    }

    // All API groups (e.g. apps, batch, networking.k8s.io, ...)
    let apis: serde_json::Value = client
        .request(kube::core::Request::new("/apis").list(&kube::api::ListParams::default()).map_err(|e| format!("API groups request: {e}"))?)
        .await
        .map_err(|e| format!("API groups discovery failed: {e}"))?;
    if let Some(groups) = apis["groups"].as_array() {
        for g in groups {
            let group_name = g["name"].as_str().unwrap_or("");
            if let Some(versions) = g["versions"].as_array() {
                for v in versions {
                    let ver = v["version"].as_str().unwrap_or("");
                    let path = format!("/apis/{group_name}/{ver}");
                    let grp: serde_json::Value = client
                        .request(kube::core::Request::new(&path).list(&kube::api::ListParams::default()).map_err(|e| format!("API group request: {e}"))?)
                        .await
                        .map_err(|e| format!("API group {path} discovery failed: {e}"))?;
                    if let Some(resources) = grp["resources"].as_array() {
                        for res in resources {
                            let name = res["name"].as_str().unwrap_or("");
                            if name.contains('/') {
                                continue;
                            }
                            result.push(DiscoveredResource {
                                plural: name.to_string(),
                                group: group_name.to_string(),
                                version: ver.to_string(),
                                kind: res["kind"].as_str().unwrap_or("").to_string(),
                                namespaced: res["namespaced"].as_bool().unwrap_or(false),
                                is_common: common_set.contains(name),
                                verbs: res["verbs"]
                                    .as_array()
                                    .map(|a| {
                                        a.iter()
                                            .filter_map(|v| v.as_str().map(String::from))
                                            .collect()
                                    })
                                    .unwrap_or_default(),
                            });
                        }
                    }
                }
            }
        }
    }

    result.sort_by(|a, b| {
        b.is_common
            .cmp(&a.is_common)
            .then(a.group.cmp(&b.group))
            .then(a.plural.cmp(&b.plural))
    });

    Ok(result)
}

pub(crate) async fn list_resource(
    context: Option<String>,
    group: String,
    version: String,
    kind: String,
    plural: String,
    namespaced: bool,
) -> Result<Vec<serde_json::Value>, String> {
    let client = make_client(context).await?;

    use kube::api::{Api, ListParams};
    use kube::core::DynamicObject;

    let api_version = if group.is_empty() {
        version.clone()
    } else {
        format!("{group}/{version}")
    };

    let ar = kube::core::ApiResource {
        group,
        version,
        api_version,
        kind: kind.clone(),
        plural,
    };

    let api: Api<DynamicObject> = if namespaced {
        Api::default_namespaced_with(client, &ar)
    } else {
        Api::all_with(client, &ar)
    };

    let list = api
        .list(&ListParams::default().limit(500))
        .await
        .map_err(|e| format!("Failed to list: {e}"))?;

    let items: Vec<serde_json::Value> = list
        .items
        .into_iter()
        .map(|obj| serde_json::to_value(obj))
        .collect::<Result<_, _>>()
        .map_err(|e| format!("Serialization error: {e}"))?;

    Ok(items)
}
