import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // App bleibt auch ohne Service Worker normal nutzbar.
    });

    // Wenn ein neuer SW aktiviert wird (Update), Seite automatisch neu laden.
    // hadController stellt sicher dass nur bei Updates neu geladen wird,
    // nicht beim allerersten Öffnen der App.
    let hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hadController) window.location.reload();
      hadController = true;
    });
  });
}
