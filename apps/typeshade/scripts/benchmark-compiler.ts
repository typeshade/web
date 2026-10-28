import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
/** Always extract the committed tree, including when a prior local check populated the cache. */
export function benchmarkCompiler(revision: string) {
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('An exact compiler commit is required');
  try {
    execFileSync('git', ['-C', 'vendor/shader-dsl', 'cat-file', '-e', `${revision}^{tree}`], {
      stdio: 'ignore',
    });
  } catch {
    // A CI submodule checkout can omit the earlier baseline's history.
    execFileSync('git', ['-C', 'vendor/shader-dsl', 'fetch', '--no-tags', 'origin', revision], {
      stdio: 'pipe',
    });
  }
  const root = path.resolve('.cache/benchmark-builds', revision);
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  const archive = execFileSync('git', ['-C', 'vendor/shader-dsl', 'archive', revision], {
    maxBuffer: 64e6,
  });
  execFileSync('tar', ['-x', '-C', root], { input: archive });
  symlinkSync(path.resolve('node_modules'), path.join(root, 'node_modules'), 'dir');
  return { root, load: (s: string) => import(pathToFileURL(path.join(root, s)).href) };
}
