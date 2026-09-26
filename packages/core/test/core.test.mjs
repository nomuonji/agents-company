import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareRuntime,
  leaseIsLive,
  mergeRuntimeRequirements,
  parseIssueMeta,
  validateWorkIssueMeta,
} from '../src/index.mjs';

test('runtime requirements merge and compare', () => {
  const req = mergeRuntimeRequirements(
    { requiredTools:['github'], requiredCapabilities:['repo_read'] },
    { requiredTools:['web'], requiredCapabilities:['public_web_research'] },
  );
  assert.deepEqual(req.requiredTools.sort(), ['github','web']);
  assert.equal(compareRuntime(req, {tools:['github','web'],capabilities:['repo_read','public_web_research']}).ok, true);
});

test('leaseIsLive understands future and past leases', () => {
  assert.equal(leaseIsLive({leaseExpiresAt:new Date(Date.now()+60000).toISOString()}), true);
  assert.equal(leaseIsLive({leaseExpiresAt:new Date(Date.now()-60000).toISOString()}), false);
});

test('Issue metadata parses and validates', () => {
  const body='<!-- agents-company:meta\n{"schemaVersion":1,"kind":"work","status":"ready","priority":"medium","managerJobId":"general-manager","workerMethod":{"id":"general-worker","version":"active"},"execution":{"validationStrategy":{"type":"explicit"}}}\n-->';
  const meta=parseIssueMeta(body);
  assert.equal(meta.kind,'work');
  assert.deepEqual(validateWorkIssueMeta(meta),[]);
});
