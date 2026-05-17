import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function createPage(title, cmd, cols, renderRow) {
  return function () {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
      setLoading(true);
      setError(null);
      invoke(cmd)
        .then(setData)
        .catch(setError)
        .finally(() => setLoading(false));
    }, []);

    return (
      <div className="page">
        <h2>{title}</h2>
        {loading && <p className="loading">Loading...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && data.length === 0 && !error && <p className="empty">No {title.toLowerCase()} found.</p>}
        {data.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>{data.map(renderRow)}</tbody>
          </table>
        )}
      </div>
    );
  };
}

const NodesPage = createPage(
  "Nodes",
  "list_nodes",
  ["Name", "Status", "Role", "Kubelet", "OS Image", "CPU", "Memory"],
  (n) => (
    <tr key={n.name}>
      <td>{n.name}</td>
      <td><span className={`badge badge-${n.status.toLowerCase()}`}>{n.status}</span></td>
      <td>{n.role}</td>
      <td>{n.kubelet_version}</td>
      <td>{n.os_image}</td>
      <td>{n.cpu}</td>
      <td>{n.memory}</td>
    </tr>
  )
);

const PodsPage = createPage(
  "Pods",
  "list_pods",
  ["Name", "Namespace", "Status", "Node", "Containers", "Age"],
  (p) => (
    <tr key={`${p.namespace}/${p.name}`}>
      <td>{p.name}</td>
      <td>{p.namespace}</td>
      <td><span className={`badge badge-${p.status.toLowerCase()}`}>{p.status}</span></td>
      <td>{p.node}</td>
      <td>{p.containers}</td>
      <td>{p.age}</td>
    </tr>
  )
);

const DeploymentsPage = createPage(
  "Deployments",
  "list_deployments",
  ["Name", "Namespace", "Desired", "Ready", "Up-to-Date", "Available", "Age"],
  (d) => (
    <tr key={`${d.namespace}/${d.name}`}>
      <td>{d.name}</td>
      <td>{d.namespace}</td>
      <td>{d.desired}</td>
      <td>{d.ready}</td>
      <td>{d.up_to_date}</td>
      <td>{d.available}</td>
      <td>{d.age}</td>
    </tr>
  )
);

const StatefulSetsPage = createPage(
  "StatefulSets",
  "list_statefulsets",
  ["Name", "Namespace", "Ready", "Desired", "Age"],
  (s) => (
    <tr key={`${s.namespace}/${s.name}`}>
      <td>{s.name}</td>
      <td>{s.namespace}</td>
      <td>{s.ready}</td>
      <td>{s.desired}</td>
      <td>{s.age}</td>
    </tr>
  )
);

const ServicesPage = createPage(
  "Services",
  "list_services",
  ["Name", "Namespace", "Type", "Cluster IP", "Ports", "Age"],
  (s) => (
    <tr key={`${s.namespace}/${s.name}`}>
      <td>{s.name}</td>
      <td>{s.namespace}</td>
      <td><span className="badge badge-svc">{s.service_type}</span></td>
      <td>{s.cluster_ip}</td>
      <td>{s.ports}</td>
      <td>{s.age}</td>
    </tr>
  )
);

const IngressesPage = createPage(
  "Ingresses",
  "list_ingresses",
  ["Name", "Namespace", "Hosts", "Age"],
  (i) => (
    <tr key={`${i.namespace}/${i.name}`}>
      <td>{i.name}</td>
      <td>{i.namespace}</td>
      <td>{i.hosts}</td>
      <td>{i.age}</td>
    </tr>
  )
);

const pages = {
  nodes: { label: "Nodes", cmp: NodesPage },
  pods: { label: "Pods", cmp: PodsPage },
  deployments: { label: "Deployments", cmp: DeploymentsPage },
  statefulsets: { label: "StatefulSets", cmp: StatefulSetsPage },
  services: { label: "Services", cmp: ServicesPage },
  ingresses: { label: "Ingresses", cmp: IngressesPage },
};

function App() {
  const [page, setPage] = useState("nodes");
  const Cmp = pages[page].cmp;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <h1 className="sidebar-title">k10s</h1>
        <nav>
          {Object.entries(pages).map(([key, { label }]) => (
            <button
              key={key}
              className={page === key ? "menu-active" : ""}
              onClick={() => setPage(key)}
            >
              {label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="content">
        <Cmp />
      </main>
    </div>
  );
}

export default App;
