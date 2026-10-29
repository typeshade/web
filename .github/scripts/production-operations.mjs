import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const repository = 'typeshade/web';
const operationsVariable = 'WEBSITE_OPERATIONS_ENABLED';
const activeStatuses = ['queued', 'in_progress', 'pending', 'waiting', 'requested'];
const legacyWorkflows = [
  { repo: 'typeshade/typenn', id: 382766995, path: '.github/workflows/deploy.yml' },
  { repo: 'typeshade/typecv', id: 386416073, path: '.github/workflows/deploy.yml' },
  { repo: 'typeshade/typecv', id: 390754667, path: '.github/workflows/lab-samples.yml' },
  { repo: 'typeshade/typeshade.github.io', id: 352654369, path: '.github/workflows/deploy.yml' },
  { repo: 'typeshade/typeshade.github.io', id: 368892981, path: '.github/workflows/publish-examples.yml' },
  { repo: 'typeshade/typeshade.github.io', id: 375187649, path: '.github/workflows/gallery-setup.yml' },
  { repo: 'typeshade/typeshade.github.io', id: 364776021, path: '.github/workflows/pin-compiler.yml' },
];

class ApiError extends Error {
  constructor(status) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}

async function fetchRequest({ method, url, token, body }) {
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error('GitHub API request failed; retry after checking network availability.');
  }
  if (!response.ok) throw new ApiError(response.status);
  if (response.status === 204) return null;
  try {
    return await response.json();
  } catch {
    throw new Error('GitHub API returned invalid JSON.');
  }
}

async function api(path, { method = 'GET', token, body, allowNotFound = false, request = fetchRequest } = {}) {
  const url = `https://api.github.com/repos/${path}`;
  try {
    return await request({ method, url, token, body });
  } catch (error) {
    if (allowNotFound && error.status === 404) return null;
    if (error.status) throw new Error(`GitHub API request failed with HTTP ${error.status}.`);
    throw error;
  }
}

function enabledInput(value) {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  throw new Error('enabled must be true or false.');
}

async function requireNoActiveRuns(workflow, token, request) {
  for (const status of activeStatuses) {
    const data = await api(
      `${workflow.repo}/actions/workflows/${workflow.id}/runs?status=${status}&per_page=1`,
      { token, request },
    );
    if (!Array.isArray(data?.workflow_runs)) {
      throw new Error(`Could not verify active runs for ${workflow.repo} workflow ${workflow.id}.`);
    }
    if (data.workflow_runs.length) {
      throw new Error(`${workflow.repo} workflow ${workflow.id} has a ${status} run; wait for it to finish before enabling operations.`);
    }
  }
}

export async function validate({
  env = process.env,
  request = fetchRequest,
} = {}) {
  if (env.GITHUB_REPOSITORY !== repository || env.GITHUB_REF !== 'refs/heads/main') {
    throw new Error('Run the production operations workflow on typeshade/web main.');
  }
  const enabled = enabledInput(env.ENABLED);
  const lines = ['# Production operations switch'];
  if (enabled) {
    if (!/^\d+$/.test(env.READINESS_RUN_ID ?? '')) {
      throw new Error('Provide readiness_run_id from a successful deployment-readiness run before enabling operations.');
    }
    if (!env.GITHUB_TOKEN) throw new Error('The built-in token is missing Actions read access.');
    if (!env.GITHUB_SHA) throw new Error('The current main commit SHA is missing.');

    const run = await api(`${repository}/actions/runs/${env.READINESS_RUN_ID}`, {
      token: env.GITHUB_TOKEN,
      request,
    });
    if (run?.status !== 'completed' || run?.conclusion !== 'success') {
      throw new Error('The readiness run must be completed successfully.');
    }
    if (run.event !== 'workflow_dispatch' || run.head_branch !== 'main' || run.head_sha !== env.GITHUB_SHA) {
      throw new Error('The readiness run must be a manual run on main for the current commit.');
    }
    if (!Number.isInteger(run.workflow_id)) throw new Error('The readiness run did not identify its workflow.');
    const readinessWorkflow = await api(`${repository}/actions/workflows/${run.workflow_id}`, {
      token: env.GITHUB_TOKEN,
      request,
    });
    if (readinessWorkflow?.path !== '.github/workflows/deployment-readiness.yml') {
      throw new Error('The readiness run must come from .github/workflows/deployment-readiness.yml.');
    }
    lines.push(`- Readiness run ${env.READINESS_RUN_ID}: successful for current main commit`);

    for (const workflow of legacyWorkflows) {
      const metadata = await api(`${workflow.repo}/actions/workflows/${workflow.id}`, { request });
      if (metadata?.path !== workflow.path) {
        throw new Error(`${workflow.repo} workflow ${workflow.id} no longer matches expected source path ${workflow.path}.`);
      }
      if (metadata.state !== 'deleted' && !metadata.state?.startsWith('disabled_')) {
        throw new Error(`${workflow.repo} workflow ${workflow.id} is still active; disable the old publisher before enabling operations.`);
      }
      await requireNoActiveRuns(workflow, undefined, request);
    }
    lines.push(`- Legacy publishers: ${legacyWorkflows.length} workflows are disabled or deleted with no active runs`);
  } else {
    lines.push('- Disable mode: readiness and legacy publisher state are not required for rollback.');
  }

  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, 'ready=true\n');
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
  return lines;
}

export async function switchOperations({
  env = process.env,
  request = fetchRequest,
} = {}) {
  if (env.GITHUB_REPOSITORY !== repository || env.GITHUB_REF !== 'refs/heads/main') {
    throw new Error('Run the production operations workflow on typeshade/web main.');
  }
  if (env.READINESS_VALIDATED !== 'true') throw new Error('Cutover validation did not pass; the switch was not changed.');
  if (!env.GH_TOKEN) throw new Error('DEPLOYMENT_ADMIN_TOKEN is missing. Add it as a repository Actions secret.');
  const value = enabledInput(env.ENABLED) ? 'true' : 'false';
  const path = `${repository}/actions/variables/${operationsVariable}`;
  const current = await api(path, { token: env.GH_TOKEN, allowNotFound: true, request });
  if (current?.value !== value) {
    if (current) {
      await api(path, { method: 'PATCH', token: env.GH_TOKEN, body: { name: operationsVariable, value }, request });
    } else {
      await api(`${repository}/actions/variables`, {
        method: 'POST',
        token: env.GH_TOKEN,
        body: { name: operationsVariable, value },
        request,
      });
    }
  }
  const verified = await api(path, { token: env.GH_TOKEN, request });
  if (verified?.value !== value) throw new Error(`Could not verify ${operationsVariable}=${value}.`);
  const line = `Production operations are ${value === 'true' ? 'enabled' : 'disabled'}. Pull request previews were not changed. No Worker, storage, or deployment operation was performed.`;
  console.log(line);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `# Production operations switch\n\n${line}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const action = process.argv[2];
  const work = action === 'validate' ? validate() : action === 'switch' ? switchOperations() : Promise.reject(new Error('Choose validate or switch.'));
  work.catch((error) => {
    console.error(error.message);
    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `# Production operations switch failed\n\n${error.message}\n`);
    }
    process.exitCode = 1;
  });
}
