const $ = (q) => document.querySelector(q);
const content = $('#content');
const modal = $('#modal');
const modalContent = $('#modal-content');
let snapshot = null;
let view = 'overview';

const esc = (s='') => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (s) => s ? new Date(s).toLocaleString('ja-JP') : '—';
const chip = (s, cls='') => `<span class="chip ${cls}">${esc(s)}</span>`;

async function api(url, options={}) {
  const res = await fetch(url, { headers:{'content-type':'application/json'}, ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function refresh() {
  snapshot = await api('/api/snapshot');
  $('#company-name').textContent = snapshot.company.name;
  $('#mission').textContent = snapshot.company.mission;
  const dot = $('#git-dot');
  dot.className = 'dot ' + (snapshot.git.dirty ? 'dirty' : 'clean');
  $('#git-state').textContent = snapshot.git.dirty ? `Uncommitted ${snapshot.git.changedFiles.length}` : 'Working tree clean';
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
  const incidentsByRecent = [...snapshot.incidents].sort((a,b) => Date.parse(b.openedAt || 0) - Date.parse(a.openedAt || 0));
  const managerCards = snapshot.managers.map(m => `
    <div class="card manager">
      <span class="label">MANAGER JOB</span>
      <h3>${esc(m.title)}</h3>
      <p class="muted">${esc(m.mission)}</p>
      <div class="chips">${chip('Manager · '+m.managerMethod.id,'blue')}${chip('Worker · '+m.defaultWorkerMethod.id)}${chip('ready target '+m.readyInventoryTarget)}</div>
    </div>`).join('');
  return `
    <div class="grid kpis">
      ${kpi('Ready',c.ready,'claimable work')}
      ${kpi('Running',c.running,'live claims')}
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
    <div class="section"><div class="section-head"><h2>Managers</h2></div><div class="grid manager-grid">${managerCards || '<div class="empty">No managers</div>'}</div></div>
    <div class="section"><div class="section-head"><h2>Recent structural incidents</h2></div>${incidentList(incidentsByRecent.slice(0,5))}</div>
  `;
}

const statuses = ['backlog','ready','in_progress','running','blocked','review'];
function workCard(item) {
  return `<div class="work-card" data-id="${esc(item.id)}">
    <strong>${esc(item.title)}</strong>
    <div class="work-meta">${chip(item.priority,'priority-'+item.priority)}${chip(item.workerMethod?.id || 'no method')}${item.claim?.agentId?chip('claimed '+item.claim.agentId,'blue'):''}</div>
    <p class="muted">${esc(item.objective || '')}</p>
  </div>`;
}
function board() {
  const columns = statuses.map(status => {
    const items = snapshot.workItems.filter(x => x.status === status);
    return `<div class="column"><h3><span>${status}</span><span>${items.length}</span></h3>${items.map(workCard).join('') || '<div class="empty">empty</div>'}</div>`;
  }).join('');
  const archived = snapshot.workItems.filter(x => x.status === 'archived').slice(-8).reverse();
  return `<div class="board">${columns}</div>
    <div class="section"><div class="section-head"><h2>Recent archived</h2></div>
      <div class="grid manager-grid">${archived.map(workCard).join('') || '<div class="empty">No completed work yet</div>'}</div>
    </div>`;
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
  const ordered = [...snapshot.incidents].sort((a,b) => Date.parse(b.openedAt || 0) - Date.parse(a.openedAt || 0));
  const open = ordered.filter(x => x.status !== 'resolved');
  const resolved = ordered.filter(x => x.status === 'resolved');
  return `<div class="section-head"><h2>System Incidents</h2><button id="new-incident">+ Incident</button></div>
    ${incidentList(open)}
    <div class="section"><div class="section-head"><h2>Resolved</h2></div>${incidentList(resolved)}</div>`;
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
  const docs = await Promise.all(['operating','decisions','agents','architecture'].map(name => api('/api/document?name='+name)));
  const labels = {operating:'Operating Model',decisions:'Decision Log',agents:'Agent Contract',architecture:'Architecture'};
  content.innerHTML = `<div class="docs"><div class="doc-nav">${docs.map((d,i)=>`<button class="${i===0?'':'secondary'}" data-doc="${i}">${labels[d.name]}</button>`).join('')}</div><div class="card doc" id="doc-body">${esc(docs[0].markdown)}</div></div>`;
  content.querySelectorAll('[data-doc]').forEach(btn => btn.onclick = () => {
    content.querySelectorAll('[data-doc]').forEach(x=>x.className='secondary');
    btn.className='';
    $('#doc-body').textContent = docs[Number(btn.dataset.doc)].markdown;
  });
}

function workDetail(item) {
  const canMove = item.status !== 'running';
  openModal(`<h2>${esc(item.title)}</h2><p class="muted">${esc(item.id)}</p><p>${esc(item.objective||'')}</p>
    <div class="runtime">${esc(JSON.stringify(item,null,2))}</div>
    ${canMove?`<div class="section row"><label>Status <select id="detail-status">${[...statuses,'archived'].map(s=>`<option ${s===item.status?'selected':''}>${s}</option>`).join('')}</select></label><button id="save-status">Save status</button></div>`:''}`);
  if (canMove) $('#save-status').onclick = async () => {
    await api('/api/work-items/'+encodeURIComponent(item.id), {method:'PATCH',body:JSON.stringify({status:$('#detail-status').value})});
    modal.close(); await refresh();
  };
}

function newWorkModal() {
  openModal(`<h2>New Work Item</h2><div class="form-grid">
    <label>Title<input id="nw-title" autofocus></label>
    <label>Objective<textarea id="nw-objective"></textarea></label>
    <label>Priority<select id="nw-priority"><option>medium</option><option>high</option><option>critical</option><option>low</option></select></label>
    <label>Acceptance criterion<input id="nw-accept"></label>
    <button id="nw-save">Create local Work Item</button>
    <p class="muted">This writes a repository file locally. Commit/push it to make it durable for remote agents.</p>
  </div>`);
  $('#nw-save').onclick = async (event) => {
    event.preventDefault();
    await api('/api/work-items',{method:'POST',body:JSON.stringify({
      title:$('#nw-title').value,
      objective:$('#nw-objective').value,
      priority:$('#nw-priority').value,
      acceptanceCriteria:$('#nw-accept').value?[ $('#nw-accept').value ]:[],
    })});
    modal.close(); await refresh();
  };
}

function newIncidentModal() {
  openModal(`<h2>New Incident</h2><div class="form-grid">
    <label>Title<input id="ni-title"></label>
    <label>Symptom<textarea id="ni-symptom"></textarea></label>
    <label>Severity<select id="ni-severity"><option>medium</option><option>high</option><option>critical</option><option>low</option></select></label>
    <button id="ni-save">Create Incident</button>
  </div>`);
  $('#ni-save').onclick = async (event) => {
    event.preventDefault();
    await api('/api/incidents',{method:'POST',body:JSON.stringify({
      title:$('#ni-title').value,
      symptom:$('#ni-symptom').value,
      severity:$('#ni-severity').value,
      detectedBy:'human',
    })});
    modal.close(); await refresh();
  };
}

async function render() {
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('active', b.dataset.view===view));
  if (view==='overview') content.innerHTML=overview();
  if (view==='work') content.innerHTML=board();
  if (view==='incidents') content.innerHTML=incidents();
  if (view==='methods') content.innerHTML=methods();
  if (view==='governance') return governance();

  content.querySelectorAll('.work-card').forEach(el => el.onclick = () => workDetail(snapshot.workItems.find(x=>x.id===el.dataset.id)));
  const ni=$('#new-incident'); if(ni) ni.onclick=newIncidentModal;
}

document.querySelectorAll('#nav button').forEach(b => b.onclick=()=>{view=b.dataset.view;render()});
$('#refresh').onclick=refresh;
$('#new-work').onclick=newWorkModal;

refresh().catch(error => {
  content.innerHTML = '<div class="card error">'+esc(error.message)+'</div>';
});
