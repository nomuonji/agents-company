import path from 'node:path';
import { findRepoRoot, loadRepositorySnapshot, resolveMethod } from './index.mjs';

const root = await findRepoRoot();
const snapshot = await loadRepositorySnapshot(root);
const errors = [];

for (const manager of snapshot.managers) {
  for (const [role, ref] of [['manager', manager.managerMethod], ['worker', manager.defaultWorkerMethod]]) {
    try { await resolveMethod(root, role, ref); }
    catch (error) { errors.push(`manager ${manager.id}: ${error.message}`); }
  }
  if (!snapshot.managerState.managers?.[manager.id]) errors.push(`manager ${manager.id}: missing managers.json state`);
}

if (!Array.isArray(snapshot.managerRuns)) errors.push('manager-runs.json runs must be an array');

console.log(`Agents Company validation — ${path.basename(root)}`);
console.log(`Managers: ${snapshot.managers.length} · Methods: ${snapshot.methods.length}`);
for (const error of errors) console.error('ERROR:', error);
if (errors.length) process.exitCode = 1;
else console.log('OK: repository control-plane files are valid. Work/Incident Issues are validated at runtime.');
