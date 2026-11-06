import { checkEditorArchitecture } from "./editor-architecture.mjs";
const result = checkEditorArchitecture(process.cwd());
if (result.errors.length) {
  process.stderr.write(result.errors.join("\n") + "\n");
  process.exitCode = 1;
} else
  process.stdout.write(
    `Editor architecture passed (${result.files} modules): one component per file, downward UI dependencies, separate document/resource ownership and no runtime import cycles.\n`,
  );
