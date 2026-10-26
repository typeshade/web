import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const name = process.argv[2];
if (!['typecv', 'typenn'].includes(name)) throw new Error('Choose typecv or typenn.');
const cwd = fileURLToPath(new URL(`../sources/${name}/`, import.meta.url));
execFileSync('npm', ['ci'], { cwd, stdio: 'inherit' });
execFileSync('npm', ['run', 'build'], { cwd, stdio: 'inherit' });
