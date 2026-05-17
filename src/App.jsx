import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function NodesPage() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchNodes() {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke("list_nodes");
      setNodes(result);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="nodes-page">
      <h2>Kubernetes Nodes</h2>
      <button onClick={fetchNodes} disabled={loading}>
        {loading ? "Loading..." : "List Nodes"}
      </button>

      {error && <p className="error">{error}</p>}

      {nodes.length > 0 && (
        <table className="nodes-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Role</th>
              <th>Kubelet Version</th>
              <th>OS Image</th>
              <th>CPU</th>
              <th>Memory</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((node) => (
              <tr key={node.name}>
                <td>{node.name}</td>
                <td>
                  <span className={`status-badge status-${node.status.toLowerCase()}`}>
                    {node.status}
                  </span>
                </td>
                <td>{node.role}</td>
                <td>{node.kubelet_version}</td>
                <td>{node.os_image}</td>
                <td>{node.cpu}</td>
                <td>{node.memory}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function HomePage({ greetMsg, name, setName, handleGreet }) {
  return (
    <>
      <h1>Welcome to Tauri + React</h1>
      <div className="row">
        <a href="https://vite.dev" target="_blank">
          <img src="/vite.svg" className="logo vite" alt="Vite logo" />
        </a>
        <a href="https://tauri.app" target="_blank">
          <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <p>Click on the Tauri, Vite, and React logos to learn more.</p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          handleGreet();
        }}
      >
        <input
          id="greet-input"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <button type="submit">Greet</button>
      </form>
      <p>{greetMsg}</p>
    </>
  );
}

function App() {
  const [page, setPage] = useState("home");
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function handleGreet() {
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="container">
      <nav className="nav-bar">
        <button
          className={page === "home" ? "nav-active" : ""}
          onClick={() => setPage("home")}
        >
          Home
        </button>
        <button
          className={page === "nodes" ? "nav-active" : ""}
          onClick={() => setPage("nodes")}
        >
          Nodes
        </button>
      </nav>

      {page === "home" && (
        <HomePage
          greetMsg={greetMsg}
          name={name}
          setName={setName}
          handleGreet={handleGreet}
        />
      )}
      {page === "nodes" && <NodesPage />}
    </main>
  );
}

export default App;
