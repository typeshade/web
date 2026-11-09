import { pathToFileURL } from 'node:url';
import { environmentProblems } from './deployment-readiness.mjs';
const repository = 'typeshade/web';
const environment = 'typeaudio-production';
const legacy = 'repos/typeshade/typeaudio/actions/workflows/407704055';
const activeStatuses = ['queued', 'in_progress', 'pending', 'waiting', 'requested'];

export async function github(path, method = 'GET', body) {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) throw new Error('A GitHub token is required.');
  const response = await fetch(`https://api.github.com/${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'error', signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`GitHub ${method} ${path}: HTTP ${response.status}`);
  return response.status === 204 ? null : response.json();
}
async function environments(api) {
  const result = [];
  for (let page = 1; ; page++) {
    const data = await api(`repos/${repository}/environments?per_page=100&page=${page}`);
    if (!Array.isArray(data.environments)) throw new Error('Cannot read environments.');
    result.push(...data.environments);
    if (data.environments.length < 100) return result;
  }
}
async function policies(api) {
  const result = [];
  for (let page = 1; ; page++) {
    const data = await api(`repos/${repository}/environments/${environment}/deployment-branch-policies?per_page=100&page=${page}`);
    if (!Array.isArray(data.branch_policies)) throw new Error('Cannot read branch policies.');
    result.push(...data.branch_policies);
    if (data.branch_policies.length < 100) return result;
  }
}
async function legacyStatus(api, requireDisabled) {
  const workflow = await api(legacy);
  if (workflow.path !== '.github/workflows/deploy.yml' || workflow.id !== 407704055)
    throw new Error('Unexpected legacy publisher identity.');
  if (requireDisabled && workflow.state !== 'disabled_manually')
    throw new Error('The legacy TypeAudio publisher must be disabled.');
  for (const status of activeStatuses) {
    const runs = await api(`${legacy}/runs?status=${status}&per_page=1`);
    if (!Array.isArray(runs.workflow_runs) || runs.total_count !== 0 || runs.workflow_runs.length)
      throw new Error(`Legacy publisher has ${status} runs, or its run list cannot be verified.`);
  }
  return workflow.state;
}
export async function cutover(mode, api = github, env = process.env) {
  if (!['setup', 'verify'].includes(mode)) throw new Error('Choose setup or verify.');
  if (env.GITHUB_REPOSITORY !== repository || env.GITHUB_REF !== 'refs/heads/main')
    throw new Error('TypeAudio production cutover requires typeshade/web main.');
  let current = (await environments(api)).find(item => item.name === environment);
  if (mode === 'setup') {
    const legacyState = await legacyStatus(api, false);
    if (!current) {
      await api(`repos/${repository}/environments/${environment}`, 'PUT', {
        deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
      });
      current = (await environments(api)).find(item => item.name === environment);
    }
    if (!current?.deployment_branch_policy?.custom_branch_policies || current.deployment_branch_policy.protected_branches)
      throw new Error('Existing environment policy needs review; it will not be replaced.');
    const rules = await policies(api);
    if (!rules.length) await api(`repos/${repository}/environments/${environment}/deployment-branch-policies`, 'POST', { name: 'main', type: 'branch' });
    const problems = environmentProblems(current, await policies(api));
    if (problems.length) throw new Error(problems.join('; '));
    if (legacyState !== 'disabled_manually') await api(`${legacy}/disable`, 'PUT');
  }
  const problems = environmentProblems(current, current ? await policies(api) : []);
  if (problems.length) throw new Error(problems.join('; '));
  await legacyStatus(api, true);
  return { environment, legacyPublisher: 'disabled', activeRuns: 0 };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(await cutover(process.argv[2])));
}
