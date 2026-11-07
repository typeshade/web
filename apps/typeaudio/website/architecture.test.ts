import { describe, expect, it } from "vitest";
import { inspectModule } from "../scripts/editor-architecture.mjs";
describe("editor architecture boundaries", () => {
  it("allows typed feature contracts but rejects upward runtime UI dependencies", () => {
    const file = "/app/website/editor/components/atoms/Button.tsx";
    expect(
      inspectModule(
        file,
        'import type {Editor} from "../../useEditor.ts"; export function Button(){return <button/>;}',
      ).errors,
    ).toEqual([]);
    expect(
      inspectModule(
        file,
        'import {Panel} from "../molecules/Panel.tsx"; export function Button(){return <Panel/>;}',
      ).errors.join(),
    ).toMatch(/point down/);
    expect(
      inspectModule(
        file,
        'import {useSoundSession} from "../../hooks/sound/useSoundSession.ts"; export function Button(){return <button/>;}',
      ).errors.join(),
    ).toMatch(/through props/);
  });
  it("rejects mixed component files, UI resource ownership and domain-to-UI imports", () => {
    expect(
      inspectModule(
        "/app/website/editor/hooks/graph/useGraphEditor.ts",
        'import {compileGraph} from "typeaudio/graph/compiler";',
      ).errors.join(),
    ).toMatch(/belongs in its worker/);
    expect(
      inspectModule(
        "/app/website/editor/components/atoms/Button.tsx",
        "export function Button(){return <button/>;} export function Label(){return <span/>;}",
      ).errors.join(),
    ).toMatch(/exactly one/);
    expect(
      inspectModule(
        "/app/website/editor/pages/StudioPage.tsx",
        "export function StudioPage(){const audio=new AudioContext();return <main/>;}",
      ).errors.join(),
    ).toMatch(/construct audio/);
    expect(
      inspectModule(
        "/app/website/editor/state/document.ts",
        'import {Panel} from "../components/molecules/Panel.tsx";',
      ).errors.join(),
    ).toMatch(/Document state/);
    expect(
      inspectModule(
        "/app/website/sound/validatePatch.ts",
        'import {useEditor} from "../editor/useEditor.ts";',
      ).errors.join(),
    ).toMatch(/Audio domains/);
  });
});
