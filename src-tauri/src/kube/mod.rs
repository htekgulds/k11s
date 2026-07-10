pub(crate) mod client;
pub(crate) mod pods;
pub(crate) mod nodes;
pub(crate) mod resources;
pub(crate) mod events;
pub(crate) mod yaml;
pub(crate) mod describe;
pub(crate) mod delete;
pub(crate) mod health;
pub(crate) mod port_forward;
pub(crate) mod exec;
pub(crate) mod logs;
pub(crate) mod rollout;
pub(crate) mod discovery;

// Re-export public API consumed by commands/ and watchers/
pub(crate) use pods::{list_pods, PodInfo};
pub(crate) use nodes::list_nodes;
pub(crate) use events::{get_events, EventsResponse};
pub(crate) use yaml::{get_yaml, apply_yaml, YamlResponse};
pub(crate) use describe::{describe_resource, DescribeResponse};
pub(crate) use delete::{delete_resource, DeleteResponse};
pub(crate) use health::cluster_health;
pub(crate) use port_forward::{start_port_forward, PortForwardInfo};
pub(crate) use exec::{exec_pod_shell, exec_pod_stdin, exec_pod_stop};
pub(crate) use logs::{get_pod_logs, stream_pod_logs, PodLogsResponse};
pub(crate) use rollout::{rollout_action, RolloutResponse};
pub(crate) use discovery::{discover_resources, list_resource, DiscoveredResource};
