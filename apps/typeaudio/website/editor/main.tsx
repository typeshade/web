import { createRoot } from "react-dom/client";
import "../docs.css";
import "./styles/index.css";
import { StudioApp } from "./pages/StudioApp.tsx";
import { InteractionProvider } from "./providers/InteractionProvider.tsx";
import { LayoutProvider } from "./providers/LayoutProvider.tsx";
createRoot(document.getElementById("root")!).render(
  <InteractionProvider>
    <LayoutProvider>
      <StudioApp />
    </LayoutProvider>
  </InteractionProvider>,
);
