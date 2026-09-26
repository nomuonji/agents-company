import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  createIncident,
  createWorkItem,
  findRepoRoot,
  loadSnapshot,
  patchWorkItem,
  readText,
} from '../../packages/core/src/index.mjs';

const execFileAsync = promisify(execFile);
const root = await findRepoRoot(path.dirname(fileURLToPath(import.meta.url)));
const publicDir = path.join(root, 'apps', 'panel', 'public');
const port = Number(process.env.PORT || 4310);

function json(res, status, value) {
  res.writeHead(status, { 'content-type':'application/json; charset=utf-8' });
  res.end(JSON.stringify(value));
}

async function body(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

async function gitStatus() {
  try {
    const { stdout } = await execFileAsync('git', ['status','--porcelain'], { cwd:root });
    const lines = stdout.split('\n').filter(Boolean);
    return { dirty:lines.length > 0, changedFiles:lines };
  } catch {
    return { dirty:null, changedFiles:[] };
  }
}

async function serveStatic(req, res, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const file = path.resolve(publicDir, '.' + requested);
  if (!file.startsWith(publicDir)) return false;
  try {
    const data = await fs.readFile(file);
    const ext = path.extname(file);
    const type = ext === '.html' ? 'text/html' : ext === '.js' ? 'text/javascript' : ext === '.css' ? 'text/css' : 'application/octet-stream';
    res.writeHead(200, { 'content-type':type + '; charset=utf-8' });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && url.pathname === '/api/snapshot') {
      return json(res, 200, { ...(await loadSnapshot(root)), git:await gitStatus() });
    }
    if (req.method === 'GET' && url.pathname === '/api/document') {
      const name = url.searchParams.get('name');
      const allow = {
        operating:'company/OPERATING_MODEL.md',
        decisions:'company/DECISION_LOG.md',
        agents:'AGENTS.md',
        architecture:'docs/ARCHITECTURE.md',
      };
      if (!allow[name]) return json(res, 404, { error:'Unknown document' });
      return json(res, 200, { name, path:allow[name], markdown:await readText(path.join(root, allow[name])) });
    }
    if (req.method === 'POST' && url.pathname === '/api/work-items') {
      return json(res, 201, await createWorkItem(root, await body(req)));
    }
    if (req.method === 'PATCH' && url.pathname.startsWith('/api/work-items/')) {
      const id = decodeURIComponent(url.pathname.split('/').pop());
      const patch = await body(req);
      if (patch.status === 'running') return json(res, 400, { error:'Panel cannot claim work. Agents must use the claim protocol.' });
      return json(res, 200, await patchWorkItem(root, id, patch));
    }
    if (req.method === 'POST' && url.pathname === '/api/incidents') {
      return json(res, 201, await createIncident(root, await body(req)));
    }
    if (await serveStatic(req, res, url.pathname)) return;
    json(res, 404, { error:'Not found' });
  } catch (error) {
    console.error(error);
    json(res, 500, { error:error.message || String(error) });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Agents Company Panel: http://localhost:${port}`);
  console.log(`Repository: ${root}`);
});
