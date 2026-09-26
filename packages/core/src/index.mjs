import { promises as fs } from 'node:fs';
import path from 'node:path';

export const WORK_STATES = ['backlog','ready','running','in_progress','blocked','review','archived'];

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

export function parseIssueMeta(body = '') {
  const match = String(body).match(/<!--\s*agents-company:meta\s*([\s\S]*?)-->/);
  if (!match) return null;
  try { return JSON.parse(match[1].trim()); }
  catch { return null; }
}

export function validateWorkIssueMeta(meta) {
  const errors = [];
  if (meta?.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (meta?.kind !== 'work') errors.push('kind must be work');
  if (!WORK_STATES.includes(meta?.status)) errors.push('invalid status');
  if (!['critical','high','medium','low'].includes(meta?.priority)) errors.push('invalid priority');
  if (!meta?.managerJobId) errors.push('missing managerJobId');
  if (!meta?.workerMethod?.id) errors.push('missing workerMethod.id');
  if (!meta?.execution?.validationStrategy) errors.push('missing execution.validationStrategy');
  if (meta?.status === 'running' && !meta?.workerMethodVersion) errors.push('running requires workerMethodVersion');
  if (meta?.status === 'review' && meta?.executionReceipt?.validationComplete !== true) {
    errors.push('review requires executionReceipt.validationComplete=true');
  }
  if (meta?.status === 'archived' && !meta?.finishedAt) errors.push('archived requires finishedAt');
  return errors;
}

export function validateIncidentIssueMeta(meta) {
  const errors = [];
  if (meta?.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (meta?.kind !== 'incident') errors.push('kind must be incident');
  if (!['open','investigating','resolved'].includes(meta?.status)) errors.push('invalid status');
  if (!['low','medium','high','critical'].includes(meta?.severity)) errors.push('invalid severity');
  if (!['worker','manager','human'].includes(meta?.detectedBy)) errors.push('invalid detectedBy');
  if (!Array.isArray(meta?.managerJobIds)) errors.push('managerJobIds must be an array');
  if (meta?.status === 'resolved') {
    for (const key of ['rootCause','fix','regressionCheck','prevention','resolvedAt']) {
      if (!meta?.[key]) errors.push('resolved incident missing ' + key);
    }
  }
  return errors;
}

export async function loadRepositorySnapshot(rootInput) {
  const root = rootInput || await findRepoRoot();
  const company = await readJson(path.join(root, 'company', 'company.json'));
  const managersState = await readJson(path.join(root, 'company', 'state', 'managers.json'));
  const managerRunsState = await readJson(path.join(root, 'company', 'state', 'manager-runs.json'));

  const managers = [];
  const methods = [];
  const seen = new Set();

  for (const id of company.managerJobIds || []) {
    const manager = await readJson(path.join(root, 'company', 'managers', id + '.json'));
    managers.push(manager);
    for (const [role, ref] of [['manager',manager.managerMethod],['worker',manager.defaultWorkerMethod]]) {
      if (!ref?.id) continue;
      const key = role + ':' + ref.id + ':' + (ref.version || 'active');
      if (seen.has(key)) continue;
      seen.add(key);
      const method = await resolveMethod(root, role, ref);
      methods.push({
        role,
        id:method.spec.methodId,
        title:method.manifest.title,
        activeVersion:method.version,
        runtimeRequirements:method.spec.runtimeRequirements || {},
        qualityGates:method.spec.qualityGates || [],
      });
    }
  }

  return {
    company,
    managers,
    managerState:managersState,
    managerRuns:managerRunsState.runs || [],
    methods,
  };
}
