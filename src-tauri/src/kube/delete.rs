use k8s_openapi::api::apps::v1::{Deployment, StatefulSet};
use k8s_openapi::api::core::v1::{ConfigMap, Node, PersistentVolumeClaim, Pod, Secret, Service};
use k8s_openapi::api::networking::v1::Ingress;
use kube::api::{DeleteParams, PropagationPolicy};
use kube::Api;
use serde::Serialize;

use crate::kube::client::make_client;

#[derive(Debug, Clone, Serialize)]
pub(crate) struct DeleteResponse {
    pub success: bool,
    pub message: String,
}

pub(crate) async fn delete_resource(
    context: Option<String>,
    kind: String,
    name: String,
    namespace: String,
    grace_period_seconds: Option<i64>,
    force: bool,
) -> Result<DeleteResponse, String> {
    let client = make_client(context).await?;

    let mut delete_params = DeleteParams::default();
    if let Some(gp) = grace_period_seconds {
        delete_params.grace_period_seconds = Some(gp as u32);
    }
    if force {
        delete_params.grace_period_seconds = Some(0);
        delete_params.propagation_policy =
            Some(PropagationPolicy::Background);
    }

    match kind.as_str() {
        "pods" => {
            let api: Api<Pod> = Api::namespaced(client, &namespace);
            api.delete(&name, &delete_params)
                .await
                .map_err(|e| format!("Failed to delete pod: {e}"))?;
        }
        "deployments" => {
            let api: Api<Deployment> = Api::namespaced(client, &namespace);
            api.delete(&name, &delete_params)
                .await
                .map_err(|e| format!("Failed to delete deployment: {e}"))?;
        }
        "statefulsets" => {
            let api: Api<StatefulSet> = Api::namespaced(client, &namespace);
            api.delete(&name, &delete_params)
                .await
                .map_err(|e| format!("Failed to delete statefulset: {e}"))?;
        }
        "services" => {
            let api: Api<Service> = Api::namespaced(client, &namespace);
            api.delete(&name, &delete_params)
                .await
                .map_err(|e| format!("Failed to delete service: {e}"))?;
        }
        "ingresses" => {
            let api: Api<Ingress> = Api::namespaced(client, &namespace);
            api.delete(&name, &delete_params)
                .await
                .map_err(|e| format!("Failed to delete ingress: {e}"))?;
        }
        "configmaps" => {
            let api: Api<ConfigMap> = Api::namespaced(client, &namespace);
            api.delete(&name, &delete_params)
                .await
                .map_err(|e| format!("Failed to delete configmap: {e}"))?;
        }
        "secrets" => {
            let api: Api<Secret> = Api::namespaced(client, &namespace);
            api.delete(&name, &delete_params)
                .await
                .map_err(|e| format!("Failed to delete secret: {e}"))?;
        }
        "pvcs" => {
            let api: Api<PersistentVolumeClaim> = Api::namespaced(client, &namespace);
            api.delete(&name, &delete_params)
                .await
                .map_err(|e| format!("Failed to delete pvc: {e}"))?;
        }
        "nodes" => {
            let api: Api<Node> = Api::all(client);
            api.delete(&name, &delete_params)
                .await
                .map_err(|e| format!("Failed to delete node: {e}"))?;
        }
        _ => return Err(format!("Unsupported resource kind: {kind}")),
    }

    Ok(DeleteResponse {
        success: true,
        message: format!("{kind}/{name} deleted"),
    })
}
