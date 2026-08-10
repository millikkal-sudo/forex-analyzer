import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

/* The dashboard's journal talks to a small async key/value API. Inside Claude's
   artifact sandbox that is provided for you; everywhere else, back it with
   localStorage so entries survive a reload. */
if (typeof window !== "undefined" && !window.storage) {
  const ok = (() => {
    try { localStorage.setItem("__probe", "1"); localStorage.removeItem("__probe"); return true; }
    catch { return false; }
  })();
  const mem = new Map();
  const get = (k) => (ok ? localStorage.getItem(k) : mem.has(k) ? mem.get(k) : null);
  const put = (k, v) => (ok ? localStorage.setItem(k, v) : mem.set(k, v));
  window.storage = {
    async get(key) { const value = get(key); if (value == null) throw new Error("not found"); return { key, value, shared: false }; },
    async set(key, value) { put(key, value); return { key, value, shared: false }; },
    async delete(key) { ok ? localStorage.removeItem(key) : mem.delete(key); return { key, deleted: true, shared: false }; },
    async list(prefix = "") {
      const keys = ok ? Object.keys(localStorage) : [...mem.keys()];
      return { keys: keys.filter((k) => k.startsWith(prefix)), prefix, shared: false };
    },
  };
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
