import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export const WORK_STATES = ['backlog','ready','in_progress','running','blocked','review','archived'];
export const PRIORITIES = ['critical','high','medium','low'];

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

export async function writeJsonAtomic(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp-' + process.pid + '-' + Date.now();
  await fs.writeFile(tmp, JSON.stringify(value, null, 2) + '\n', 'utf8');
  await fs.rename(tmp, file);
}

export async function listJson(dir) {
  let names = [];
  try {
    names = await fs.readdir(dir);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const rows = [];
  for (const name of names.filter((name) => name.endsWith('.json')).sort()) {
    rows.push(await readJson(path.join(dir, name)));
  }
  return rows;
}

export function nowIso() {
  return new Date().toISOString();
}

export function newId(prefix) {
  return prefix + '-' + randomUUID().replaceAll('-', '').slice(0, 12);
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
  const managers = await listJson(path.join(root, 'company', 'managers'));
  const workItems = await listJson(path.join(root, 'company', 'state', 'work-items'));
  const incidents = await listJson(path.join(root, 'company', 'state', 'incidents'));
  const managerRuns = await listJson(path.join(root, 'company', 'state', 'manager-runs'));
  const managerLeases = await listJson(path.join(root, 'company', 'state', 'manager-leases'));

  const methodSummaries = [];
  for (const role of ['manager','worker']) {
    const roleDir = path.join(root, 'company', 'methods', role);
    let methodIds = [];
    try { methodIds = await fs.readdir(roleDir); } catch {}
    for (const id of methodIds.sort()) {
      try {
        const method = await resolveMethod(root, role, { id, version:'active' });
        methodSummaries.push({
          role,
          id,
          title: method.manifest.title,
          activeVersion: method.version,
          runtimeRequirements: method.spec.runtimeRequirements,
          qualityGates: method.spec.qualityGates || [],
        });
      } catch {}
    }
  }

  const counts = Object.fromEntries(WORK_STATES.map((status) => [
    status,
    workItems.filter((item) => item.status === status).length,
  ]));

  return {
    company,
    managers,
    workItems,
    incidents,
    managerRuns,
    managerLeases,
    methods: methodSummaries,
    counts,
    generatedAt: nowIso(),
  };
}

export async function createWorkItem(rootInput, input = {}) {
  const root = rootInput || await findRepoRoot();
  const id = input.id || newId('wi');
  const createdAt = nowIso();
  const item = {
    schemaVersion:1,
    id,
    title:String(input.title || 'Untitled Work Item'),
    objective:String(input.objective || ''),
    status:input.status || 'ready',
    priority:PRIORITIES.includes(input.priority) ? input.priority : 'medium',
    managerJobId:input.managerJobId || 'general-manager',
    workerMethod:input.workerMethod || { id:'general-worker', version:'active' },
    workerMethodVersion:null,
    dedupeKey:input.dedupeKey || null,
    acceptanceCriteria:Array.isArray(input.acceptanceCriteria) ? input.acceptanceCriteria : [],
    execution:{
      requiredTools:input.execution?.requiredTools || ['github'],
      requiredCapabilities:input.execution?.requiredCapabilities || ['repo_read','repo_write'],
      validationStrategy:input.execution?.validationStrategy || { type:'explicit', checks:[] },
      deliveryMode:input.execution?.deliveryMode || 'direct_commit',
    },
    claim:null,
    escalation:null,
    executionReceipt:null,
    resultSummary:null,
    createdAt,
    updatedAt:createdAt,
    finishedAt:null,
  };
  const errors = validateWorkItem(item);
  if (errors.length) throw new Error(errors.join('; '));
  await writeJsonAtomic(path.join(root, 'company', 'state', 'work-items', id + '.json'), item);
  return item;
}

export async function patchWorkItem(rootInput, id, patch = {}) {
  const root = rootInput || await findRepoRoot();
  const file = path.join(root, 'company', 'state', 'work-items', id + '.json');
  const current = await readJson(file);
  const next = { ...current, ...patch, updatedAt: nowIso() };
  if (patch.status === 'archived' && !patch.finishedAt) next.finishedAt = nowIso();
  if (patch.status && patch.status !== 'running' && !('claim' in patch)) next.claim = null;
  const errors = validateWorkItem(next);
  if (errors.length) throw new Error(errors.join('; '));
  await writeJsonAtomic(file, next);
  return next;
}

export async function createIncident(rootInput, input = {}) {
  const root = rootInput || await findRepoRoot();
  const id = input.id || newId('inc');
  const openedAt = nowIso();
  const incident = {
    schemaVersion:1,
    id,
    title:String(input.title || 'Untitled Incident'),
    status:input.status || 'open',
    severity:input.severity || 'medium',
    detectedBy:input.detectedBy || 'human',
    managerJobIds:input.managerJobIds || ['general-manager'],
    relatedWorkItemIds:input.relatedWorkItemIds || [],
    symptom:String(input.symptom || ''),
    rootCause:input.rootCause || null,
    fix:input.fix || null,
    regressionCheck:input.regressionCheck || null,
    prevention:input.prevention || null,
    operatingModelChanged:Boolean(input.operatingModelChanged),
    githubIssue:input.githubIssue || null,
    openedAt,
    resolvedAt:input.resolvedAt || null,
  };
  const errors = validateIncident(incident);
  if (errors.length) throw new Error(errors.join('; '));
  await writeJsonAtomic(path.join(root, 'company', 'state', 'incidents', id + '.json'), incident);
  return incident;
}
