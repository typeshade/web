import { useContext } from "react";
import { Context } from "../../layout/context.ts";
export function useWorkspaceLayout() {
  const value = useContext(Context);
  if (!value) throw new Error("Layout provider is missing.");
  return value;
}
