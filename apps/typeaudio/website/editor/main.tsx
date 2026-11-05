import { createRoot } from "react-dom/client";
import "../docs.css";
import "./workspace.css";
import { App } from "./App.tsx";
import { InteractionProvider } from "./interactions.tsx";
import { LayoutProvider } from "./layout.tsx";
createRoot(document.getElementById("root")!).render(
  <InteractionProvider>
    <LayoutProvider>
      <App />
    </LayoutProvider>
  </InteractionProvider>,
);
