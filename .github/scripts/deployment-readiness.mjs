import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const sites = ['typecv', 'typenn', 'typeshade'];
const repository = 'typeshade/web';
const account = '7c029c2ac777ff3c45a4bcbe67918a1e';

export function environmentProblems(environment, policies) {
  if (!environment) return ['environment is missing'];
  const policy = environment.deployment_branch_policy;
  if (!policy?.custom_branch_policies || policy.protected_branches) {
    return ['select custom deployment branches and allow only the main branch'];
  }
  if (policies.length !== 1 || policies[0].name !== 'main' || policies[0].type !== 'branch') {
    return ['deployment rules must contain exactly the main branch, with no tag rule'];
  }
  return [];
}

export async function readJson(url, token) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
    redirect: 'error',
  });
  if (!response.ok) throw new Error(`Read-only request failed: HTTP ${response.status}`);
  const value = await response.json();
  if (value.success === false) throw new Error('Cloudflare rejected the read-only request');
  return value;
}

function report(text) {
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
  }
}

async function githubList(path, field) {
  const result = [];
  for (let page = 1; ; page += 1) {
    const data = await readJson(
      `https://api.github.com/repos/${repository}/${path}?per_page=100&page=${page}`,
      process.env.GITHUB_TOKEN,
    );
    if (!Array.isArray(data[field])) throw new Error(`Missing GitHub response field: ${field}`);
    result.push(...data[field]);
    if (data[field].length < 100) return result;
  }
}

export async function configuration() {
  const env = process.env;
  const operations = env.OPERATIONS_ENABLED === 'true';
  const previews = env.PREVIEWS_ENABLED === 'true';
  report('# Deployment configuration');
  report(`- Production operations: **${operations ? 'enabled' : 'disabled'}**`);
  report(`- Pull request previews: **${previews ? 'enabled' : 'disabled'}**`);
  for (const name of ['CLOUDFLARE_API_TOKEN', 'RECORDS_READ_TOKEN']) {
    report(`- ${name} at repository/organization scope: **${env[name] ? 'available' : 'not available'}**`);
  }
  report('Environment-scoped secrets are checked by the credentials jobs, after environment validation.');
  let failed = env.REQUIRE_DISABLED === 'true' && (operations || previews);
  if (failed) report('- Keep both WEBSITE_OPERATIONS_ENABLED and WEBSITE_PREVIEWS_ENABLED disabled during the migration.');
  let environmentsReady = true;
  const environments = await githubList('environments', 'environments');
  for (const site of sites) {
    const name = `${site}-production`;
    const environment = environments.find((item) => item.name === name);
    const policies = environment?.deployment_branch_policy?.custom_branch_policies
      ? await githubList(`environments/${name}/deployment-branch-policies`, 'branch_policies')
      : [];
    const problems = environmentProblems(environment, policies);
    if (problems.length) {
      environmentsReady = false;
      failed = true;
    }
    report(`- ${name}: **${problems.length ? problems.join('; ') : 'main branch only'}**`);
  }
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `environments_ready=${environmentsReady}\n`);
  report('This workflow does not create environments, change secrets, upload data, run migrations, or deploy Workers.');
  if (failed) throw new Error('Deployment configuration needs attention; see the job summary.');
}

export async function credentials() {
  const { SITE: site, CLOUDFLARE_API_TOKEN: token, RECORDS_READ_TOKEN: recordsToken } = process.env;
  if (!sites.includes(site)) throw new Error('Unsupported website');
  report(`# ${site} deployment credentials`);
  let missing = false;
  for (const [name, value] of [
    ['CLOUDFLARE_API_TOKEN', token],
    ...(site === 'typecv' ? [['RECORDS_READ_TOKEN', recordsToken]] : []),
  ]) {
    report(`- ${name}: **${value ? 'available' : 'missing'}**`);
    missing ||= !value;
  }
  if (missing) throw new Error('Required deployment credentials are missing.');
  const workers = site === 'typeshade' ? ['typeshade-site', 'typeshade-gallery'] : [`${site}-site`];
  for (const worker of workers) {
    const data = await readJson(
      `https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${worker}/deployments`,
      token,
    );
    if (!Array.isArray(data.result?.deployments)) throw new Error('Unexpected Worker deployments response');
    report(`- ${worker}: **current deployments readable**`);
  }
  report('Worker reads passed. This does not prove deployment/storage write permissions or that a deployment has run.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.env.GITHUB_REPOSITORY !== repository || process.env.GITHUB_REF !== 'refs/heads/main') {
      throw new Error('Run this workflow on typeshade/web main.');
    }
    if (process.argv[2] === 'configuration') await configuration();
    else if (process.argv[2] === 'credentials') await credentials();
    else throw new Error('Choose configuration or credentials.');
  } catch (error) {
    // Never print response bodies, request headers or credential values.
    console.error(error.message);
    process.exitCode = 1;
  }
}
