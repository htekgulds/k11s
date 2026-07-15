use crate::kube::{self, resources::{
    DeploymentInfo, StatefulSetInfo, ServiceInfo, IngressInfo,
    ConfigMapInfo, SecretInfo, PvcInfo, DaemonSetInfo, CronJobInfo, JobInfo, HpaInfo,
}};
use crate::kube::nodes::NodeInfo;

#[tauri::command]
pub(crate) async fn list_nodes(context: Option<String>) -> Result<Vec<NodeInfo>, String> {
    kube::list_nodes(context).await
}

#[tauri::command]
pub(crate) async fn list_deployments(context: Option<String>) -> Result<Vec<DeploymentInfo>, String> {
    kube::resources::list_deployments(context).await
}

#[tauri::command]
pub(crate) async fn list_statefulsets(context: Option<String>) -> Result<Vec<StatefulSetInfo>, String> {
    kube::resources::list_statefulsets(context).await
}

#[tauri::command]
pub(crate) async fn list_services(context: Option<String>) -> Result<Vec<ServiceInfo>, String> {
    kube::resources::list_services(context).await
}

#[tauri::command]
pub(crate) async fn list_ingresses(context: Option<String>) -> Result<Vec<IngressInfo>, String> {
    kube::resources::list_ingresses(context).await
}

#[tauri::command]
pub(crate) async fn list_configmaps(context: Option<String>) -> Result<Vec<ConfigMapInfo>, String> {
    kube::resources::list_configmaps(context).await
}

#[tauri::command]
pub(crate) async fn list_secrets(context: Option<String>) -> Result<Vec<SecretInfo>, String> {
    kube::resources::list_secrets(context).await
}

#[tauri::command]
pub(crate) async fn list_persistentvolumeclaims(context: Option<String>) -> Result<Vec<PvcInfo>, String> {
    kube::resources::list_persistentvolumeclaims(context).await
}

#[tauri::command]
pub(crate) async fn list_daemonsets(context: Option<String>) -> Result<Vec<DaemonSetInfo>, String> {
    kube::resources::list_daemonsets(context).await
}

#[tauri::command]
pub(crate) async fn list_cronjobs(context: Option<String>) -> Result<Vec<CronJobInfo>, String> {
    kube::resources::list_cronjobs(context).await
}

#[tauri::command]
pub(crate) async fn list_jobs(context: Option<String>) -> Result<Vec<JobInfo>, String> {
    kube::resources::list_jobs(context).await
}

#[tauri::command]
pub(crate) async fn list_hpas(context: Option<String>) -> Result<Vec<HpaInfo>, String> {
    kube::resources::list_hpas(context).await
}
