import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [greeting, setGreeting] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    setGreeting(await invoke("greet", { name }));
  }

  return (
    <main className="app">
      <h1>Simplex PDF</h1>
      <p>Fast, lightweight PDF viewer and editor.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <button type="submit">Greet</button>
      </form>
      <p>{greeting}</p>
    </main>
  );
}

export default App;
