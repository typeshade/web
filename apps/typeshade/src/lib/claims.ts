// The measured claims /llms.txt states, each with the file that backs it.
import { facts } from './examples.ts';
import { links, type Destination } from './links.ts';

export interface Claim {
  readonly text: string;
  readonly source: Destination;
}

export const claims: readonly Claim[] = [
  {
    text: `${facts.shadeRenderable} of the ${facts.shadeExamples} examples emit WGSL and ${facts.glslTarget} from one source.`,
    source: links.examplesDir,
  },
  {
    text: `${facts.testFiles} test files.`,
    source: {
      label: `every *.test.ts in the tree at ${facts.pinnedCommit}`,
      href: links.commit.href,
    },
  },
  {
    text: `${facts.runtimeDeps} runtime dependency, ${facts.runtimeDepNames.join(', ')}, which the main entry's compile() and the language service both need.`,
    source: links.packageJson,
  },
  {
    text: `On every push, Tint compiles every WGSL emit and a real WebGL2 context links every renderable example's ${facts.glslTarget}.`,
    source: links.compileGate,
  },
  { text: 'A CPU oracle executes the same source in double precision.', source: links.oracle },
];
