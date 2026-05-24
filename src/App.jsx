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
      <div className="p-8">
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] mb-6" style={{ color: "var(--text-muted)" }}>
          {title}
        </h2>
        {loading && <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading...</p>}
        {error && (
          <p className="text-sm px-4 py-2.5 rounded mb-6" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
            {error}
          </p>
        )}
        {!loading && data.length === 0 && !error && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No {title.toLowerCase()} found.</p>
        )}
        {data.length > 0 && (
          <table className="data-table w-full border-collapse text-sm rounded-lg overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" }}>
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
      <td className="font-medium">{n.name}</td>
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
      <td className="font-medium">{p.name}</td>
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
      <td className="font-medium">{d.name}</td>
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
      <td className="font-medium">{s.name}</td>
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
      <td className="font-medium">{s.name}</td>
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
      <td className="font-medium">{i.name}</td>
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

const sidebarBtn = "w-full text-left px-4 py-2 text-sm rounded-md transition-all duration-100";
const sidebarBtnIdle = "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60";
const sidebarBtnActive = "text-zinc-100 bg-zinc-800";

function App() {
  const [page, setPage] = useState("nodes");
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true;
  });
  const Cmp = pages[page].cmp;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-52 flex flex-col bg-zinc-950 border-r border-zinc-800 flex-shrink-0">
        <div className="px-5 pt-6 pb-4 border-b border-zinc-800">
          <h1 className="text-zinc-100 text-base font-bold tracking-wider">k11s</h1>
        </div>

        <nav className="flex flex-col gap-0.5 p-3 flex-1">
          {Object.entries(pages).map(([key, { label }]) => (
            <button
              key={key}
              className={`${sidebarBtn} ${page === key ? sidebarBtnActive : sidebarBtnIdle}`}
              onClick={() => setPage(key)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-zinc-800">
          <button
            className="w-full text-left px-4 py-2 text-xs rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-all duration-100"
            onClick={() => setDark((d) => !d)}
          >
            {dark ? "light" : "dark"}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <Cmp />
      </main>
    </div>
  );
}

export default App;
