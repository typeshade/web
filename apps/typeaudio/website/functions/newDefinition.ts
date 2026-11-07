import type { FunctionGraphDocument } from "typeaudio/function-graph";
import { freshFunctionId } from "./instanceOperations.ts";

/** A normal source file and explicit port metadata, both saved in the same engine document. */
export function newFunctionDefinition(graph: FunctionGraphDocument) {
  const id = freshFunctionId("function"),
    module = `/${id}.shade.ts`;
  return {
    ...graph,
    modules: {
      ...graph.modules,
      [module]:
        '"use typeshade";\n\nexport class State { memory: f32 = 0; }\nexport function createState(): State { return new State(); }\n\nexport function process(state: inout<State>, time: f32, sampleRate: f32, input: f32, amount: f32): f32 {\n  return input * amount;\n}\n',
    },
    definitions: [
      ...graph.definitions,
      {
        id,
        version: 1,
        module,
        export: "process",
        context: { time: "time" as const, sampleRate: "sampleRate" as const },
        state: { parameter: "state", initializer: "createState", version: 1 },
        inputs: {
          input: {
            id: "signal",
            role: "audio" as const,
            rate: "sample" as const,
            unit: "amplitude",
            default: 0,
          },
          amount: {
            id: "amount",
            role: "control" as const,
            rate: "block" as const,
            default: 1,
          },
        },
        output: {
          id: "out",
          role: "audio" as const,
          rate: "sample" as const,
          unit: "amplitude",
        },
      },
    ],
    nodes: [...graph.nodes, { id, definition: id, inputs: {} }],
  };
}
