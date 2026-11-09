import { type Patch } from "../../sound/types.ts";
export interface SavedSound {
  name: string;
  patch: Patch;
}
export type Notice = (message: string) => void;
