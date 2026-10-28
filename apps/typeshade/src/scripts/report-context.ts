// What a page hands the issue dialog (src/scripts/issue-dialog.ts) besides its address: the
// Playground registers its program here, so a report from a page that holds one takes the
// program along the way Share carries it.

/** The Playground's program, as its link carries it. */
export interface ReportProgram {
  /** The page the program opens on, a path on the site. */
  readonly page: string;
  /** The fragment Share writes: `code=`, the options, and the files beside the main one. */
  readonly fragment: string;
  /** The name the Playground gives the file it runs first. */
  readonly file: string;
}

let provider: (() => Promise<ReportProgram | undefined>) | undefined;

/** Called by the Playground once it runs. */
export function provideProgram(read: () => Promise<ReportProgram | undefined>): void {
  provider = read;
}

/** The program the page holds now, or undefined on a page with no Playground. */
export const currentProgram = (): Promise<ReportProgram | undefined> =>
  provider ? provider().catch(() => undefined) : Promise.resolve(undefined);
