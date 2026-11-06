import type {
  TypeshadeCompletionItem, TypeshadeDiagnostic, TypeshadeHover, TypeshadeLocation,
  TypeshadePosition, TypeshadeRange, TypeshadeSignatureHelp, TypeshadeTextEdit,
} from "typeshade/language-service";

export interface LanguageDocument {
  uri: string;
  text: string;
  version: number;
  mode: "sample" | "module";
}
export interface LanguageResults {
  completions: readonly TypeshadeCompletionItem[];
  diagnostics: readonly TypeshadeDiagnostic[];
  hover: TypeshadeHover | undefined;
  signature: TypeshadeSignatureHelp | undefined;
  definition: readonly TypeshadeLocation[];
  references: readonly TypeshadeLocation[];
  prepareRename: { range: TypeshadeRange; placeholder: string } | undefined;
  rename: Readonly<Record<string, readonly TypeshadeTextEdit[]>>;
}
export type LanguageMethod = keyof LanguageResults;
export interface LanguageRequest {
  id: number;
  method: LanguageMethod;
  document: LanguageDocument;
  position?: TypeshadePosition;
  newName?: string;
}
export interface LanguageReply {
  id: number;
  uri: string;
  version: number;
  result?: LanguageResults[LanguageMethod];
  error?: string;
}
