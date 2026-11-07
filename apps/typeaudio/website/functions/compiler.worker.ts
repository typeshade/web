import {
  compileFunctionGraph,
  synchronizeFunctionInputs,
  FunctionCompileError,
  projectFunctionComposition,
  applyFunctionComposition,
  compositionIdentity,
  renameFunctionInput,
} from "typeaudio/function-graph/compiler";

self.onmessage = ({ data }) => {
  try {
    const request = data.composition;
    const document = request?.rename
      ? renameFunctionInput(
          data.document,
          request.rename.definition,
          request.rename.port,
          request.rename.name,
        )
      : data.document;
    let program = compileFunctionGraph(
      data.synchronize ? synchronizeFunctionInputs(document) : document,
    );
    let composition, compositionError;
    if (request?.mode === "apply" || request?.mode === "validate") {
      const result = applyFunctionComposition(program, request.source ?? "");
      if (
        request.mode === "validate" &&
        compositionIdentity(result.program) !== compositionIdentity(program)
      )
        throw new Error(
          "Saved composition does not match its applied graph. Open a matching project revision or restore the source draft.",
        );
      if (request.mode === "apply") program = result.program;
      composition = result.composition;
    } else if (request?.mode === "project") {
      try {
        composition = projectFunctionComposition(program, request.source);
      } catch (error) {
        if (request.source) throw error;
        compositionError = String(error);
      }
    }
    self.postMessage({
      id: data.id,
      program: { ...program, composition, compositionError },
    });
  } catch (error) {
    self.postMessage({
      id: data.id,
      error: String(error),
      problems: error instanceof FunctionCompileError ? error.diagnostics : [],
    });
  }
};
