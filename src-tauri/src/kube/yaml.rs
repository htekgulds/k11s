use serde::Serialize;
use crate::kube::client::make_client;

pub(crate) fn to_yaml_stripped<T: serde::Serialize>(obj: &T, omit: bool) -> Result<String, String> {
    if !omit {
        return serde_yaml::to_string(obj).map_err(|e| e.to_string());
    }
    let mut val = serde_json::to_value(obj).map_err(|e| e.to_string())?;
    if let Some(meta) = val.get_mut("metadata").and_then(|m| m.as_object_mut()) {
        meta.remove("managedFields");
    }
    serde_yaml::to_string(&val).map_err(|e| e.to_string())
}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct YamlResponse {
    pub yaml: String,
}

pub(crate) async fn get_yaml(
    context: Option<String>,
    kind: String,
    name: String,
    namespace: Option<String>,
    omit_managed_fields: bool,
) -> Result<YamlResponse, String> {
    use k8s_openapi::api::apps::v1::{Deployment, StatefulSet};
    use k8s_openapi::api::core::v1::{ConfigMap, Node, PersistentVolumeClaim, Pod, Secret, Service};
    use k8s_openapi::api::networking::v1::Ingress;
    use kube::Api;

    let client = make_client(context).await?;
    let yaml = match kind.as_str() {
        "pods" | "Pod" => {
            let ns = namespace.ok_or("namespace required for pods")?;
            let obj = Api::<Pod>::namespaced(client, &ns)
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get pod: {e}"))?;
            to_yaml_stripped(&obj, omit_managed_fields)?
        }
        "deployments" | "Deployment" => {
            let ns = namespace.ok_or("namespace required")?;
            let obj = Api::<Deployment>::namespaced(client, &ns)
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get deployment: {e}"))?;
            to_yaml_stripped(&obj, omit_managed_fields)?
        }
        "statefulsets" | "StatefulSet" => {
            let ns = namespace.ok_or("namespace required")?;
            let obj = Api::<StatefulSet>::namespaced(client, &ns)
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get statefulset: {e}"))?;
            to_yaml_stripped(&obj, omit_managed_fields)?
        }
        "services" | "Service" => {
            let ns = namespace.ok_or("namespace required")?;
            let obj = Api::<Service>::namespaced(client, &ns)
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get service: {e}"))?;
            to_yaml_stripped(&obj, omit_managed_fields)?
        }
        "ingresses" | "Ingress" => {
            let ns = namespace.ok_or("namespace required")?;
            let obj = Api::<Ingress>::namespaced(client, &ns)
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get ingress: {e}"))?;
            to_yaml_stripped(&obj, omit_managed_fields)?
        }
        "configmaps" | "ConfigMap" => {
            let ns = namespace.ok_or("namespace required")?;
            let obj = Api::<ConfigMap>::namespaced(client, &ns)
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get configmap: {e}"))?;
            to_yaml_stripped(&obj, omit_managed_fields)?
        }
        "secrets" | "Secret" => {
            let ns = namespace.ok_or("namespace required")?;
            let obj = Api::<Secret>::namespaced(client, &ns)
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get secret: {e}"))?;
            to_yaml_stripped(&obj, omit_managed_fields)?
        }
        "pvcs" | "PersistentVolumeClaim" => {
            let ns = namespace.ok_or("namespace required")?;
            let obj = Api::<PersistentVolumeClaim>::namespaced(client, &ns)
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get PVC: {e}"))?;
            to_yaml_stripped(&obj, omit_managed_fields)?
        }
        "nodes" | "Node" => {
            let obj = Api::<Node>::all(client)
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get node: {e}"))?;
            to_yaml_stripped(&obj, omit_managed_fields)?
        }
        other => return Err(format!("Unsupported kind: {other}")),
    };
    Ok(YamlResponse { yaml })
}

/// Apply YAML to the cluster using kube-rs native server-side apply.
pub(crate) async fn apply_yaml(
    context: Option<String>,
    yaml_content: String,
) -> Result<String, String> {
    use kube::api::{Patch, PatchParams};
    use kube::core::{DynamicObject, GroupVersionKind};
    use kube::Api;

    let client = make_client(context).await?;

    // Parse YAML to JSON Value
    let value: serde_json::Value = serde_yaml::from_str(&yaml_content)
        .map_err(|e| format!("Failed to parse YAML: {e}"))?;

    // Clone extracted strings before moving value
    let api_version = value["apiVersion"]
        .as_str()
        .ok_or("Missing apiVersion in YAML")?
        .to_string();
    let kind = value["kind"]
        .as_str()
        .ok_or("Missing kind in YAML")?
        .to_string();
    let name = value["metadata"]["name"]
        .as_str()
        .ok_or("Missing metadata.name in YAML")?
        .to_string();
    let namespace = value["metadata"]["namespace"].as_str().map(|s| s.to_string());

    // Build GroupVersionKind from the document
    let (group, version) = match api_version.split_once('/') {
        Some((g, v)) => (g.to_string(), v.to_string()),
        None => ("".to_string(), api_version.clone()),
    };
    let gvk = GroupVersionKind { group, version, kind: kind.clone() };

    // Convert raw value to DynamicObject (take ownership of value)
    let obj: DynamicObject = serde_json::from_value(value)
        .map_err(|e| format!("Failed to convert resource: {e}"))?;

    // Discover the API resource for this GVK
    let discovery = kube::discovery::Discovery::new(client.clone())
        .run()
        .await
        .map_err(|e| format!("Failed to discover API resources: {e}"))?;
    let (api_resource, _caps) = discovery
        .resolve_gvk(&gvk)
        .ok_or_else(|| format!("Unknown resource type: {kind} ({api_version})"))?
        .clone();

    // Build the typed API — namespaced or cluster-scoped
    let api: Api<DynamicObject> = if let Some(ref ns) = namespace {
        Api::namespaced_with(client, ns, &api_resource)
    } else {
        Api::default_namespaced_with(client, &api_resource)
    };

    // Server-side apply (force=true to auto-resolve field manager conflicts)
    let params = PatchParams::apply("k11s").force();
    let patch = Patch::Apply(&obj);

    api.patch(&name, &params, &patch)
        .await
        .map_err(|e| format!("Apply failed: {e}"))?;

    Ok(format!("Applied {kind}/{name}"))
}
