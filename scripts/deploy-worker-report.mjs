import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

function deploymentsFromJson(value) {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  const rows = Array.isArray(parsed) ? parsed : parsed?.result;
  if (!Array.isArray(rows)) throw new Error('Wrangler deployment JSON must be an array');
  return rows;
}

export function previousTraffic(value) {
  const rows = deploymentsFromJson(value).sort((a, b) =>
    String(b.created_on ?? '').localeCompare(String(a.created_on ?? '')),
  );
  const latest = rows[0];
  if (!latest) return { specs: [], ids: [] };
  if (!Array.isArray(latest.versions) || latest.versions.length === 0) {
    throw new Error('Latest production deployment has no version traffic to record');
  }
  const versions = latest.versions.map(({ version_id: id, percentage }) => {
    if (typeof id !== 'string' || !/^[0-9a-f-]{16,}$/i.test(id)) {
      throw new Error('Latest production deployment has an invalid version ID');
    }
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      throw new Error(`Latest production deployment has an invalid traffic percentage for ${id}`);
    }
    return { id, percentage };
  });
  const total = versions.reduce((sum, v) => sum + v.percentage, 0);
  if (total !== 100) {
    throw new Error(`Latest production deployment routes ${total}% of traffic; expected 100%`);
  }
  return {
    specs: versions.map(({ id, percentage }) => `${id}@${percentage}`),
    ids: versions.map(({ id }) => id),
  };
}

export function currentVersionId(output) {
  const matches = [...output.matchAll(/(?:Current|Worker) Version ID:\s*([0-9a-f-]{16,})/gi)];
  const id = matches.at(-1)?.[1];
  if (!id) throw new Error('Wrangler deploy output did not include a Worker version ID');
  return id;
}

export function rollbackCommand(config, specs) {
  if (!specs.length) return null;
  if (!/^wrangler(?:\.[a-z]+)?\.jsonc?$/.test(config)) {
    throw new Error(`Unexpected Wrangler config name '${config}'`);
  }
  for (const spec of specs) {
    if (!/^[0-9a-f-]{16,}@(?:100|[1-9]?\d)(?:\.\d+)?$/i.test(spec)) {
      throw new Error(`Invalid Wrangler version traffic spec '${spec}'`);
    }
  }
  return `pnpm exec wrangler versions deploy ${specs.join(' ')} --config ${config} --yes`;
}

async function main() {
  const [command, file, config] = process.argv.slice(2);
  if (command === 'previous') {
    const traffic = previousTraffic(await readFile(file, 'utf8'));
    console.log(JSON.stringify({ ...traffic, rollback: rollbackCommand(config, traffic.specs) }));
  } else if (command === 'version-id') {
    console.log(currentVersionId(await readFile(file, 'utf8')));
  } else {
    console.error('usage: deploy-worker-report.mjs previous <deployments.json> <wrangler.jsonc> | version-id <deploy.log>');
    process.exitCode = 2;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
