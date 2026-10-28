import assert from 'node:assert/strict';
import test from 'node:test';
import { setup as runSetup } from './setup-production.mjs';

// Mocked setup must not write a real Actions job summary claiming remote changes.
const setup = (options) => runSetup({ report: () => {}, ...options });

const names = ['typecv-production', 'typenn-production', 'typeshade-production'];
const mainRule = { name: 'main', type: 'branch' };
const baseEnv = {
  GITHUB_REPOSITORY: 'typeshade/web',
  GITHUB_REF: 'refs/heads/main',
  GH_TOKEN: 'mock-admin-token',
  CLOUDFLARE_API_TOKEN: 'mock-cloudflare-token',
  GITHUB_STEP_SUMMARY: '',
};

function mockGitHub({ existing = names, variables = [], repoSecrets = ['CLOUDFLARE_API_TOKEN'], envSecrets = {}, environmentVars = {}, protection = {} } = {}) {
  const states = new Map(existing.map((name) => [name, {
    name,
    can_admins_bypass: false,
    deployment_branch_policy: { custom_branch_policies: true, protected_branches: false },
    protection_rules: protection[name] ?? [],
  }]));
  const policies = new Map(existing.map((name) => [name, [{ ...mainRule }]]));
  const variableState = new Map(variables.map((item) => [item.name, { ...item }]));
  const secretState = new Map(Object.entries(envSecrets).map(([name, values]) => [name, new Set(values)]));
  const environmentVariableState = new Map(existing.map((name) => [name, new Map((environmentVars[name] ?? []).map((item) => [item.name, { ...item }]))]));
  const writes = [];
  const requests = [];
  let savedSecret;

  function command(args, input) {
    if (args[0] === 'secret') {
      assert.deepEqual(args, ['secret', 'set', 'RECORDS_READ_TOKEN', '--repo', 'typeshade/web', '--env', 'typecv-production']);
      assert.ok(input);
      savedSecret = input;
      secretState.get('typecv-production')?.add('RECORDS_READ_TOKEN');
      writes.push(['secret', args]);
      return '';
    }
    assert.equal(args[0], 'api');
    const method = args[args.indexOf('--method') + 1];
    const path = args.find((arg) => arg.startsWith('repos/typeshade/web/'));
    const [route, query = ''] = path.split('?');
    requests.push({ method, route, query });
    const page = Number(new URLSearchParams(query).get('page') ?? '1');
    const paged = (field, values) => JSON.stringify({ [field]: values.slice((page - 1) * 100, page * 100) });
    const body = input ? JSON.parse(input) : undefined;
    if (method !== 'GET') writes.push([method, path, body]);
    const envMatch = route.match(/^repos\/typeshade\/web\/environments\/([^/]+)(?:\/(.*))?$/);
    if (envMatch) {
      const name = decodeURIComponent(envMatch[1]);
      const suffix = envMatch[2];
      if (suffix === 'deployment-branch-policies' && method === 'GET') return paged('branch_policies', policies.get(name) ?? []);
      if (suffix === 'deployment-branch-policies' && method === 'POST') {
        const rules = policies.get(name) ?? [];
        if (!rules.some((r) => r.name === body.name && r.type === body.type)) rules.push(body);
        policies.set(name, rules);
        return JSON.stringify(body);
      }
      if (suffix === 'secrets' && method === 'GET') return paged('secrets', [...(secretState.get(name) ?? [])].map((n) => ({ name: n })));
      if (suffix === 'variables' && method === 'GET') return paged('variables', [...(environmentVariableState.get(name) ?? new Map()).values()]);
      if (suffix?.startsWith('variables/') && method === 'PATCH') {
        environmentVariableState.get(name)?.set(body.name, body);
        return JSON.stringify(body);
      }
      if (!suffix && method === 'GET') {
        if (!states.has(name)) throw new Error('GitHub HTTP 404');
        return JSON.stringify(states.get(name));
      }
      if (!suffix && method === 'PUT') {
        const current = states.get(name) ?? { name, protection_rules: [] };
        states.set(name, { ...current, ...body });
        if (!policies.has(name)) policies.set(name, []);
        if (!secretState.has(name)) secretState.set(name, new Set());
        if (!environmentVariableState.has(name)) environmentVariableState.set(name, new Map());
        return JSON.stringify(states.get(name));
      }
    }
    if (route === 'repos/typeshade/web/actions/secrets' && method === 'GET') {
      return paged('secrets', repoSecrets.map((name) => ({ name })));
    }
    if (route === 'repos/typeshade/web/actions/variables' && method === 'GET') {
      return paged('variables', [...variableState.values()]);
    }
    if (route === 'repos/typeshade/web/actions/variables' && method === 'POST') {
      variableState.set(body.name, body);
      return JSON.stringify(body);
    }
    const variableMatch = route.match(/^repos\/typeshade\/web\/actions\/variables\/([^/]+)$/);
    if (variableMatch && method === 'PATCH') {
      variableState.set(decodeURIComponent(variableMatch[1]), body);
      return JSON.stringify(body);
    }
    throw new Error(`Unhandled mock request: ${method} ${path}`);
  }
  return { command, states, policies, variableState, environmentVariableState, writes, requests, get savedSecret() { return savedSecret; } };
}

test('is idempotent and preserves existing environment protections and secrets', async () => {
  const gh = mockGitHub({
    variables: [{ name: 'WEBSITE_OPERATIONS_ENABLED', value: 'false' }, { name: 'WEBSITE_PREVIEWS_ENABLED', value: 'false' }],
    repoSecrets: ['CLOUDFLARE_API_TOKEN', 'RECORDS_READ_TOKEN'],
    envSecrets: { 'typecv-production': ['RECORDS_READ_TOKEN', 'OTHER_SECRET'] },
    protection: {
      'typecv-production': [
        { type: 'required_reviewers', reviewers: [{ type: 'Team', reviewer: { id: 17 } }], prevent_self_review: true },
        { type: 'wait_timer', wait_timer: 10 },
      ],
    },
  });
  const lines = [];
  await setup({ command: gh.command, env: baseEnv, random: () => Buffer.alloc(32, 7) });
  assert.deepEqual(gh.writes, []);
  assert.deepEqual(gh.states.get('typecv-production').protection_rules[0].reviewers[0].reviewer, { id: 17 });
  assert.equal(gh.savedSecret, undefined);
});

test('creates missing environments, writes false switches, and pipes a generated secret', async () => {
  const gh = mockGitHub({ existing: [], variables: [] });
  const masked = [];
  await setup({ command: gh.command, env: { ...baseEnv, GITHUB_STEP_SUMMARY: '' }, random: () => Buffer.alloc(32, 7), mask: (value) => masked.push(value) });
  assert.equal(gh.states.size, 3);
  for (const name of names) assert.deepEqual(gh.policies.get(name), [mainRule]);
  assert.equal(gh.variableState.get('WEBSITE_OPERATIONS_ENABLED').value, 'false');
  assert.equal(gh.variableState.get('WEBSITE_PREVIEWS_ENABLED').value, 'false');
  assert.equal(gh.savedSecret, Buffer.alloc(32, 7).toString('base64url'));
  assert.deepEqual(masked, [gh.savedSecret]);
  assert.ok(!gh.writes.some(([method, path, body]) => JSON.stringify([method, path, body]).includes(gh.savedSecret)));
});

test('fails before writes when an existing environment has extra branch policies', async () => {
  const gh = mockGitHub();
  gh.policies.set('typecv-production', [mainRule, { name: 'release/*', type: 'branch' }]);
  await assert.rejects(setup({ command: gh.command, env: baseEnv }), /besides main/);
  assert.deepEqual(gh.writes, []);
});

test('fails before writes when an existing protection rule cannot be preserved', async () => {
  const gh = mockGitHub({ protection: { 'typenn-production': [{ type: 'custom_unknown' }] } });
  // TypeCV would otherwise be updated first; all protections must be checked before writes.
  gh.policies.set('typecv-production', []);
  gh.policies.set('typenn-production', []);
  await assert.rejects(setup({ command: gh.command, env: baseEnv }), /unsupported protection rule/);
  assert.deepEqual(gh.writes, []);
});

test('adds main without losing existing reviewers, wait timer, bypass setting, or environment secrets', async () => {
  const gh = mockGitHub({
    variables: [{ name: 'WEBSITE_OPERATIONS_ENABLED', value: 'false' }, { name: 'WEBSITE_PREVIEWS_ENABLED', value: 'false' }],
    repoSecrets: ['CLOUDFLARE_API_TOKEN', 'RECORDS_READ_TOKEN'],
    envSecrets: { 'typecv-production': ['RECORDS_READ_TOKEN', 'OTHER_SECRET'] },
    protection: {
      'typecv-production': [
        { type: 'required_reviewers', reviewers: [{ type: 'Team', reviewer: { id: 17 } }], prevent_self_review: true },
        { type: 'wait_timer', wait_timer: 10 },
      ],
    },
  });
  gh.policies.set('typecv-production', []);
  await setup({ command: gh.command, env: baseEnv });
  const update = gh.writes.find(([method, path]) => method === 'PUT' && path.endsWith('typecv-production'))[2];
  assert.deepEqual(update.reviewers, [{ type: 'Team', id: 17 }]);
  assert.equal(update.prevent_self_review, true);
  assert.equal(update.wait_timer, 10);
  assert.equal(update.can_admins_bypass, false);
  assert.deepEqual([...gh.states.get('typecv-production').protection_rules], [
    { type: 'required_reviewers', reviewers: [{ type: 'Team', reviewer: { id: 17 } }], prevent_self_review: true },
    { type: 'wait_timer', wait_timer: 10 },
  ]);
  assert.deepEqual([...gh.states.keys()], names);
});

test('disables environment-level operation overrides that take precedence over repository variables', async () => {
  const gh = mockGitHub({
    variables: [{ name: 'WEBSITE_OPERATIONS_ENABLED', value: 'false' }, { name: 'WEBSITE_PREVIEWS_ENABLED', value: 'false' }],
    repoSecrets: ['CLOUDFLARE_API_TOKEN', 'RECORDS_READ_TOKEN'],
    environmentVars: { 'typecv-production': [{ name: 'WEBSITE_OPERATIONS_ENABLED', value: 'true' }] },
  });
  await setup({ command: gh.command, env: baseEnv });
  assert.equal(gh.environmentVariableState.get('typecv-production').get('WEBSITE_OPERATIONS_ENABLED').value, 'false');
  assert.ok(gh.writes.some(([method, path, body]) => method === 'PATCH' && path.endsWith('variables/WEBSITE_OPERATIONS_ENABLED') && body.value === 'false'));
});

test('finds an existing TypeCV record secret on a later environment-secret page', async () => {
  const values = Array.from({ length: 100 }, (_, i) => `ENV_SECRET_${i}`);
  values.push('RECORDS_READ_TOKEN');
  const gh = mockGitHub({ envSecrets: { 'typecv-production': values } });
  await setup({ command: gh.command, env: baseEnv });
  assert.equal(gh.savedSecret, undefined);
  assert.ok(gh.requests.some((request) => request.route.endsWith('/typecv-production/secrets') && new URLSearchParams(request.query).get('page') === '2'));
});

test('rejects a conflicting branch policy on a later policy page before writes', async () => {
  const gh = mockGitHub();
  gh.policies.set('typecv-production', [
    ...Array.from({ length: 100 }, () => ({ ...mainRule })),
    { name: 'release/*', type: 'branch' },
  ]);
  await assert.rejects(setup({ command: gh.command, env: baseEnv }), /besides main/);
  assert.ok(gh.requests.some((request) => request.route.endsWith('/typecv-production/deployment-branch-policies') && new URLSearchParams(request.query).get('page') === '2'));
  assert.deepEqual(gh.writes, []);
});

test('paginates repository secrets and repository/environment variables', async () => {
  const repositorySecrets = [
    'CLOUDFLARE_API_TOKEN',
    ...Array.from({ length: 99 }, (_, i) => `REPO_SECRET_${i}`),
    'RECORDS_READ_TOKEN',
  ];
  const repositoryVariables = [
    ...Array.from({ length: 100 }, (_, i) => ({ name: `REPO_VARIABLE_${i}`, value: 'value' })),
    { name: 'WEBSITE_OPERATIONS_ENABLED', value: 'true' },
    { name: 'WEBSITE_PREVIEWS_ENABLED', value: 'false' },
  ];
  const environmentVariables = [
    ...Array.from({ length: 100 }, (_, i) => ({ name: `ENV_VARIABLE_${i}`, value: 'value' })),
    { name: 'WEBSITE_OPERATIONS_ENABLED', value: 'true' },
  ];
  const gh = mockGitHub({
    repoSecrets: repositorySecrets,
    variables: repositoryVariables,
    environmentVars: { 'typecv-production': environmentVariables },
  });
  await setup({ command: gh.command, env: baseEnv });
  assert.equal(gh.savedSecret, undefined);
  assert.equal(gh.variableState.get('WEBSITE_OPERATIONS_ENABLED').value, 'false');
  assert.equal(gh.environmentVariableState.get('typecv-production').get('WEBSITE_OPERATIONS_ENABLED').value, 'false');
  for (const route of ['actions/secrets', 'actions/variables', 'environments/typecv-production/variables']) {
    assert.ok(gh.requests.some((request) => request.route.endsWith(route) && new URLSearchParams(request.query).get('page') === '2'), route);
  }
});

test('never starts from a non-main ref or without Cloudflare credential presence', async () => {
  const gh = mockGitHub();
  await assert.rejects(setup({ command: gh.command, env: { ...baseEnv, GITHUB_REF: 'refs/heads/ops/test' } }), /on typeshade\/web main/);
  await assert.rejects(setup({ command: mockGitHub({ repoSecrets: [] }).command, env: { ...baseEnv, CLOUDFLARE_API_TOKEN: '' } }), /CLOUDFLARE_API_TOKEN is missing/);
  assert.deepEqual(gh.writes, []);
});
