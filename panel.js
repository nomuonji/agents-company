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
  const [company, workState, incidentState, managersState, runsState] = await Promise.all([
    fetchJson('./company/company.json'),
    fetchJson('./company/state/work-items.json'),
    fetchJson('./company/state/incidents.json'),
    fetchJson('./company/state/managers.json'),
    fetchJson('./company/state/manager-runs.json'),
  ]);

  const managers = await Promise.all(
    (company.managerJobIds || []).map((id) => fetchJson(`./company/managers/${id}.json`))
  );

  const methodMap = new Map();
  for (const manager of managers) {
    for (const [role, ref] of [['manager',manager.managerMethod],['worker',manager.defaultWorkerMethod]]) {
      if (!ref?.id) continue;
      const key = role + ':' + ref.id + ':' + (ref.version || 'active');
      if (!methodMap.has(key)) methodMap.set(key, resolveMethod(role, ref));
    }
  }
  for (const item of workState.items || []) {
    const ref = item.workerMethod;
    if (!ref?.id) continue;
    const key = 'worker:' + ref.id + ':' + (ref.version || 'active');
    if (!methodMap.has(key)) methodMap.set(key, resolveMethod('worker', ref));
  }
  const methods = await Promise.all([...methodMap.values()]);

  const workItems = workState.items || [];
  const counts = Object.fromEntries(
    ['backlog','ready','in_progress','running','blocked','review','archived']
      .map(status => [status, workItems.filter(x => x.status === status).length])
  );

  return {
    company,
    managers,
    workItems,
    incidents:incidentState.items || [],
    managerState:managersState,
    managerRuns:runsState.runs || [],
    methods,
    counts,
    revisions:{
      workItems:workState.revision,
      incidents:incidentState.revision,
      managers:managersState.revision,
      managerRuns:runsState.revision,
    },
    generatedAt:new Date().toISOString(),
  };
}

async function refresh() {
  content.innerHTML = '<div class="empty">Loading company state…</div>';
  snapshot = await loadSnapshot();
  $('#company-name').textContent = snapshot.company.name;
  $('#mission').textContent = snapshot.company.mission;
  $('#updated').textContent = 'fetched ' + new Date().toLocaleTimeString('ja-JP');
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
  const openInc = snapshot.incidents.filter(x => x.status !== 'resolved').length;
  const incidentsByRecent = [...snapshot.incidents].sort((a,b) => Date.parse(b.openedAt || 0)-Date.parse(a.openedAt || 0));
  const managerCards = snapshot.managers.map(m => {
    const live = snapshot.managerState.managers?.[m.id]?.lease;
    return `<div class="card manager">
      <div class="row"><span class="label">MANAGER JOB</span>${live?.claimedBy ? chip('running · '+live.claimedBy,'blue') : chip('idle')}</div>
      <h3>${esc(m.title)}</h3>
      <p class="muted">${esc(m.mission)}</p>
      <div class="chips">
        ${chip('Manager · '+m.managerMethod.id,'blue')}
        ${chip('Worker · '+m.defaultWorkerMethod.id)}
        ${chip('ready target '+m.readyInventoryTarget)}
      </div>
    </div>`;
  }).join('');

  return `
    <div class="grid kpis">
      ${kpi('Ready',c.ready,'claimable work')}
      ${kpi('Running',c.running,'live worker claims')}
      ${kpi('Working',c.in_progress,'resumable')}
      ${kpi('Blocked / Review',c.blocked+c.review,'manager attention')}
      ${kpi('Incidents',openInc,'structural problems')}
    </div>

    <div class="office">
      <div class="role"><div class="emoji">👤</div><strong>Human</strong><div class="muted">mission / approval</div></div><div class="arrow">→</div>
      <div class="role"><div class="emoji">🧭</div><strong>Manager</strong><div class="muted">observe / delegate</div></div><div class="arrow">→</div>
      <div class="role"><div class="emoji">🤖</div><strong>Worker</strong><div class="muted">execute / validate</div></div><div class="arrow">→</div>
      <div class="role"><div class="emoji">🧯</div><strong>Escalation</strong><div class="muted">incident / human</div></div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Managers</h2></div>
      <div class="grid manager-grid">${managerCards || '<div class="empty">No managers</div>'}</div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Recent structural incidents</h2></div>
      ${incidentList(incidentsByRecent.slice(0,5))}
    </div>

    <div class="section">
      <div class="section-head"><h2>State revisions</h2></div>
      <div class="revision-row">
        ${Object.entries(snapshot.revisions).map(([k,v])=>chip(k+' · r'+v)).join('')}
      </div>
    </div>
  `;
}

const statuses = ['backlog','ready','in_progress','running','blocked','review'];

function workCard(item) {
  return `<div class="work-card" data-id="${esc(item.id)}">
    <strong>${esc(item.title)}</strong>
    <div class="work-meta">
      ${chip(item.priority,'priority-'+item.priority)}
      ${chip(item.workerMethod?.id || 'no method')}
      ${item.workerMethodVersion ? chip(item.workerMethodVersion,'blue') : ''}
      ${item.claim?.agentId ? chip('claimed '+item.claim.agentId,'blue') : ''}
    </div>
    <p class="muted">${esc(item.objective || '')}</p>
  </div>`;
}

function board() {
  const columns = statuses.map(status => {
    const items = snapshot.workItems.filter(x => x.status === status);
    return `<div class="column">
      <h3><span>${status}</span><span>${items.length}</span></h3>
      ${items.map(workCard).join('') || '<div class="empty">empty</div>'}
    </div>`;
  }).join('');

  const archived = snapshot.workItems.filter(x => x.status === 'archived').slice(-8).reverse();
  return `
    <div class="board">${columns}</div>
    <div class="section">
      <div class="section-head"><h2>Recent archived</h2></div>
      <div class="grid manager-grid">${archived.map(workCard).join('') || '<div class="empty">No completed work yet</div>'}</div>
    </div>
  `;
}

function incidentList(items) {
  if (!items.length) return '<div class="empty">No incidents</div>';
  return `<div class="grid">${items.map(x => `<div class="card incident ${esc(x.severity)}">
    <div class="row"><strong>${esc(x.title)}</strong><span class="right">${chip(x.status)} ${chip(x.severity)}</span></div>
    <p>${esc(x.symptom)}</p>
    <div class="muted">opened ${fmt(x.openedAt)}${x.rootCause?'<br>root cause: '+esc(x.rootCause):''}</div>
  </div>`).join('')}</div>`;
}

function incidents() {
  const ordered = [...snapshot.incidents].sort((a,b)=>Date.parse(b.openedAt||0)-Date.parse(a.openedAt||0));
  const open = ordered.filter(x => x.status !== 'resolved');
  const resolved = ordered.filter(x => x.status === 'resolved');
  return `
    <div class="section-head"><h2>System Incidents</h2><span class="muted">canonical: company/state/incidents.json</span></div>
    ${incidentList(open)}
    <div class="section"><div class="section-head"><h2>Resolved</h2></div>${incidentList(resolved)}</div>
  `;
}

function methods() {
  return `<div class="grid method-grid">${snapshot.methods.map(m => `
    <div class="card method-card">
      <div class="row"><span class="label">${esc(m.role.toUpperCase())} METHOD</span><span class="right">${chip(m.activeVersion,'blue')}</span></div>
      <h3>${esc(m.title)}</h3>
      <div class="runtime">${esc(JSON.stringify(m.runtimeRequirements,null,2))}</div>
      <div class="section"><span class="label">QUALITY GATES</span><ul>${m.qualityGates.map(g=>'<li>'+esc(g)+'</li>').join('')}</ul></div>
    </div>`).join('')}</div>`;
}

async function governance() {
  content.innerHTML = '<div class="empty">Loading documents…</div>';
  const specs = [
    ['operating','Operating Model','./company/OPERATING_MODEL.md'],
    ['decisions','Decision Log','./company/DECISION_LOG.md'],
    ['agents','Agent Contract','./AGENTS.md'],
    ['architecture','Architecture','./docs/ARCHITECTURE.md'],
  ];
  const docs = await Promise.all(specs.map(async ([name,label,path]) => ({name,label,path,markdown:await fetchText(path)})));
  content.innerHTML = `<div class="docs">
    <div class="doc-nav">${docs.map((d,i)=>`<button class="${i===0?'':'secondary'}" data-doc="${i}">${esc(d.label)}</button>`).join('')}</div>
    <div class="card doc" id="doc-body"></div>
  </div>`;
  $('#doc-body').textContent = docs[0].markdown;
  content.querySelectorAll('[data-doc]').forEach(btn => btn.onclick = () => {
    content.querySelectorAll('[data-doc]').forEach(x=>x.className='secondary');
    btn.className='';
    $('#doc-body').textContent = docs[Number(btn.dataset.doc)].markdown;
  });
}

function workDetail(item) {
  openModal(`
    <h2>${esc(item.title)}</h2>
    <p class="muted">${esc(item.id)} · read-only</p>
    <p>${esc(item.objective||'')}</p>
    <div class="runtime">${esc(JSON.stringify(item,null,2))}</div>
  `);
}

async function render() {
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('active',b.dataset.view===view));
  if (view==='overview') content.innerHTML=overview();
  if (view==='work') content.innerHTML=board();
  if (view==='incidents') content.innerHTML=incidents();
  if (view==='methods') content.innerHTML=methods();
  if (view==='governance') return governance();

  content.querySelectorAll('.work-card').forEach(el => {
    el.onclick = () => workDetail(snapshot.workItems.find(x=>x.id===el.dataset.id));
  });
}

document.querySelectorAll('#nav button').forEach(b => b.onclick=()=>{view=b.dataset.view;render()});
$('#refresh').onclick=()=>refresh().catch(showError);

function showError(error) {
  console.error(error);
  content.innerHTML = `<div class="card error"><strong>Failed to load remote company state.</strong><p>${esc(error.message)}</p><p class="muted">GitHub Pages must publish the repository root so company/ files are reachable.</p></div>`;
}

refresh().catch(showError);
