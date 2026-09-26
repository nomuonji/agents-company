import { promises as fs } from 'node:fs';
import path from 'node:path';

export const WORK_STATES = ['backlog','ready','in_progress','running','blocked','review','archived'];

export async function findRepoRoot(start = process.cwd()) {
  let current = path.resolve(start);
  while (true) {
    try {
      await fs.access(path.join(current, 'company', 'company.json'));
      return current;
    } catch {}
    const parent = path.dirname(current);
    if (parent === current) throw new Error('Could not find company/company.json from ' + start);
    current = parent;
  }
}

export async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

export async function readText(file) {
  return fs.readFile(file, 'utf8');
}

export function leaseIsLive(claim, now = Date.now()) {
  if (!claim?.leaseExpiresAt) return false;
  const expires = Date.parse(claim.leaseExpiresAt);
  return Number.isFinite(expires) && expires > now;
}

export function normalizeRuntimeRequirements(value = {}) {
  const uniq = (xs) => [...new Set(Array.isArray(xs) ? xs.filter(Boolean).map(String) : [])];
  return {
    requiredTools: uniq(value.requiredTools),
    requiredCapabilities: uniq(value.requiredCapabilities),
    optionalTools: uniq(value.optionalTools),
    optionalCapabilities: uniq(value.optionalCapabilities),
  };
}

export function mergeRuntimeRequirements(...requirements) {
  const normalized = requirements.map(normalizeRuntimeRequirements);
  return normalizeRuntimeRequirements({
    requiredTools: normalized.flatMap((x) => x.requiredTools),
    requiredCapabilities: normalized.flatMap((x) => x.requiredCapabilities),
    optionalTools: normalized.flatMap((x) => x.optionalTools),
    optionalCapabilities: normalized.flatMap((x) => x.optionalCapabilities),
  });
}

export function compareRuntime(requirements, availability = {}) {
  const req = normalizeRuntimeRequirements(requirements);
  const tools = new Set(availability.tools || []);
  const caps = new Set(availability.capabilities || []);
  const missingTools = req.requiredTools.filter((x) => !tools.has(x));
  const missingCapabilities = req.requiredCapabilities.filter((x) => !caps.has(x));
  return {
    ok: missingTools.length === 0 && missingCapabilities.length === 0,
    missingTools,
    missingCapabilities,
  };
}

export async function resolveMethod(root, role, ref) {
  if (!ref?.id) return null;
  const base = path.join(root, 'company', 'methods', role, ref.id);
  const manifest = await readJson(path.join(base, 'manifest.json'));
  const version = !ref.version || ref.version === 'active' ? manifest.activeVersion : ref.version;
  if (!manifest.versions.includes(version)) throw new Error(`Unknown ${role} Method version ${ref.id}@${version}`);
  const spec = await readJson(path.join(base, 'versions', version + '.json'));
  const manual = await readText(path.join(base, 'versions', version + '.md'));
  return { manifest, version, spec, manual };
}

export function validateWorkItem(item) {
  const errors = [];
  if (!item?.id) errors.push('missing id');
  if (!item?.title) errors.push('missing title');
  if (!WORK_STATES.includes(item?.status)) errors.push('invalid status');
  if (item?.status === 'ready') {
    if (!item.workerMethod?.id) errors.push('ready item missing workerMethod');
    if (!item.execution?.validationStrategy) errors.push('ready item missing execution.validationStrategy');
  }
  if (item?.status === 'running') {
    if (!item.claim?.agentId) errors.push('running item missing claim.agentId');
    if (!item.claim?.leaseExpiresAt) errors.push('running item missing claim.leaseExpiresAt');
    if (!item.workerMethodVersion) errors.push('running item missing pinned workerMethodVersion');
  }
  if (item?.status === 'review' && item.executionReceipt?.validationComplete !== true) {
    errors.push('review requires executionReceipt.validationComplete=true');
  }
  if (item?.status === 'archived' && !item.finishedAt) errors.push('archived item missing finishedAt');
  return errors;
}

export function validateIncident(incident) {
  const errors = [];
  if (!incident?.id) errors.push('missing id');
  if (!['open','investigating','resolved'].includes(incident?.status)) errors.push('invalid status');
  if (!incident?.title) errors.push('missing title');
  if (!incident?.symptom) errors.push('missing symptom');
  if (incident?.status === 'resolved') {
    for (const key of ['rootCause','fix','regressionCheck','prevention','resolvedAt']) {
      if (!incident?.[key]) errors.push('resolved incident missing ' + key);
    }
  }
  return errors;
}

export async function loadSnapshot(rootInput) {
  const root = rootInput || await findRepoRoot();
  const company = await readJson(path.join(root, 'company', 'company.json'));
  const workState = await readJson(path.join(root, 'company', 'state', 'work-items.json'));
  const incidentState = await readJson(path.join(root, 'company', 'state', 'incidents.json'));
  const managersState = await readJson(path.join(root, 'company', 'state', 'managers.json'));
  const managerRunsState = await readJson(path.join(root, 'company', 'state', 'manager-runs.json'));

  const managers = [];
  for (const id of company.managerJobIds || []) {
    managers.push(await readJson(path.join(root, 'company', 'managers', id + '.json')));
  }

  const workItems = workState.items || [];
  const incidents = incidentState.items || [];
  const managerRuns = managerRunsState.runs || [];

  const methodMap = new Map();
  for (const manager of managers) {
    for (const [role, ref] of [['manager',manager.managerMethod],['worker',manager.defaultWorkerMethod]]) {
      if (!ref?.id) continue;
      const key = role + ':' + ref.id + ':' + (ref.version || 'active');
      if (!methodMap.has(key)) methodMap.set(key, await resolveMethod(root, role, ref));
    }
  }
  for (const item of workItems) {
    const ref = item.workerMethod;
    if (!ref?.id) continue;
    const key = 'worker:' + ref.id + ':' + (ref.version || 'active');
    if (!methodMap.has(key)) methodMap.set(key, await resolveMethod(root, 'worker', ref));
  }

  const methods = [...methodMap.values()].map((method) => ({
    role:method.spec.role,
    id:method.spec.methodId,
    title:method.manifest.title,
    activeVersion:method.version,
    runtimeRequirements:method.spec.runtimeRequirements || {},
    qualityGates:method.spec.qualityGates || [],
  }));

  const counts = Object.fromEntries(WORK_STATES.map((status) => [
    status,
    workItems.filter((item) => item.status === status).length,
  ]));

  return {
    company,
    managers,
    workItems,
    incidents,
    managerState:managersState,
    managerRuns,
    methods,
    counts,
    revisions:{
      workItems:workState.revision,
      incidents:incidentState.revision,
      managers:managersState.revision,
      managerRuns:managerRunsState.revision,
    },
  };
}
