import { createRoot } from "react-dom/client";
import "../docs.css";
import "./workspace.css";
import { App } from "./App.tsx";
createRoot(document.getElementById("root")!).render(<App />);
