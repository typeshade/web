import { compileGraph } from "./compiler.ts";
self.onmessage = ({ data }) => {
  try {
    self.postMessage({ id: data.id, program: compileGraph(data.graph) });
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error) });
  }
};
