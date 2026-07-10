# k11s — Tauri Kubernetes Viewer

Tauri v2 app (Rust backend + React frontend) for viewing Kubernetes clusters.

## Tech Stack

- **Backend:** Rust (kube 0.98, k8s-openapi 0.24 w/ v1.31, tokio, serde, serde_yaml, tauri v2)
- **Frontend:** React 18 + Vite + TailwindCSS + lucide-react icons + react-hotkeys-hook
- **k8s client:** `kube` crate (kubeconfig merge, watch, list, logs, apply via kubectl subprocess)
- **Build:** `npm run tauri` (dev), `npm run tauri build` (release)

## Project Structure

```
k11s/
├── src/                        # React frontend
│   ├── main.jsx                # Entry point
│   ├── App.jsx                 # Root component
│   ├── App.css                 # Global styles
│   ├── kubeview/
│   │   ├── KubeClient.jsx      # K8s API context provider
│   │   ├── api.js              # Tauri invoke wrappers
│   │   ├── constants.jsx       # Resource type constants
│   │   ├── theme.jsx           # Theming
│   │   ├── components/         # React components
│   │   ├── utils/              # Utility functions
│   │   └── *.css
├── src-tauri/                  # Rust backend
│   └── src/
│       ├── main.rs             # Binary entry
│       ├── lib.rs              # Tauri commands, module declarations
│       ├── k8s.rs              # k8s API: list resources, get logs, get yaml, apply yaml
│       ├── clusters.rs         # Multi-kubeconfig merging, cluster inference, config persistence
│       └── watchers.rs         # Watch-based real-time resource updates via Tauri events
├── package.json                # npm deps & scripts
├── vite.config.js              # Vite config (port 1420, strict port, Tauri dev server)
├── tailwind.config.js
└── postcss.config.js
```

## Architecture

### Rust — Tauri Commands (in `lib.rs`)

All Tauri commands are async functions annotated with `#[tauri::command]`. They take an optional `context: Option<String>` parameter for targeting a specific kubeconfig context.

| Command | File | Description |
|---------|------|-------------|
| `list_clusters` | clusters.rs | List merged kubeconfig contexts |
| `cluster_health` | k8s.rs | Verify API server is reachable |
| `list_nodes`, `list_pods`, `list_deployments`, `list_statefulsets`, `list_services`, `list_ingresses`, `list_configmaps`, `list_secrets`, `list_persistentvolumeclaims` | k8s.rs | List k8s resources |
| `get_pod_logs` | k8s.rs | Stream pod logs |
| `get_yaml` | k8s.rs | Get resource YAML (supports 9 resource kinds, optional `omit_managed_fields`) |
| `get_events` | k8s.rs | List events filtered by resource |
| `apply_yaml` | k8s.rs | Apply YAML via kubectl subprocess (stdin pipe) |
| `add_kubeconfig_files`, `add_kubeconfig_folder` | clusters.rs | Add custom kubeconfig paths |

Key pattern: each resource has a `*Info` struct (Serialize) and a `*_to_info()` converter. New kinds need:
1. `*Info` struct in `k8s.rs`
2. `list_*()` / `get_yaml()` match arm
3. `*_to_info()` converter
4. Frontend API call + component

### `k8s.rs` — Core patterns

- **Client creation:** `make_client(context)` -> `Kubeconfig::read_from` -> custom merge -> `Client::try_from`
- **Resource listing:** `Api::<T>::all(client).list(...)` or `Api::<T>::namespaced(client, &ns).list(...)`
- **YAML get:** match on `kind` string -> `Api::<T>::namespaced(client, &ns).get(&name)` -> `serde_yaml::to_string`
- **YAML apply:** `kubectl apply -f -` via tokio subprocess with stdin pipe (NOT kube crate)
- **Age formatting:** `fmt_age()` helper converts timestamps to human-readable

### `clusters.rs` — Multi-kubeconfig

- Config stored at `~/.config/k11s/config.json` (or `$K11S_CONFIG`)
- Merges default kubeconfig + custom paths
- Context deduplication on add
- Inferred labels: env (prod/staging/dev), provider (eks/gke/kind/aks/k8s), region

### `watchers.rs` — Real-time updates

Watch-based streaming of k8s resource changes, emitted as `resource-update` Tauri events. Used by the UI for live updates.

### Frontend — React Components (in `src/kubeview/components/`)

| Component | Purpose |
|-----------|---------|
| `Sidebar.jsx` | Resource type navigation + cluster selector |
| `TopBar.jsx` | Header with cluster info + actions |
| `StatusBar.jsx` | Connection status indicator |
| `ClusterDropdown.jsx` | Cluster context picker |
| `ClustersTab.jsx` | Cluster management view |
| `ResourceListTab.jsx` | Table view for any resource type |
| `DetailView.jsx` | Resource detail pane |
| `DetailTabs.jsx` | Tab container for detail sub-views |
| `DetailHeader.jsx` | Resource name/namespace/age header |
| `InfoTab.jsx` | General resource info |
| `EventsTab.jsx` | Related events |
| `LogsTab.jsx` | Pod logs viewer |
| `YamlTab.jsx` | YAML viewer/editor with save/apply |
| `GraphTab.jsx` | Topology graph |
| `GraphView.jsx` | Graph canvas |
| `CommandPalette.jsx` | Cmd+K palette for search/navigation |
| `Sidebar.jsx` | Left sidebar |

### Frontend — API Bridge (`api.js`)

All Tauri commands are wrapped as async JS functions. Key pattern: `invoke("command_name", { param: value })`. The `k8sInvoke` helper passes `context` to every k8s command. Resource updates use `listen("resource-update", callback)` which returns an `unlisten` function.

### Frontend — Resource type constants (`constants.jsx`)

Defines which k8s resource types are supported, how they map to display names, and their API behavior.

## Resource type coverage

Currently supports fetching YAML for: Pod, Deployment, StatefulSet, Service, Ingress, ConfigMap, Secret, PersistentVolumeClaim, Node.

The `get_yaml` command uses a match on the `kind` string. Add new kinds by:
1. Adding k8s-openapi import
2. Adding match arm in `get_yaml()` in `k8s.rs`
3. Adding `*Info` struct + `*_to_info()` if listing is also needed
4. Adding frontend constant + component support

## Development

```bash
npm install                           # Install JS deps
cargo install tauri-cli               # Install Tauri CLI (once)
npm run dev                           # Vite dev server (port 1420)
npm run tauri dev                     # Full Tauri dev with hot-reload
npm run tauri build                   # Production build
```

Tauri dev: requires `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf` on Linux.

Conventions:
- Use `kube` crate for API operations (list, get, watch, logs) — it handles auth, caching, pagination
- Use `kubectl apply -f -` subprocess for YAML apply — not the kube crate
- Frontend: functional components with hooks, Tailwind classes
- All Tauri commands return `Result<T, String>` — errors propagate to frontend as rejections
- Use `#[tauri::command]` in `lib.rs`, register in the builder

## Backlog

The project backlog is at `BACKLOG.md` in the repo root — categorized into Features (F1-F10), UX improvements (UX1-UX7), Bugs (B1-B5), Security (S1-S2), and Architecture (A1-A3). Feature work should reference backlog IDs.

## Auth (for agent use)

GitHub operations use the **hermes-do1** GitHub App token:
- `gh-app --repo htekgulds/k11s <gh args>` — for API calls
- `git-app --repo htekgulds/k11s <git args>` — for git ops (HTTPS remote required for push)
- Remote fetch is `git@github.com:htekgulds/k11s.git` (SSH)
- Remote push needs to be switched to `https://github.com/htekgulds/k11s.git` before `git-app`
