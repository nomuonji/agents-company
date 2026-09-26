import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareRuntime,
  leaseIsLive,
  mergeRuntimeRequirements,
  validateWorkItem,
} from '../src/index.mjs';

test('runtime requirements merge and compare', () => {
  const req = mergeRuntimeRequirements(
    { requiredTools:['github'], requiredCapabilities:['repo_read'] },
    { requiredTools:['web'], requiredCapabilities:['public_web_research'] },
  );
  assert.deepEqual(req.requiredTools.sort(), ['github','web']);
  assert.equal(compareRuntime(req, {
    tools:['github','web'],
    capabilities:['repo_read','public_web_research'],
  }).ok, true);
  assert.deepEqual(compareRuntime(req, {
    tools:['github'],
    capabilities:['repo_read'],
  }).missingTools, ['web']);
});

test('leaseIsLive understands future and past leases', () => {
  assert.equal(leaseIsLive({ leaseExpiresAt:new Date(Date.now() + 60_000).toISOString() }), true);
  assert.equal(leaseIsLive({ leaseExpiresAt:new Date(Date.now() - 60_000).toISOString() }), false);
});

test('review is validation-complete only', () => {
  const item = {
    id:'wi-x',
    title:'x',
    status:'review',
    executionReceipt:{ validationComplete:false },
  };
  assert.ok(validateWorkItem(item).some((x) => x.includes('validationComplete')));
});
