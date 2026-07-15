# k11s — Tauri Kubernetes Viewer

Tauri v2 app (Rust backend + React frontend) for viewing and interacting with Kubernetes clusters.

## Tech Stack

- **Backend:** Rust (kube 0.98, k8s-openapi 0.24 w/ v1.31, tokio, chrono, serde, serde_yaml, tauri v2)
- **Frontend:** React 18 + Vite + TailwindCSS + lucide-react icons + react-hotkeys-hook
- **k8s client:** `kube` crate for all API ops (native exec, port-forward, watch, list, logs, describe, delete, rollout, discovery). `kubectl apply -f -` subprocess only for YAML apply.
- **Build:** `npm run tauri dev` (dev), `npm run tauri build` (release)

## Project Structure

```
k11s/
├── src/                                  # React frontend
│   ├── main.jsx                          # Entry point
│   ├── App.jsx                           # Root component
│   ├── App.css                           # Global styles
│   └── kubeview/
│       ├── KubeClient.jsx                # K8s API context provider
│       ├── constants.jsx                 # Resource type constants
│       ├── theme.jsx                     # Theming (light/dark)
│       ├── kubeview.css                  # App-specific styles
│       ├── api/                          # Tauri invoke wrappers (per-domain)
│       │   ├── index.js                  # Re-exports
│       │   ├── clusters.js               # Cluster management
│       │   ├── resources.js              # Resource CRUD, discovery, rollout, yaml
│       │   ├── exec.js                   # Pod shell exec
│       │   └── watchers.js               # Watch lifecycle
│       ├── stores/                       # Zustand stores
│       │   ├── index.js                  # Re-exports
│       │   ├── useClustersStore.js       # Cluster list & selection
│       │   ├── useDataStore.js           # Resource data cache
│       │   └── useNavigationStore.js     # Sidebar/tab navigation state
│       ├── hooks/                        # React hooks
│       │   ├── index.js                  # Re-exports
│       │   ├── useClock.js               # Time display
│       │   ├── useClusterHealth.js       # Health check polling
│       │   └── useWatchers.js            # Watch event subscription
│       ├── features/                     # Feature-grouped components
│       │   ├── layout/                   # App shell
│       │   │   ├── Sidebar.jsx           # Resource nav + cluster selector
│       │   │   ├── TopBar.jsx            # Header: cluster info + actions
│       │   │   ├── StatusBar.jsx         # Connection status indicator
│       │   │   ├── ClusterDropdown.jsx   # Cluster context picker
│       │   │   └── ShortcutsModal.jsx    # Keyboard shortcuts help (?)
│       │   ├── resource-list/
│       │   │   └── ResourceListTab.jsx   # Table for any resource type
│       │   ├── detail-view/
│       │   │   ├── DetailView.jsx        # Resource detail pane container
│       │   │   ├── DetailTabs.jsx        # Tab container for sub-views
│       │   │   ├── DetailHeader.jsx      # Resource name/namespace/age header
│       │   │   ├── InfoTab.jsx           # General resource metadata
│       │   │   ├── LogsTab.jsx           # Pod logs (snapshot + streaming)
│       │   │   ├── YamlTab.jsx           # YAML viewer/editor + save/apply
│       │   │   ├── EventsTab.jsx         # Related events
│       │   │   ├── DescribeTab.jsx       # kubectl describe output
│       │   │   ├── ShellTab.jsx          # Interactive pod shell (xterm.js)
│       │   │   ├── GraphTab.jsx          # Topology graph tab wrapper
│       │   │   └── GraphView.jsx         # Graph canvas (force-directed)
│       │   ├── command-palette/
│       │   │   └── CommandPalette.jsx    # Cmd+K palette (search resources, nav)
│       │   └── port-forward/
│       │       └── PortForwardPanel.jsx  # Active port forwards manager
│       ├── components/ui/                # Shared UI primitives
│       │   ├── Dropdown.jsx
│       │   ├── FieldRow.jsx
│       │   ├── Pill.jsx
│       │   ├── Spinner.jsx
│       │   ├── StatusDot.jsx
│       │   └── Toast.jsx
│       └── utils/                        # Utility functions
│           ├── clusterColors.js
│           ├── colors.js
│           └── graph.js
├── src-tauri/                            # Rust backend
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs                       # Binary entry: calls lib::run()
│       ├── lib.rs                        # Tauri command registration, app builder
│       ├── clusters.rs                   # Multi-kubeconfig merge, CLI args, config persistence
│       ├── watchers.rs                   # Watch-based streaming (resource-update events)
│       ├── state/                        # App state managed by Tauri
│       │   └── mod.rs                    # PortForwardManager, LogStreamManager
│       ├── kube/                         # kube-rs core API layer (no Tauri deps)
│       │   ├── mod.rs                    # Re-exports all kube operations
│       │   ├── client.rs                 # Client creation from kubeconfig
│       │   ├── pods.rs                   # Pod list
│       │   ├── nodes.rs                  # Node list
│       │   ├── resources.rs              # Generic resource list (for discovery)
│       │   ├── logs.rs                   # Pod logs (snapshot + streaming)
│       │   ├── exec.rs                   # Pod shell exec (native kube-rs WebSocket)
│       │   ├── port_forward.rs           # Port forwarding (native kube-rs)
│       │   ├── describe.rs               # kubectl describe equivalent
│       │   ├── delete.rs                 # Resource deletion (grace-period, force)
│       │   ├── events.rs                 # Server-side filtered events
│       │   ├── health.rs                 # Cluster health check
│       │   ├── yaml.rs                   # Get/apply YAML (apply uses kubectl subprocess)
│       │   ├── rollout.rs                # Deploy/Sts rollout: restart, undo, pause, resume
│       │   └── discovery.rs              # API discovery + dynamic resource listing
│       └── commands/                     # Tauri #[tauri::command] handlers (thin wrappers)
│           ├── mod.rs                    # Module declarations
│           ├── cluster.rs                # list_clusters, cluster_health
│           ├── pod.rs                    # list_pods
│           ├── resources.rs              # list_nodes, list_deployments, etc.
│           ├── logs.rs                   # get_pod_logs, start_log_stream, stop_log_stream
│           ├── exec.rs                   # exec_pod_shell, exec_pod_stdin, exec_pod_stop
│           ├── port_forward.rs           # start_port_forward, stop_port_forward, list_port_forwards
│           ├── rollout.rs                # rollout_action
│           ├── yaml.rs                   # get_yaml, apply_yaml
│           ├── describe.rs               # describe_resource
│           ├── delete.rs                 # delete_resource
│           ├── events.rs                 # get_events
│           ├── health.rs                 # cluster_health
│           └── discovery.rs              # discover_resources, list_resource
├── package.json
├── vite.config.js                        # Vite config (port 1420)
├── tailwind.config.js
└── postcss.config.js
```

## Architecture

### Rust — kube/ + commands/ + clusters/ + watchers/

The backend is split into four layers:

| Layer | Directory | Role |
|-------|-----------|------|
| **kube/** | `src-tauri/src/kube/` | Pure kube-rs operations — no Tauri types. Used by both `commands/` and `watchers.rs`. |
| **commands/** | `src-tauri/src/commands/` | Tauri command handlers. Thin adapters that call into `kube/`, serialize results, manage state. |
| **clusters/** | `clusters.rs` | Kubeconfig persistence, context merging, CLI arg parsing. |
| **watchers/** | `watchers.rs` | Watch-based streaming — spawns tokio tasks, emits `resource-update` Tauri events. |

### Tauri Commands (registered in `lib.rs`)

| Command | Handler module | Description |
|---------|----------------|-------------|
| `list_clusters` | commands/cluster | List merged kubeconfig contexts |
| `cluster_health` | commands/health | Verify API server reachable |
| `get_default_context` | clusters (inline) | Active context name |
| `add_kubeconfig_files` | clusters (inline) | Add custom kubeconfig paths |
| `add_kubeconfig_folder` | clusters (inline) | Scan folder for kubeconfigs |
| `get_kubeconfig_paths` | clusters (inline) | List configured paths |
| `remove_kubeconfig_path` | clusters (inline) | Remove a kubeconfig path |
| `list_nodes`, `list_pods`, `list_deployments`, `list_statefulsets`, `list_services`, `list_ingresses`, `list_configmaps`, `list_secrets`, `list_persistentvolumeclaims` | commands/resources, commands/pod | List k8s resources |
| `get_pod_logs` | commands/logs | Fetch pod logs snapshot |
| `start_log_stream`, `stop_log_stream` | commands/logs | Live log streaming (tail -f) |
| `exec_pod_shell`, `exec_pod_stdin`, `exec_pod_stop` | commands/exec | Interactive pod shell (native kube-rs exec) |
| `start_port_forward`, `stop_port_forward`, `list_port_forwards` | commands/port_forward | Port forwarding management |
| `get_yaml` | commands/yaml | Get resource YAML (supports all resources via discovery) |
| `apply_yaml` | commands/yaml | Apply YAML via `kubectl apply -f -` subprocess (stdin pipe) |
| `describe_resource` | commands/describe | kubectl describe equivalent |
| `delete_resource` | commands/delete | Delete with grace-period + force options |
| `get_events` | commands/events | Events filtered by resource (server-side field selector) |
| `rollout_action` | commands/rollout | Restart / undo / pause / resume rollout |
| `discover_resources` | commands/discovery | Query cluster API discovery for all resource types |
| `list_resource` | commands/discovery | List arbitrary resource by group/version/kind |
| `start_watchers`, `stop_watchers` | lib.rs (inline) | Watch lifecycle for live resource updates |

### Rust — Key Patterns

- **Client creation:** `kube::client::make_client(context)` in `kube/client.rs` -> `Kubeconfig::read_from` -> custom merge -> `Client::try_from`
- **Resource listing:** `Api::<T>::all(client).list(...)` or `Api::<T>::namespaced(client, &ns).list(...)` via `kube/pods.rs`, `kube/nodes.rs`, `kube/resources.rs`
- **YAML apply:** `kubectl apply -f -` via tokio subprocess with stdin pipe (the only kubectl dependency left)
- **Exec:** Native kube-rs WebSocket (`kube/exec.rs`) — no more `kubectl exec` subprocess
- **Port forward:** Native kube-rs portforward API via WebSocket (`kube/port_forward.rs`)
- **Age formatting:** `fmt_age()` helper converts timestamps to human-readable
- **App state:** Managed via `tauri::State` — `WatcherManager`, `PortForwardManager`, `LogStreamManager` behind `Mutex` + `CancellationToken`

### Frontend — State Management (Zustand stores)

| Store | Purpose |
|-------|---------|
| `useClustersStore` | Cluster list, active context, kubeconfig paths |
| `useDataStore` | Cached resource data (pods, deployments, etc.) |
| `useNavigationStore` | Sidebar selection, open tabs, active resource |

### Frontend — API Bridge (`api/`)

All Tauri commands are wrapped as async JS functions per domain. Key pattern:
- `invoke("command_name", { param: value })` from `@tauri-apps/api/core`
- `k8sInvoke` helper in `resources.js` passes `context` to every k8s command
- Resource updates use `listen("resource-update", callback)` from `@tauri-apps/api/event` which returns an `unlisten` function
- Exec uses `listen("shell-output", callback)` for terminal I/O

### Frontend — Components (`features/`)

Components are grouped by feature domain under `features/`:
- **layout/** — App shell (Sidebar, TopBar, StatusBar, ClusterDropdown, ShortcutsModal)
- **resource-list/** — Table view for any resource type
- **detail-view/** — Tabbed detail pane (Info, Logs, YAML, Events, Describe, Graph, Shell)
- **command-palette/** — Cmd+K search/navigation
- **port-forward/** — Port forward management panel

Shared UI primitives live in `components/ui/` (Dropdown, FieldRow, Pill, Spinner, StatusDot, Toast).

## Key Conventions

1. **All k8s API via kube-rs** — `kube::Api`, `kube::Client`, `k8s_openapi` types. No `kubectl` subprocess except YAML apply (`apply_yaml`).
2. **`#[tauri::command]` in commands/** — each handler module owns its command function(s). `lib.rs` imports and registers them in `generate_handler![]`.
3. **Frontend: functional components + Tailwind CSS** — no class components, minimal custom CSS.
4. **All commands return `Result<T, String>`** — errors propagate to frontend as promise rejections.
5. **Zustand for state** — useClustersStore, useDataStore, useNavigationStore. Avoid prop drilling.
6. **Watch-based real-time updates** — `start_watchers`/`stop_watchers` via `watchers.rs`.

## Development

```bash
npm install                           # Install JS deps
cargo install tauri-cli               # Install Tauri CLI (once)
npm run dev                           # Vite dev server (port 1420)
npm run tauri dev                     # Full Tauri dev with hot-reload
npm run tauri build                   # Production build
```

Tauri dev requires: `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf` on Linux.

## Backlog

The project backlog is at `BACKLOG.md` in the repo root. **All backlog items are implemented as of 2026-07-10** — F1–F10, UX1–UX7, B1–B5, S1–S2, A1–A3 are complete.

## Auth (for agent use)

GitHub operations use the **hermes-do1** GitHub App token:
- `gh-app --repo htekgulds/k11s <gh args>` — for API calls
- `git-app --repo htekgulds/k11s <git args>` — for git ops (HTTPS remote required for push)
- Remote fetch is `git@github.com:htekgulds/k11s.git` (SSH)
- Remote push needs to be switched to `https://github.com/htekgulds/k11s.git` before `git-app`
