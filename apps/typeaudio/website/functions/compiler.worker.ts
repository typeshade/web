import {
  compileFunctionGraph,
  synchronizeFunctionInputs,
  FunctionCompileError,
} from "typeaudio/function-graph/compiler";

self.onmessage = ({ data }) => {
  try {
    self.postMessage({
      id: data.id,
      program: compileFunctionGraph(
        data.synchronize
          ? synchronizeFunctionInputs(data.document)
          : data.document,
      ),
    });
  } catch (error) {
    self.postMessage({
      id: data.id,
      error: String(error),
      problems: error instanceof FunctionCompileError ? error.diagnostics : [],
    });
  }
};
