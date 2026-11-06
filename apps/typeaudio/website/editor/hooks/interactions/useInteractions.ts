import { useContext } from "react";
import { Context } from "../../interactions/context.ts";
export function useInteractions() {
  const value = useContext(Context);
  if (!value) throw new Error("Interactions provider is missing.");
  return value;
}
