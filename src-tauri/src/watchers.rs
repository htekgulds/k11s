use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio_util::sync::CancellationToken;

use k8s_openapi::api::apps::v1::{Deployment, StatefulSet};
use k8s_openapi::api::core::v1::{ConfigMap, Node, PersistentVolumeClaim, Pod, Secret, Service};
use k8s_openapi::api::networking::v1::Ingress;
use futures::StreamExt;
use kube::runtime::watcher;
use kube::api::Api;
use kube::Client;
use kube::Resource;
use kube::ResourceExt;
use serde::Serialize;
use serde_json::Value;
use tauri::Emitter;

#[derive(Debug, Clone, Serialize)]
pub struct WatchEventPayload {
    pub context: String,
    pub resource_type: String,
    pub action: String,
    pub name: String,
    pub namespace: String,
    pub object: Option<Value>,
}

struct WatcherHandle {
    cancel: CancellationToken,
}

pub struct WatcherManager {
    active: Arc<Mutex<HashMap<(String, String), WatcherHandle>>>,
}

impl WatcherManager {
    pub fn new() -> Self {
        Self {
            active: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn start(
        &self,
        app_handle: tauri::AppHandle,
        context: String,
        resource_type: String,
    ) -> Result<(), String> {
        self.stop(&context, &resource_type).await;

        let cancel = CancellationToken::new();
        let handle = WatcherHandle {
            cancel: cancel.clone(),
        };
        let key = (context.clone(), resource_type.clone());

        self.active.lock().await.insert(key, handle);

        let ctx = context.clone();
        let rt = resource_type.clone();
        tauri::async_runtime::spawn(async move {
            run_watcher(app_handle, ctx, rt, cancel).await;
        });

        Ok(())
    }

    pub async fn stop(&self, context: &str, resource_type: &str) {
        let key = (context.to_string(), resource_type.to_string());
        let mut active = self.active.lock().await;
        if let Some(handle) = active.remove(&key) {
            handle.cancel.cancel();
        }
    }

    pub async fn stop_all(&self, context: &str) {
        let mut active = self.active.lock().await;
        active.retain(|k, h| {
            if k.0 == context {
                h.cancel.cancel();
                false
            } else {
                true
            }
        });
    }
}

fn emit(
    app: &tauri::AppHandle,
    context: &str,
    resource_type: &str,
    action: &str,
    name: &str,
    namespace: &str,
    object: Option<Value>,
) {
    let payload = WatchEventPayload {
        context: context.to_string(),
        resource_type: resource_type.to_string(),
        action: action.to_string(),
        name: name.to_string(),
        namespace: namespace.to_string(),
        object,
    };
    let _ = app.emit("resource-update", payload);
}

fn emit_apply(
    app: &tauri::AppHandle,
    context: &str,
    resource_type: &str,
    obj: &Value,
) {
    let name = obj["name"].as_str().unwrap_or("").to_string();
    let namespace = obj["namespace"].as_str().unwrap_or("").to_string();
    emit(app, context, resource_type, "apply", &name, &namespace, Some(obj.clone()));
}

fn emit_delete<K>(app: &tauri::AppHandle, context: &str, resource_type: &str, obj: &K)
where
    K: Resource,
{
    let name = obj.name_any().to_string();
    let namespace = obj.namespace().unwrap_or_default();
    emit(app, context, resource_type, "delete", &name, &namespace, None);
}

async fn run_watcher(
    app: tauri::AppHandle,
    context: String,
    resource_type: String,
    cancel: CancellationToken,
) {
    let ctx_opt = if context.is_empty() {
        None
    } else {
        Some(context.clone())
    };

    let client = match crate::kube::client::make_client(ctx_opt).await {
        Ok(c) => c,
        Err(e) => {
            emit(
                &app,
                &context,
                &resource_type,
                "error",
                "",
                "",
                Some(serde_json::json!({"error": e})),
            );
            return;
        }
    };

    match resource_type.as_str() {
        "pods" => watch_type::<Pod, _>(app, context, resource_type, client, cancel, |p| {
            serde_json::to_value(crate::kube::pods::pod_to_info(p)).unwrap_or_default()
        })
        .await,
        "nodes" => watch_nodes(app, context, resource_type, client, cancel).await,
        "deployments" => watch_type::<Deployment, _>(app, context, resource_type, client, cancel, |d| {
            serde_json::to_value(crate::kube::resources::deployment_to_info(d)).unwrap_or_default()
        })
        .await,
        "statefulsets" => watch_type::<StatefulSet, _>(app, context, resource_type, client, cancel, |s| {
            serde_json::to_value(crate::kube::resources::statefulset_to_info(s)).unwrap_or_default()
        })
        .await,
        "services" => watch_type::<Service, _>(app, context, resource_type, client, cancel, |s| {
            serde_json::to_value(crate::kube::resources::service_to_info(s)).unwrap_or_default()
        })
        .await,
        "ingresses" => watch_type::<Ingress, _>(app, context, resource_type, client, cancel, |i| {
            serde_json::to_value(crate::kube::resources::ingress_to_info(i)).unwrap_or_default()
        })
        .await,
        "configmaps" => watch_type::<ConfigMap, _>(app, context, resource_type, client, cancel, |c| {
            serde_json::to_value(crate::kube::resources::configmap_to_info(c)).unwrap_or_default()
        })
        .await,
        "secrets" => watch_type::<Secret, _>(app, context, resource_type, client, cancel, |s| {
            serde_json::to_value(crate::kube::resources::secret_to_info(s)).unwrap_or_default()
        })
        .await,
        "pvcs" => watch_type::<PersistentVolumeClaim, _>(app, context, resource_type, client, cancel, |p| {
            serde_json::to_value(crate::kube::resources::pvc_to_info(p)).unwrap_or_default()
        })
        .await,
        other => {
            eprintln!("unknown resource type for watcher: {other}");
        }
    }
}

async fn watch_type<K, F>(
    app: tauri::AppHandle,
    context: String,
    resource_type: String,
    client: Client,
    cancel: CancellationToken,
    converter: F,
) where
    K: Resource + Clone + serde::de::DeserializeOwned + std::fmt::Debug + Send + 'static,
    K::DynamicType: Default,
    F: Fn(K) -> Value + Send + 'static,
{
    let api = Api::<K>::all(client);
    let stream = watcher(api, watcher::Config::default());
    tokio::pin!(stream);

    use futures::StreamExt;
    loop {
        tokio::select! {
            _ = cancel.cancelled() => break,
            maybe_event = stream.next() => {
                match maybe_event {
                    Some(Ok(watcher::Event::Apply(obj))) => {
                        let v = converter(obj);
                        emit_apply(&app, &context, &resource_type, &v);
                    }
                    Some(Ok(watcher::Event::Delete(obj))) => {
                        emit_delete(&app, &context, &resource_type, &obj);
                    }
                    Some(Ok(watcher::Event::InitApply(obj))) => {
                        let v = converter(obj);
                        emit_apply(&app, &context, &resource_type, &v);
                    }
                    Some(Ok(watcher::Event::InitDone)) => {
                        emit(&app, &context, &resource_type, "init_done", "", "", None);
                    }
                    Some(Ok(watcher::Event::Init)) => {}
                    Some(Err(e)) => {
                        eprintln!("watcher error for {resource_type}: {e:?}");
                        // watcher auto-recovers
                    }
                    None => break,
                }
            }
        }
    }
}

async fn watch_nodes(
    app: tauri::AppHandle,
    context: String,
    resource_type: String,
    client: Client,
    cancel: CancellationToken,
) {
    let api = Api::<Node>::all(client.clone());
    let stream = watcher(api, watcher::Config::default());
    tokio::pin!(stream);

    loop {
        tokio::select! {
            _ = cancel.cancelled() => break,
            maybe_event = stream.next() => {
                match maybe_event {
                    Some(Ok(watcher::Event::Apply(obj))) | Some(Ok(watcher::Event::InitApply(obj))) => {
                        let counts = crate::kube::nodes::pods_per_node(&client).await;
                        let node_name = obj.metadata.name.clone().unwrap_or_default();
                        let count = counts.get(&node_name).copied().unwrap_or(0);
                        let v = serde_json::to_value(crate::kube::nodes::node_to_info(obj, count)).unwrap_or_default();
                        emit_apply(&app, &context, &resource_type, &v);
                    }
                    Some(Ok(watcher::Event::Delete(obj))) => {
                        emit_delete(&app, &context, &resource_type, &obj);
                    }
                    Some(Ok(watcher::Event::InitDone)) => {
                        emit(&app, &context, &resource_type, "init_done", "", "", None);
                    }
                    Some(Ok(watcher::Event::Init)) => {}
                    Some(Err(e)) => {
                        eprintln!("watcher error for nodes: {e:?}");
                    }
                    None => break,
                }
            }
        }
    }
}
