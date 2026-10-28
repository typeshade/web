import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEPLOY_SITES = Object.freeze(['typeshade', 'typenn', 'typecv']);

export function validateProductionTarget(site, ref) {
  if (!DEPLOY_SITES.includes(site)) throw new Error(`Unknown site '${site}'`);
  if (ref !== 'refs/heads/main') {
    throw new Error(`Production deployments must be dispatched from refs/heads/main, got '${ref}'`);
  }
  return { site, environment: `${site}-production` };
}

export function validateTypeCvProductionConfig(rawConfig) {
  const config = typeof rawConfig === 'string' ? parseJsonc(rawConfig) : rawConfig;
  const records = config.kv_namespaces?.find((binding) => binding.binding === 'RECORDS');
  if (!records || !/^[0-9a-f]{32}$/i.test(records.id ?? '')) {
    throw new Error('TypeCV production config must bind RECORDS to a real KV namespace');
  }
  const requiredBuckets = new Map(
    (config.r2_buckets ?? []).map(({ binding, bucket_name }) => [binding, bucket_name]),
  );
  if (requiredBuckets.get('SAMPLES') !== 'typecv-samples') {
    throw new Error('TypeCV production config must bind the typecv-samples bucket');
  }
  if (requiredBuckets.get('RECORD_FILES') !== 'typecv-records') {
    throw new Error('TypeCV production config must bind the typecv-records bucket');
  }
  if (config.main !== 'worker.mjs' || config.assets?.directory !== './dist') {
    throw new Error('TypeCV production config must deploy worker.mjs with the built ./dist assets');
  }
  return true;
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Parse the JSON-with-comments subset used by Wrangler, including comments and trailing commas. */
export function parseJsonc(source) {
  let cleaned = '';
  let quoted = false;
  let escaped = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];
    if (quoted) {
      cleaned += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') {
      quoted = true;
      cleaned += char;
      continue;
    }
    if (char === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') i += 1;
      cleaned += '\n';
      continue;
    }
    if (char === '/' && next === '*') {
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        if (source[i] === '\n') cleaned += '\n';
        i += 1;
      }
      i += 1;
      continue;
    }
    cleaned += char;
  }

  let json = '';
  quoted = false;
  escaped = false;
  for (let i = 0; i < cleaned.length; i += 1) {
    const char = cleaned[i];
    if (quoted) {
      json += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') {
      quoted = true;
      json += char;
      continue;
    }
    if (char === ',') {
      let next = i + 1;
      while (/\s/.test(cleaned[next] ?? '')) next += 1;
      if (cleaned[next] === '}' || cleaned[next] === ']') continue;
    }
    json += char;
  }
  return JSON.parse(json);
}

function appConfig(site, rawConfig, pr, previewAccountId) {
  if (!DEPLOY_SITES.includes(site)) throw new Error(`Unknown site '${site}'`);
  if (!Number.isSafeInteger(pr) || pr < 1) throw new Error('PR number must be a positive integer');
  if (!/^[0-9a-f]{32}$/i.test(previewAccountId ?? '')) {
    throw new Error('A 32-character hexadecimal preview account ID is required');
  }
  const source = typeof rawConfig === 'string' ? parseJsonc(rawConfig) : rawConfig;
  if (!source || typeof source !== 'object') {
    throw new Error(`${site}: expected a Wrangler config object`);
  }
  if (typeof source.compatibility_date !== 'string') {
    throw new Error(`${site}: expected a Wrangler compatibility_date`);
  }
  if (!source.assets || source.assets.directory !== './dist') {
    throw new Error(`${site}: preview config requires assets.directory "./dist"`);
  }

  const assets = {
    directory: './dist',
    binding: source.assets.binding ?? 'ASSETS',
    ...(source.assets.html_handling
      ? { html_handling: source.assets.html_handling }
      : {}),
    ...(source.assets.not_found_handling
      ? { not_found_handling: source.assets.not_found_handling }
      : {}),
  };
  const config = {
    '$schema': 'node_modules/wrangler/config-schema.json',
    name: `${site}-site-pr-${pr}`,
    main: `./.deploy-preview-worker-pr-${pr}.mjs`,
    account_id: previewAccountId,
    compatibility_date: source.compatibility_date,
    workers_dev: false,
    preview_urls: true,
    assets,
  };

  return config;
}

export function previewConfigFor(site, source, pr, previewAccountId) {
  return appConfig(site, source, pr, previewAccountId);
}

export async function writePreviewConfig(site, pr, previewAccountId, baseDir = root) {
  if (!DEPLOY_SITES.includes(site)) throw new Error(`Unknown site '${site}'`);
  const appDir = path.join(baseDir, 'apps', site);
  const source = await readFile(path.join(appDir, 'wrangler.jsonc'), 'utf8');
  const config = appConfig(site, source, pr, previewAccountId);
  const configFile = path.join(appDir, `.wrangler-preview-pr-${pr}.json`);
  const workerFile = path.join(appDir, `.deploy-preview-worker-pr-${pr}.mjs`);
  await writeFile(configFile, `${JSON.stringify(config, null, 2)}\n`);
  await writeFile(
    workerFile,
    'export default { fetch(request, env) { return env.ASSETS.fetch(request); } };\n',
  );
  return {
    appDir,
    configFile,
    workerFile,
    config,
  };
}

export async function removePreviewConfig(site, pr, baseDir = root) {
  if (!DEPLOY_SITES.includes(site)) throw new Error(`Unknown site '${site}'`);
  if (!Number.isSafeInteger(pr) || pr < 1) throw new Error('PR number must be a positive integer');
  const appDir = path.join(baseDir, 'apps', site);
  await rm(path.join(appDir, `.wrangler-preview-pr-${pr}.json`), { force: true });
  await rm(path.join(appDir, `.deploy-preview-worker-pr-${pr}.mjs`), { force: true });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, site, arg] = process.argv.slice(2);
  if (command === 'validate-site') {
    try {
      const target = validateProductionTarget(site, arg);
      console.log(JSON.stringify(target));
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  } else if (command === 'validate-typecv-config') {
    try {
      validateTypeCvProductionConfig(await readFile(site, 'utf8'));
      console.log('TypeCV production bindings are configured.');
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  } else {
    const pr = Number(arg);
    if (command === 'create') {
      const result = await writePreviewConfig(site, pr, process.env.CLOUDFLARE_ACCOUNT_ID);
      console.log(
        JSON.stringify({
          config: path.relative(root, result.configFile),
          worker: path.relative(root, result.workerFile),
          name: result.config.name,
        }),
      );
    } else if (command === 'remove') {
      await removePreviewConfig(site, pr);
    } else {
      console.error('usage: node scripts/deploy-preview-config.mjs validate-site <site> <ref> | validate-typecv-config <config> | create|remove <site> <pr-number>');
      process.exitCode = 2;
    }
  }
}
