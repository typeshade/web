import { randomBytes } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const repository = 'typeshade/web';
const environments = ['typecv-production', 'typenn-production', 'typeshade-production'];
const variables = ['WEBSITE_OPERATIONS_ENABLED', 'WEBSITE_PREVIEWS_ENABLED'];
const recordsSecret = 'RECORDS_READ_TOKEN';

function runGh(args, input) {
  const result = spawnSync('gh', args, {
    input,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
    env: process.env,
  });
  if (result.error || result.status !== 0) {
    const status = result.stderr?.match(/HTTP (\d{3})/)?.[1];
    if (status) throw new Error(`GitHub HTTP ${status}`);
    throw new Error('GitHub setup request failed. Check DEPLOYMENT_ADMIN_TOKEN permissions and Actions logs for the failing step.');
  }
  return result.stdout;
}

function api(method, path, body, command = runGh) {
  const args = ['api', '--method', method, `repos/${repository}/${path}`];
  if (body !== undefined) args.push('--input', '-');
  let output;
  try {
    output = command(args, body === undefined ? undefined : JSON.stringify(body));
  } catch (error) {
    if (/^GitHub HTTP \d{3}$/.test(error.message)) throw error;
    throw new Error(`GitHub API ${method} ${path} failed; verify the admin token permissions and existing settings.`);
  }
  if (method === 'DELETE' || output.trim() === '') return null;
  try {
    return JSON.parse(output);
  } catch {
    throw new Error(`GitHub API ${method} ${path} returned invalid JSON.`);
  }
}

function listAll(path, field, command) {
  const values = [];
  for (let page = 1; ; page += 1) {
    const separator = path.includes('?') ? '&' : '?';
    const result = api('GET', `${path}${separator}per_page=100&page=${page}`, undefined, command);
    if (!Array.isArray(result?.[field])) throw new Error(`Could not verify paginated GitHub data: ${field}.`);
    values.push(...result[field]);
    if (result[field].length < 100) return values;
  }
}

function outputSummary(lines, env) {
  console.log(lines.join('\n'));
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
}

function rulesFor(environment, policies) {
  if (!environment) return { exists: false, policies: [] };
  const current = environment.deployment_branch_policy;
  if (current?.protected_branches) {
    throw new Error(`${environment.name} uses protected-branch restrictions. Review it manually; setup will not weaken or replace that policy.`);
  }
  if (current?.custom_branch_policies) {
    const other = policies.filter((rule) => rule.name !== 'main' || rule.type !== 'branch');
    if (other.length) {
      throw new Error(`${environment.name} has branch/tag rules besides main. Remove or review them manually; setup will not delete existing rules.`);
    }
    return { exists: true, policies };
  }
  if (policies.length) {
    throw new Error(`${environment.name} has rules that cannot be reconciled safely. Review it manually.`);
  }
  return { exists: true, policies: [] };
}

function environmentUpdateBody(environment) {
  const body = {
    deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
  };
  if (!environment) return body;

  // The environment update endpoint replaces protection settings when they are
  // included, so carry forward its existing supported settings explicitly.
  if (environment.can_admins_bypass !== undefined) body.can_admins_bypass = environment.can_admins_bypass;
  if (environment.prevent_self_review !== undefined) body.prevent_self_review = environment.prevent_self_review;
  const protection = environment.protection_rules ?? [];
  const reviewers = [];
  let hasReviewerRule = false;
  for (const rule of protection) {
    if (rule.type === 'required_reviewers') {
      hasReviewerRule = true;
      for (const entry of rule.reviewers ?? []) {
        const reviewer = entry.reviewer;
        if (!reviewer?.id || !['User', 'Team'].includes(entry.type)) {
          throw new Error(`${environment.name} has a reviewer rule that cannot be preserved safely.`);
        }
        reviewers.push({ type: entry.type, id: reviewer.id });
      }
      if (rule.prevent_self_review !== undefined) body.prevent_self_review = rule.prevent_self_review;
    } else if (rule.type === 'wait_timer') {
      body.wait_timer = Math.max(body.wait_timer ?? 0, rule.wait_timer ?? 0);
    } else if (rule.type !== 'branch_policy') {
      throw new Error(`${environment.name} has an unsupported protection rule (${rule.type}); setup will not overwrite it.`);
    }
  }
  if (hasReviewerRule) body.reviewers = reviewers;
  return body;
}

function ensureVariable(name, current, command) {
  if (current?.value === 'false') return false;
  if (current) {
    api('PATCH', `actions/variables/${encodeURIComponent(name)}`, { name, value: 'false' }, command);
  } else {
    api('POST', 'actions/variables', { name, value: 'false' }, command);
  }
  return true;
}

function ensureEnvironmentVariable(environmentName, name, current, command) {
  // An absent environment variable inherits the repository value, which is
  // explicitly set to false below. Create an override only when one exists.
  if (!current) return false;
  if (current.value === 'false') return false;
  if (current) {
    api('PATCH', `environments/${encodeURIComponent(environmentName)}/variables/${encodeURIComponent(name)}`, { name, value: 'false' }, command);
  }
  return true;
}

function environmentVariableMap(environmentName, command) {
  return new Map(listAll(`environments/${encodeURIComponent(environmentName)}/variables`, 'variables', command)
    .map((variable) => [variable.name, variable]));
}

function secretNames(environmentName, command) {
  return new Set(listAll(`environments/${encodeURIComponent(environmentName)}/secrets`, 'secrets', command)
    .map((secret) => secret.name));
}

export async function setup({ command = runGh, env = process.env, random = randomBytes, mask = (value) => process.stdout.write(`::add-mask::${value}\n`), report = outputSummary } = {}) {
  if (env.GITHUB_REPOSITORY !== repository || env.GITHUB_REF !== 'refs/heads/main') {
    throw new Error('Run setup-production on typeshade/web main.');
  }
  if (!env.GH_TOKEN) throw new Error('DEPLOYMENT_ADMIN_TOKEN is missing. Add it as a repository Actions secret before running setup.');

  const lines = ['# Production setup'];
  const existingEnvironments = new Map();
  for (const name of environments) {
    let current;
    try {
      current = api('GET', `environments/${encodeURIComponent(name)}`, undefined, command);
    } catch (error) {
      if (!/HTTP 404|Not Found/i.test(error.message)) throw error;
      current = null;
    }
    const policies = current?.deployment_branch_policy?.custom_branch_policies
      ? listAll(`environments/${encodeURIComponent(name)}/deployment-branch-policies`, 'branch_policies', command)
      : [];
    if (!Array.isArray(policies)) throw new Error(`Could not verify deployment branch policies for ${name}.`);
    rulesFor(current, policies);
    const secrets = current ? secretNames(name, command) : new Set();
    const environmentVariables = current ? environmentVariableMap(name, command) : new Map();
    const needsMainRule = !current || !policies.some((rule) => rule.name === 'main' && rule.type === 'branch');
    const updateBody = needsMainRule ? environmentUpdateBody(current) : null;
    existingEnvironments.set(name, { current, policies, secrets, environmentVariables, updateBody });
  }

  const repoSecrets = new Set();
  for (const secret of listAll('actions/secrets', 'secrets', command)) repoSecrets.add(secret.name);
  const hasRepoCloudflare = Boolean(env.CLOUDFLARE_API_TOKEN) || repoSecrets.has('CLOUDFLARE_API_TOKEN');
  for (const name of environments) {
    if (!hasRepoCloudflare && !existingEnvironments.get(name).secrets.has('CLOUDFLARE_API_TOKEN')) {
      throw new Error(`CLOUDFLARE_API_TOKEN is missing for ${name}; setup made no changes.`);
    }
  }

  const existingRecords = Boolean(env.RECORDS_READ_TOKEN) || repoSecrets.has(recordsSecret)
    || existingEnvironments.get('typecv-production').secrets.has(recordsSecret);
  const currentVariables = new Map(listAll('actions/variables', 'variables', command)
    .map((variable) => [variable.name, variable]));

  // Disable automatic operations before changing any environment configuration.
  for (const name of variables) {
    const changed = ensureVariable(name, currentVariables.get(name), command);
    lines.push(`- ${name}: false${changed ? ' (set)' : ' (already false)'}`);
  }
  for (const environmentName of environments) {
    const current = existingEnvironments.get(environmentName).environmentVariables;
    for (const name of variables) {
      if (ensureEnvironmentVariable(environmentName, name, current.get(name), command)) {
        lines.push(`- ${environmentName} ${name}: false (set)`);
      }
    }
  }

  for (const name of environments) {
    const item = existingEnvironments.get(name);
    const needsMainRule = !item.current || !item.policies.some((rule) => rule.name === 'main' && rule.type === 'branch');
    if (needsMainRule) {
      api('PUT', `environments/${encodeURIComponent(name)}`, item.updateBody, command);
      api('POST', `environments/${encodeURIComponent(name)}/deployment-branch-policies`, { name: 'main', type: 'branch' }, command);
      lines.push(`- ${name}: restricted to main${item.current ? ' (existing protections preserved)' : ' (created)'}`);
    } else {
      lines.push(`- ${name}: already restricted to main; existing protections preserved`);
    }
  }
  if (!existingRecords) {
    const token = random(32).toString('base64url');
    mask(token);
    try {
      command(['secret', 'set', recordsSecret, '--repo', repository, '--env', 'typecv-production'], token);
    } catch {
      throw new Error('Could not save the generated TypeCV record-reader secret; verify admin token permissions.');
    }
    lines.push('- RECORDS_READ_TOKEN: generated in memory and saved as a TypeCV environment secret');
  } else {
    lines.push('- RECORDS_READ_TOKEN: existing repository/organization or TypeCV environment secret preserved');
  }

  const verifiedTypecvSecrets = secretNames('typecv-production', command);
  if (!existingRecords && !verifiedTypecvSecrets.has(recordsSecret)) {
    throw new Error('RECORDS_READ_TOKEN was not found in typecv-production after saving it.');
  }
  for (const name of environments) {
    if (!hasRepoCloudflare && !secretNames(name, command).has('CLOUDFLARE_API_TOKEN')) {
      throw new Error(`CLOUDFLARE_API_TOKEN did not validate in ${name} after setup.`);
    }
  }

  // Read back configuration to catch partial updates and permission/API issues.
  for (const name of environments) {
    const current = api('GET', `environments/${encodeURIComponent(name)}`, undefined, command);
    const policies = current?.deployment_branch_policy?.custom_branch_policies
      ? listAll(`environments/${encodeURIComponent(name)}/deployment-branch-policies`, 'branch_policies', command)
      : [];
    const problems = rulesFor(current, policies);
    if (problems.policies.length !== 1 || problems.policies[0].name !== 'main' || problems.policies[0].type !== 'branch') {
      throw new Error(`${name} did not validate as restricted to exactly main after setup.`);
    }
  }
  const verifiedVariables = new Map(listAll('actions/variables', 'variables', command)
    .map((variable) => [variable.name, variable]));
  for (const name of variables) {
    const current = verifiedVariables.get(name);
    if (current?.value !== 'false') throw new Error(`${name} did not validate as false after setup.`);
  }
  for (const environmentName of environments) {
    const current = environmentVariableMap(environmentName, command);
    for (const name of variables) {
      if (current.has(name) && current.get(name).value !== 'false') {
        throw new Error(`${environmentName} ${name} did not validate as false after setup.`);
      }
    }
  }
  lines.push('- Prerequisites: admin token and Cloudflare credential presence were checked; Cloudflare write permissions were not verified. Production switches are disabled.');
  lines.push('Setup complete. No Cloudflare writes, builds, migrations, or deployments were run.');
  report(lines, env);
}

if (process.argv[1] && process.argv[1].endsWith('setup-production.mjs')) {
  setup().catch((error) => {
    console.error(error.message);
    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY,
        `# Production setup failed\n\n${error.message}\n\nConfirm DEPLOYMENT_ADMIN_TOKEN has repository administration access and CLOUDFLARE_API_TOKEN is available in the repository or each production environment. Review any existing branch or protection rules manually before rerunning.\n`);
    }
    process.exitCode = 1;
  });
}
