const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../../src/app');
const store = require('../../src/store');

let server;
let baseUrl;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('Sprints & Dashboard API Integration', () => {
  before(() => {
    return new Promise((resolve) => {
      store.resetStore();
      server = app.listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(() => {
    return new Promise((resolve) => {
      if (server) server.close(resolve);
      else resolve();
    });
  });

  // --- Sprint CRUD ---
  it('POST /api/projects/:id/sprints creates a sprint', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    const res = await request('POST', `/api/projects/${proj.body.id}/sprints`, {
      name: 'Sprint 1',
      start_date: '2026-03-01',
      end_date: '2026-03-14'
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.name, 'Sprint 1');
    assert.ok(res.body.id);
  });

  it('POST sprint returns 400 without required fields', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    const res1 = await request('POST', `/api/projects/${proj.body.id}/sprints`, { name: 'S' });
    assert.strictEqual(res1.status, 400);
    const res2 = await request('POST', `/api/projects/${proj.body.id}/sprints`, { start_date: '2026-01-01', end_date: '2026-01-14' });
    assert.strictEqual(res2.status, 400);
  });

  it('GET /api/projects/:id/sprints lists sprints', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    await request('POST', `/api/projects/${proj.body.id}/sprints`, { name: 'S1', start_date: '2026-03-01', end_date: '2026-03-14' });
    await request('POST', `/api/projects/${proj.body.id}/sprints`, { name: 'S2', start_date: '2026-03-15', end_date: '2026-03-28' });
    const res = await request('GET', `/api/projects/${proj.body.id}/sprints`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.length, 2);
  });

  it('POST assign task to sprint', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    const sprint = await request('POST', `/api/projects/${proj.body.id}/sprints`, { name: 'S1', start_date: '2026-03-01', end_date: '2026-03-14' });
    const task = await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'T1' });

    const res = await request('POST', `/api/projects/${proj.body.id}/sprints/${sprint.body.id}/tasks`, { task_id: task.body.id });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.sprint_id, sprint.body.id);
  });

  it('GET sprint tasks', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    const sprint = await request('POST', `/api/projects/${proj.body.id}/sprints`, { name: 'S1', start_date: '2026-03-01', end_date: '2026-03-14' });
    const t1 = await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'T1' });
    const t2 = await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'T2' });
    await request('POST', `/api/projects/${proj.body.id}/sprints/${sprint.body.id}/tasks`, { task_id: t1.body.id });
    await request('POST', `/api/projects/${proj.body.id}/sprints/${sprint.body.id}/tasks`, { task_id: t2.body.id });

    const res = await request('GET', `/api/projects/${proj.body.id}/sprints/${sprint.body.id}/tasks`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.length, 2);
  });

  it('GET sprint summary', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    const sprint = await request('POST', `/api/projects/${proj.body.id}/sprints`, { name: 'S1', start_date: '2026-03-01', end_date: '2026-03-14' });
    const t1 = await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'Done task' });
    const t2 = await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'Todo task' });
    await request('POST', `/api/projects/${proj.body.id}/sprints/${sprint.body.id}/tasks`, { task_id: t1.body.id });
    await request('POST', `/api/projects/${proj.body.id}/sprints/${sprint.body.id}/tasks`, { task_id: t2.body.id });
    await request('PUT', `/api/projects/${proj.body.id}/tasks/${t1.body.id}`, { status: 'done' });

    const res = await request('GET', `/api/projects/${proj.body.id}/sprints/${sprint.body.id}/summary`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.total_tasks, 2);
    assert.strictEqual(res.body.completed, 1);
    assert.strictEqual(res.body.remaining, 1);
    assert.strictEqual(res.body.by_status['done'], 1);
    assert.strictEqual(res.body.by_status['todo'], 1);
  });

  // --- Dashboard ---
  it('GET dashboard returns correct stats', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'T1', status: 'todo', assignee: 'Alice' });
    await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'T2', status: 'done', assignee: 'Bob' });
    await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'T3', status: 'todo', assignee: 'Alice', due_date: '2020-01-01' });

    const res = await request('GET', `/api/projects/${proj.body.id}/dashboard`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.total, 3);
    assert.strictEqual(res.body.by_status['todo'], 2);
    assert.strictEqual(res.body.by_status['done'], 1);
    assert.strictEqual(res.body.overdue.length, 1);
    assert.strictEqual(res.body.by_assignee['Alice'], 2);
    assert.strictEqual(res.body.by_assignee['Bob'], 1);
  });

  it('GET dashboard returns burndown data for active sprint', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    // Create a sprint that's currently active
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 5);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 5);

    const sprint = await request('POST', `/api/projects/${proj.body.id}/sprints`, {
      name: 'Active Sprint',
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0]
    });

    const t1 = await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'T1' });
    const t2 = await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'T2' });
    await request('POST', `/api/projects/${proj.body.id}/sprints/${sprint.body.id}/tasks`, { task_id: t1.body.id });
    await request('POST', `/api/projects/${proj.body.id}/sprints/${sprint.body.id}/tasks`, { task_id: t2.body.id });
    await request('PUT', `/api/projects/${proj.body.id}/tasks/${t1.body.id}`, { status: 'done' });

    const res = await request('GET', `/api/projects/${proj.body.id}/dashboard`);
    assert.ok(res.body.burndown);
    assert.strictEqual(res.body.burndown.total_tasks, 2);
    assert.strictEqual(res.body.burndown.completed, 1);
    assert.strictEqual(res.body.burndown.remaining, 1);
    assert.ok(res.body.burndown.data_points.length > 0);
  });

  // --- Search ---
  it('GET tasks with search query', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'Fix login bug', priority: 'high' });
    await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'Add dashboard widget', priority: 'medium' });
    await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'Login page redesign', priority: 'low' });

    const res = await request('GET', `/api/projects/${proj.body.id}/tasks?q=login`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.length, 2);
  });

  it('GET tasks with status filter', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'T1', status: 'todo' });
    await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'T2', status: 'done' });

    const res = await request('GET', `/api/projects/${proj.body.id}/tasks?status=todo`);
    assert.strictEqual(res.body.length, 1);
    assert.strictEqual(res.body[0].title, 'T1');
  });

  it('GET tasks with priority filter', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'T1', priority: 'critical' });
    await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'T2', priority: 'low' });

    const res = await request('GET', `/api/projects/${proj.body.id}/tasks?priority=critical`);
    assert.strictEqual(res.body.length, 1);
    assert.strictEqual(res.body[0].priority, 'critical');
  });

  it('GET tasks with assignee filter', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'T1', assignee: 'Alice' });
    await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'T2', assignee: 'Bob' });

    const res = await request('GET', `/api/projects/${proj.body.id}/tasks?assignee=Alice`);
    assert.strictEqual(res.body.length, 1);
    assert.strictEqual(res.body[0].assignee, 'Alice');
  });

  it('GET tasks with tag filter', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'T1', tags: ['bug', 'backend'] });
    await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'T2', tags: ['feature'] });

    const res = await request('GET', `/api/projects/${proj.body.id}/tasks?tag=bug`);
    assert.strictEqual(res.body.length, 1);
    assert.strictEqual(res.body[0].title, 'T1');
  });

  it('GET tasks with combined search and filter', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'Fix login', status: 'todo', priority: 'high' });
    await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'Fix login style', status: 'done', priority: 'low' });
    await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'Add settings', status: 'todo', priority: 'medium' });

    const res = await request('GET', `/api/projects/${proj.body.id}/tasks?q=login&status=todo`);
    assert.strictEqual(res.body.length, 1);
    assert.strictEqual(res.body[0].title, 'Fix login');
  });
});
