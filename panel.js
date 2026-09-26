const $ = (q) => document.querySelector(q);
const content = $('#content');
const modal = $('#modal');
const modalContent = $('#modal-content');
let snapshot = null;
let view = 'overview';

const esc = (s='') => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (s) => s ? new Date(s).toLocaleString('ja-JP') : '—';
const chip = (s, cls='') => `<span class="chip ${cls}">${esc(s)}</span>`;

async function fetchJson(path) {
  const url = new URL(path, window.location.href);
  url.searchParams.set('_', Date.now());
  const res = await fetch(url, { cache:'no-store' });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

async function fetchText(path) {
  const url = new URL(path, window.location.href);
  url.searchParams.set('_', Date.now());
  const res = await fetch(url, { cache:'no-store' });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.text();
}

function parseMeta(body='') {
  const match = String(body).match(/<!--\s*agents-company:meta\s*([\s\S]*?)-->/);
  if (!match) return null;
  try { return JSON.parse(match[1].trim()); }
  catch { return null; }
}

async function fetchPublicIssues(repositoryFullName) {
  const rows = [];
  for (let page = 1; page <= 20; page += 1) {
    const url = `https://api.github.com/repos/${repositoryFullName}/issues?state=all&per_page=100&page=${page}&sort=updated&direction=desc`;
    const res = await fetch(url, {
      headers:{ Accept:'application/vnd.github+json' },
      cache:'no-store',
    });
    if (!res.ok) throw new Error(`GitHub Issues API: HTTP ${res.status}`);
    const batch = await res.json();
    rows.push(...batch.filter((issue) => !issue.pull_request));
    if (batch.length < 100) break;
  }
  return rows;
}

async function fetchIssueSource(company) {
  if (company.panel?.issueSource === 'snapshot') {
    const data = await fetchJson('./' + (company.panel.privateSnapshotPath || 'panel-data/issues.json'));
    return Array.isArray(data) ? data : (data.issues || []);
  }
  return fetchPublicIssues(company.github.repositoryFullName);
}

function normalizeIssue(issue) {
  const meta = parseMeta(issue.body || '');
  if (!meta || !['work','incident'].includes(meta.kind)) return null;
  const closed = issue.state === 'closed';
  return {
    number:issue.number,
    id:'#' + issue.number,
    title:issue.title,
    body:issue.body || '',
    url:issue.html_url || issue.url || '',
    issueState:issue.state,
    createdAt:issue.created_at,
    updatedAt:issue.updated_at,
    closedAt:issue.closed_at,
    labels:(issue.labels || []).map((x) => typeof x === 'string' ? x : x.name),
    assignees:(issue.assignees || []).map((x) => x.login),
    meta:{
      ...meta,
      status:meta.kind === 'work' && closed ? 'archived'
        : meta.kind === 'incident' && closed ? 'resolved'
        : meta.status,
    },
  };
}

async function resolveMethod(role, ref) {
  if (!ref?.id) return null;
  const base = `./company/methods/${role}/${ref.id}`;
  const manifest = await fetchJson(`${base}/manifest.json`);
  const version = !ref.version || ref.version === 'active' ? manifest.activeVersion : ref.version;
  const spec = await fetchJson(`${base}/versions/${version}.json`);
  return {
    role,
    id:ref.id,
    title:manifest.title,
    activeVersion:version,
    runtimeRequirements:spec.runtimeRequirements || {},
    qualityGates:spec.qualityGates || [],
  };
}

async function loadSnapshot() {
  const company = await fetchJson('./company/company.json');
  const [rawIssues, managersState, runsState] = await Promise.all([
    fetchIssueSource(company),
    fetchJson('./company/state/managers.json'),
    fetchJson('./company/state/manager-runs.json'),
  ]);

  const issues = rawIssues.map(normalizeIssue).filter(Boolean);
  const workIssues = issues.filter((x) => x.meta.kind === 'work');
  const incidentIssues = issues.filter((x) => x.meta.kind === 'incident');

  const managers = await Promise.all(
    (company.managerJobIds || []).map((id) => fetchJson(`./company/managers/${id}.json`))
  );

  const methodRefs = new Map();
  for (const manager of managers) {
    for (const [role, ref] of [['manager', manager.managerMethod], ['worker', manager.defaultWorkerMethod]]) {
      if (!ref?.id) continue;
      methodRefs.set(`${role}:${ref.id}:${ref.version || 'active'}`, [role, ref]);
    }
  }
  for (const item of workIssues) {
    const ref = item.meta.workerMethod;
    if (!ref?.id) continue;
    methodRefs.set(`worker:${ref.id}:${ref.version || 'active'}`, ['worker', ref]);
  }
  const methods = await Promise.all([...methodRefs.values()].map(([role, ref]) => resolveMethod(role, ref)));

  const statuses = ['backlog','ready','in_progress','running','blocked','review','archived'];
  const counts = Object.fromEntries(statuses.map((status) => [
    status,
    workIssues.filter((item) => item.meta.status === status).length,
  ]));

  return {
    company,
    managers,
    workItems:workIssues,
    incidents:incidentIssues,
    managerState:managersState,
    managerRuns:runsState.runs || [],
    methods,
    counts,
    issueSource:company.panel?.issueSource || 'github-api-public',
    generatedAt:new Date().toISOString(),
  };
}

async function refresh() {
  content.innerHTML = '<div class="empty">Loading company state…</div>';
  snapshot = await loadSnapshot();
  $('#company-name').textContent = snapshot.company.name;
  $('#mission').textContent = snapshot.company.mission;
  $('#updated').textContent = `${snapshot.issueSource} · fetched ${new Date().toLocaleTimeString('ja-JP')}`;
  render();
}

function kpi(label, value, note) {
  return `<div class="card kpi"><span class="label">${esc(label)}</span><strong>${value}</strong><small>${esc(note)}</small></div>`;
}

function openModal(html) {
  modalContent.innerHTML = html;
  modal.showModal();
}

function overview() {
  const c = snapshot.counts;
  const openInc = snapshot.incidents.filter(x => x.meta.status !== 'resolved').length;
  const managerCards = snapshot.managers.map((m) => {
    const lease = snapshot.managerState.managers?.[m.id]?.lease;
    return `<div class="card manager">
      <div class="row"><span class="label">MANAGER JOB</span><span class="right">${lease?.claimedBy ? chip('running · '+lease.claimedBy,'blue') : chip('idle')}</span></div>
      <h3>${esc(m.title)}</h3>
      <p class="muted">${esc(m.mission)}</p>
      <div class="chips">${chip('Manager · '+m.managerMethod.id,'blue')}${chip('Worker · '+m.defaultWorkerMethod.id)}${chip('ready target '+m.readyInventoryTarget)}</div>
    </div>`;
  }).join('');

  return `
    <div class="grid kpis">
      ${kpi('Ready',c.ready,'open Work Issues')}
      ${kpi('Running',c.running,'claimed Work Issues')}
      ${kpi('Working',c.in_progress,'resumable')}
      ${kpi('Blocked / Review',c.blocked+c.review,'manager attention')}
      ${kpi('Incidents',openInc,'structural Issues')}
    </div>
    <div class="office">
      <div class="role"><div class="emoji">👤</div><strong>Human</strong><div class="muted">mission / approval</div></div><div class="arrow">→</div>
      <div class="role"><div class="emoji">🧭</div><strong>Manager</strong><div class="muted">observe / delegate</div></div><div class="arrow">→</div>
      <div class="role"><div class="emoji">🤖</div><strong>Worker</strong><div class="muted">execute / validate</div></div><div class="arrow">→</div>
      <div class="role"><div class="emoji">🧯</div><strong>Incident</strong><div class="muted">structural repair</div></div>
    </div>
    <div class="section"><div class="section-head"><h2>Managers</h2></div><div class="grid manager-grid">${managerCards || '<div class="empty">No managers</div>'}</div></div>
    <div class="section"><div class="section-head"><h2>Recent structural incidents</h2></div>${incidentList(snapshot.incidents.slice(0,5))}</div>
  `;
}

const statuses = ['backlog','ready','in_progress','running','blocked','review'];

function workCard(item) {
  const m = item.meta;
  return `<div class="work-card" data-number="${item.number}">
    <strong>${esc(item.title)}</strong>
    <div class="work-meta">
      ${chip(m.priority || 'medium','priority-'+(m.priority || 'medium'))}
      ${chip(m.workerMethod?.id || 'no method')}
      ${m.workerMethodVersion ? chip(m.workerMethodVersion,'blue') : ''}
      ${m.claim?.agentId ? chip('claimed '+m.claim.agentId,'blue') : ''}
    </div>
    <p class="muted">Issue #${item.number} · updated ${fmt(item.updatedAt)}</p>
  </div>`;
}

function board() {
  const columns = statuses.map((status) => {
    const items = snapshot.workItems.filter((x) => x.meta.status === status);
    return `<div class="column"><h3><span>${status}</span><span>${items.length}</span></h3>${items.map(workCard).join('') || '<div class="empty">empty</div>'}</div>`;
  }).join('');
  const archived = snapshot.workItems.filter((x) => x.meta.status === 'archived').slice(0,8);
  return `<div class="board">${columns}</div>
    <div class="section"><div class="section-head"><h2>Recent archived</h2></div><div class="grid manager-grid">${archived.map(workCard).join('') || '<div class="empty">No completed work yet</div>'}</div></div>`;
}

function incidentList(items) {
  if (!items.length) return '<div class="empty">No incidents</div>';
  return `<div class="grid">${items.map((x) => `<div class="card incident ${esc(x.meta.severity || 'medium')}">
    <div class="row"><strong><a href="${esc(x.url)}" target="_blank" rel="noreferrer">${esc(x.title)}</a></strong><span class="right">${chip(x.meta.status)} ${chip(x.meta.severity || 'medium')}</span></div>
    <p class="muted">Issue #${x.number} · updated ${fmt(x.updatedAt)}</p>
    ${x.meta.rootCause ? '<div>root cause: '+esc(x.meta.rootCause)+'</div>' : ''}
  </div>`).join('')}</div>`;
}

function incidents() {
  const open = snapshot.incidents.filter((x) => x.meta.status !== 'resolved');
  const resolved = snapshot.incidents.filter((x) => x.meta.status === 'resolved');
  return `<div class="section-head"><h2>System Incidents</h2><span class="muted">GitHub Issues</span></div>
    ${incidentList(open)}
    <div class="section"><div class="section-head"><h2>Resolved</h2></div>${incidentList(resolved)}</div>`;
}

function methods() {
  return `<div class="grid method-grid">${snapshot.methods.map((m) => `
    <div class="card method-card">
      <div class="row"><span class="label">${esc(m.role.toUpperCase())} METHOD</span><span class="right">${chip(m.activeVersion,'blue')}</span></div>
      <h3>${esc(m.title)}</h3>
      <div class="runtime">${esc(JSON.stringify(m.runtimeRequirements,null,2))}</div>
      <div class="section"><span class="label">QUALITY GATES</span><ul>${m.qualityGates.map((g) => '<li>'+esc(g)+'</li>').join('')}</ul></div>
    </div>`).join('')}</div>`;
}

async function governance() {
  content.innerHTML = '<div class="empty">Loading documents…</div>';
  const specs = [
    ['Operating Model','./company/OPERATING_MODEL.md'],
    ['Decision Log','./company/DECISION_LOG.md'],
    ['Agent Contract','./AGENTS.md'],
    ['Architecture','./docs/ARCHITECTURE.md'],
  ];
  const docs = await Promise.all(specs.map(async ([label,path]) => ({label,markdown:await fetchText(path)})));
  content.innerHTML = `<div class="docs"><div class="doc-nav">${docs.map((d,i) => `<button class="${i===0?'':'secondary'}" data-doc="${i}">${esc(d.label)}</button>`).join('')}</div><div class="card doc" id="doc-body"></div></div>`;
  $('#doc-body').textContent = docs[0].markdown;
  content.querySelectorAll('[data-doc]').forEach((btn) => btn.onclick = () => {
    content.querySelectorAll('[data-doc]').forEach((x) => x.className='secondary');
    btn.className='';
    $('#doc-body').textContent = docs[Number(btn.dataset.doc)].markdown;
  });
}

function workDetail(item) {
  openModal(`<h2>${esc(item.title)}</h2>
    <p><a href="${esc(item.url)}" target="_blank" rel="noreferrer">Open Issue #${item.number} on GitHub</a></p>
    <div class="runtime">${esc(JSON.stringify(item.meta,null,2))}</div>
    <div class="section"><pre class="runtime">${esc(item.body)}</pre></div>`);
}

async function render() {
  document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('active',b.dataset.view===view));
  if (view==='overview') content.innerHTML=overview();
  if (view==='work') content.innerHTML=board();
  if (view==='incidents') content.innerHTML=incidents();
  if (view==='methods') content.innerHTML=methods();
  if (view==='governance') return governance();

  content.querySelectorAll('.work-card').forEach((el) => {
    el.onclick = () => workDetail(snapshot.workItems.find((x) => x.number===Number(el.dataset.number)));
  });
}

document.querySelectorAll('#nav button').forEach((b) => b.onclick=()=>{view=b.dataset.view;render()});
$('#refresh').onclick=()=>refresh().catch(showError);

function showError(error) {
  console.error(error);
  content.innerHTML = `<div class="card error"><strong>Failed to load company state.</strong><p>${esc(error.message)}</p><p class="muted">Public mode reads GitHub Issues API directly. Private mode needs a server-side issue snapshot.</p></div>`;
}

refresh().catch(showError);
