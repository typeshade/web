import { test } from 'node:test';
import assert from 'node:assert/strict';
import { affected, sites } from './affected.mjs';
test('app changes build that app', () => assert.deepEqual(affected(['apps/typenn/src/pages/index.astro']), ['typenn']));
test('shared UI changes build all consumers', () => assert.deepEqual(affected(['packages/ui/styles/tokens.css']), sites));
test('source pin changes build its consumer', () => assert.deepEqual(affected(['sources/typecv']), ['typecv']));
test('root documentation does not build sites', () => assert.deepEqual(affected(['README.md']), []));
test('deleted or moved app paths retain both consumers', () => assert.deepEqual(affected(['apps/typecv/old.css', 'apps/typenn/new.css']), ['typenn', 'typecv']));
test('dependency and pipeline changes verify all apps', () => assert.deepEqual(affected(['pnpm-lock.yaml']), sites));
