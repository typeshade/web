import { MAX_PROJECT_BYTES } from "../audio-asset.ts";
import { decodeProject } from "./decodeProject.ts";

/** Read and validate a chosen project file. Throws a reader-facing error; changes nothing. */
export async function readProjectFile(file: File): Promise<unknown> {
  if (file.size > MAX_PROJECT_BYTES)
    throw new Error(
      "Project files must be smaller than 40 MB, including embedded audio.",
    );
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error(`${file.name} is not a JSON project file.`);
  }
  decodeProject(data);
  return data;
}
