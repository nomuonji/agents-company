import path from 'node:path';
import {
  findRepoRoot,
  loadSnapshot,
  resolveMethod,
  validateIncident,
  validateWorkItem,
} from './index.mjs';

const root = await findRepoRoot();
const snapshot = await loadSnapshot(root);
const errors = [];
const warnings = [];

for (const manager of snapshot.managers) {
  for (const [role, ref] of [['manager', manager.managerMethod], ['worker', manager.defaultWorkerMethod]]) {
    try { await resolveMethod(root, role, ref); }
    catch (error) { errors.push(`manager ${manager.id}: ${error.message}`); }
  }
}

const dedupe = new Map();
for (const item of snapshot.workItems) {
  for (const error of validateWorkItem(item)) errors.push(`work-item ${item.id}: ${error}`);
  try { await resolveMethod(root, 'worker', item.workerMethod); }
  catch (error) { errors.push(`work-item ${item.id}: ${error.message}`); }

  if (item.dedupeKey && !['archived'].includes(item.status)) {
    if (dedupe.has(item.dedupeKey)) {
      errors.push(`duplicate open dedupeKey ${item.dedupeKey}: ${dedupe.get(item.dedupeKey)} and ${item.id}`);
    } else dedupe.set(item.dedupeKey, item.id);
  }

  if (item.status === 'running' && item.claim?.leaseExpiresAt && Date.parse(item.claim.leaseExpiresAt) < Date.now()) {
    warnings.push(`work-item ${item.id}: running lease is expired`);
  }
}

for (const incident of snapshot.incidents) {
  for (const error of validateIncident(incident)) errors.push(`incident ${incident.id}: ${error}`);
}

console.log(`Agents Company validation — ${path.basename(root)}`);
console.log(`Managers: ${snapshot.managers.length} · Work Items: ${snapshot.workItems.length} · Incidents: ${snapshot.incidents.length}`);
for (const warning of warnings) console.warn('WARN:', warning);
for (const error of errors) console.error('ERROR:', error);
if (errors.length) process.exitCode = 1;
else console.log('OK: operating state is valid.');
