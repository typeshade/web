import assert from 'node:assert/strict';
import test from 'node:test';
import { switchOperations, validate } from './production-operations.mjs';

const repo = 'typeshade/web';
const sha = 'a'.repeat(40);
const readinessId = '40695653261';
const readinessWorkflowId = 123456789;
const oldWorkflows = [
  { repo: 'typeshade/typenn', id: 382766995, path: '.github/workflows/deploy.yml' },
  { repo: 'typeshade/typecv', id: 386416073, path: '.github/workflows/deploy.yml' },
  { repo: 'typeshade/typecv', id: 390754667, path: '.github/workflows/lab-samples.yml' },
  { repo: 'typeshade/typeshade.github.io', id: 352654369, path: '.github/workflows/deploy.yml' },
  { repo: 'typeshade/typeshade.github.io', id: 368892981, path: '.github/workflows/publish-examples.yml' },
  { repo: 'typeshade/typeshade.github.io', id: 375187649, path: '.github/workflows/gallery-setup.yml' },
  { repo: 'typeshade/typeshade.github.io', id: 364776021, path: '.github/workflows/pin-compiler.yml' },
];

function fixture({ run = {}, oldState = 'disabled_manually', activeRun = null, variable = 'false' } = {}) {
  const requests = [];
  const values = {
    run: { status: 'completed', conclusion: 'success', event: 'workflow_dispatch', head_branch: 'main', head_sha: sha, workflow_id: readinessWorkflowId, ...run },
    variable,
  };
  const request = async ({ method, url, token, body }) => {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/^\/repos\//, '');
    requests.push({ method, path, query: parsed.searchParams, token, body });
    if (path === `${repo}/actions/runs/${readinessId}`) return values.run;
    if (path === `${repo}/actions/workflows/${readinessWorkflowId}`) return { path: '.github/workflows/deployment-readiness.yml' };
    for (const workflow of oldWorkflows) {
      if (path === `${workflow.repo}/actions/workflows/${workflow.id}`) {
        return { path: workflow.path, state: oldState };
      }
      const prefix = `${workflow.repo}/actions/workflows/${workflow.id}/runs`;
      if (path === prefix) {
        const status = parsed.searchParams.get('status');
        const runs = activeRun?.workflowId === workflow.id && activeRun.status === status
          ? [{ id: 99, status }]
          : [];
        return { total_count: runs.length, workflow_runs: runs };
      }
    }
    if (path === `${repo}/actions/variables/WEBSITE_OPERATIONS_ENABLED`) {
      if (method === 'GET') {
        if (values.variable === null) {
          const error = new Error('missing');
          error.status = 404;
          throw error;
        }
        return { name: 'WEBSITE_OPERATIONS_ENABLED', value: values.variable };
      }
      if (method === 'PATCH') {
        values.variable = body.value;
        return { name: body.name, value: body.value };
      }
    }
    if (path === `${repo}/actions/variables` && method === 'POST') {
      values.variable = body.value;
      return body;
    }
    throw new Error(`Unexpected mocked request ${method} ${path}`);
  };
  return { request, requests, values };
}

function enableEnv(overrides = {}) {
  return {
    GITHUB_REPOSITORY: repo,
    GITHUB_REF: 'refs/heads/main',
    GITHUB_SHA: sha,
    GITHUB_TOKEN: 'built-in-read-token',
    ENABLED: 'true',
    READINESS_RUN_ID: readinessId,
    GITHUB_OUTPUT: '',
    GITHUB_STEP_SUMMARY: '',
    ...overrides,
  };
}

test('enable validation accepts current successful readiness run and stopped legacy publishers', async () => {
  const gh = fixture();
  await validate({ env: enableEnv(), request: gh.request });
  assert.equal(gh.requests.filter((r) => r.path.includes('/actions/workflows/') && !r.path.endsWith('/runs')).length, 8);
  assert.ok(gh.requests.filter((r) => r.path.startsWith(`${repo}/`)).every((r) => r.token === 'built-in-read-token'));
  assert.ok(gh.requests.filter((r) => oldWorkflows.some((w) => r.path.startsWith(`${w.repo}/`))).every((r) => r.token === undefined));
});

test('enable accepts deleted legacy workflows but still checks every active run status', async () => {
  const gh = fixture({ oldState: 'deleted' });
  const lines = await validate({ env: enableEnv(), request: gh.request });
  assert.ok(lines.some((line) => line.includes('disabled or deleted')));
  assert.equal(gh.requests.filter((r) => r.path.endsWith('/runs')).length, 7 * 5);
  for (const status of ['queued', 'in_progress', 'pending', 'waiting', 'requested']) {
    const inflight = fixture({ oldState: 'deleted', activeRun: { workflowId: oldWorkflows[2].id, status } });
    await assert.rejects(validate({ env: enableEnv(), request: inflight.request }), new RegExp(`has a ${status} run`));
  }
});

test('deleted workflow metadata must match the expected path and be readable', async () => {
  for (const mode of ['wrong-path', 'not-found']) {
    const gh = fixture({ oldState: 'deleted' });
    const request = async (input) => {
      if (input.url.endsWith(`/actions/workflows/${oldWorkflows[0].id}`)) {
        if (mode === 'wrong-path') return { state: 'deleted', path: '.github/workflows/unrelated.yml' };
        const error = new Error('not found');
        error.status = 404;
        throw error;
      }
      return gh.request(input);
    };
    await assert.rejects(validate({ env: enableEnv(), request }),
      mode === 'wrong-path' ? /expected source path/ : /HTTP 404/);
  }
});

test('enable requires a successful readiness run for the exact workflow and current main SHA', async () => {
  const badRuns = [
    { conclusion: 'failure' },
    { status: 'in_progress', conclusion: null },
    { head_sha: 'b'.repeat(40) },
    { event: 'push' },
    { head_branch: 'cutover' },
  ];
  for (const run of badRuns) {
    const gh = fixture({ run });
    await assert.rejects(validate({ env: enableEnv(), request: gh.request }));
    assert.equal(gh.requests.some((r) => oldWorkflows.some((w) => r.path.startsWith(`${w.repo}/`))), false);
  }
  const wrongWorkflow = fixture();
  wrongWorkflow.request = async (input) => {
    if (input.url.endsWith(`/actions/workflows/${readinessWorkflowId}`)) return { path: '.github/workflows/other.yml' };
    return ghFallback(input, wrongWorkflow);
  };
  await assert.rejects(validate({ env: enableEnv(), request: wrongWorkflow.request }), /deployment-readiness.yml/);
});

function ghFallback(input, fixtureState) {
  const parsed = new URL(input.url);
  const path = parsed.pathname.replace(/^\/repos\//, '');
  if (path === `${repo}/actions/runs/${readinessId}`) return Promise.resolve(fixtureState.values.run);
  for (const workflow of oldWorkflows) {
    if (path === `${workflow.repo}/actions/workflows/${workflow.id}`) return Promise.resolve({ path: workflow.path, state: 'disabled_manually' });
    if (path === `${workflow.repo}/actions/workflows/${workflow.id}/runs`) return Promise.resolve({ workflow_runs: [] });
  }
  return Promise.reject(new Error(`Unexpected mocked request ${input.method} ${path}`));
}

test('enable refuses active old workflows and every active run status', async () => {
  const activeWorkflow = fixture({ oldState: 'active' });
  await assert.rejects(validate({ env: enableEnv(), request: activeWorkflow.request }), /still active/);
  for (const status of ['queued', 'in_progress', 'pending', 'waiting', 'requested']) {
    const inflight = fixture({ activeRun: { workflowId: oldWorkflows[2].id, status } });
    await assert.rejects(validate({ env: enableEnv(), request: inflight.request }), new RegExp(`has a ${status} run`));
  }
});

test('enable requires readiness_run_id and main context', async () => {
  const gh = fixture();
  await assert.rejects(validate({ env: enableEnv({ READINESS_RUN_ID: '' }), request: gh.request }), /readiness_run_id/);
  await assert.rejects(validate({ env: enableEnv({ GITHUB_REF: 'refs/heads/ops/test' }), request: gh.request }), /on typeshade\/web main/);
});

test('disable does not require readiness or stopped legacy publishers', async () => {
  const gh = fixture({ oldState: 'active' });
  await validate({
    env: { GITHUB_REPOSITORY: repo, GITHUB_REF: 'refs/heads/main', ENABLED: 'false', READINESS_RUN_ID: '' },
    request: gh.request,
  });
  assert.equal(gh.requests.length, 0);
});

test('switch writes only the operations variable with the admin token and keeps previews untouched', async () => {
  const gh = fixture({ variable: 'true' });
  const adminToken = 'admin-secret-test-value';
  const logs = [];
  const originalLog = console.log;
  console.log = (line) => logs.push(String(line));
  try {
    await switchOperations({
      env: {
        GITHUB_REPOSITORY: repo,
        GITHUB_REF: 'refs/heads/main',
        READINESS_VALIDATED: 'true',
        ENABLED: 'false',
        GH_TOKEN: adminToken,
        GITHUB_STEP_SUMMARY: '',
      },
      request: gh.request,
    });
  } finally {
    console.log = originalLog;
  }
  assert.equal(gh.values.variable, 'false');
  assert.ok(gh.requests.every((r) => r.token === adminToken));
  assert.ok(gh.requests.every((r) => r.path.endsWith('WEBSITE_OPERATIONS_ENABLED')));
  assert.ok(gh.requests.some((r) => r.method === 'PATCH'));
  assert.ok(logs.join('\n').includes('disabled'));
  assert.ok(!logs.join('\n').includes(adminToken));
});

test('switch cannot change the variable when validation did not pass', async () => {
  const gh = fixture({ variable: 'false' });
  await assert.rejects(switchOperations({
    env: { GITHUB_REPOSITORY: repo, GITHUB_REF: 'refs/heads/main', READINESS_VALIDATED: 'false', ENABLED: 'true', GH_TOKEN: 'admin' },
    request: gh.request,
  }), /validation did not pass/);
  assert.equal(gh.requests.length, 0);
});

test('switch creates the disabled repository variable when it is absent', async () => {
  const gh = fixture({ variable: null });
  await switchOperations({
    env: { GITHUB_REPOSITORY: repo, GITHUB_REF: 'refs/heads/main', READINESS_VALIDATED: 'true', ENABLED: 'false', GH_TOKEN: 'admin' },
    request: gh.request,
  });
  assert.equal(gh.values.variable, 'false');
  assert.ok(gh.requests.some((r) => r.method === 'POST' && r.path === `${repo}/actions/variables`));
});
