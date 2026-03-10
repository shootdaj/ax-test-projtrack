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
        resolve({ status: res.statusCode, body: parsed, headers: res.headers });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('API Integration Tests', () => {
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

  // --- Health ---
  it('GET /health returns ok', async () => {
    const res = await request('GET', '/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
  });

  // --- Projects ---
  it('POST /api/projects creates a project', async () => {
    store.resetStore();
    const res = await request('POST', '/api/projects', { name: 'My Project', description: 'Test' });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.name, 'My Project');
    assert.ok(res.body.id);
  });

  it('POST /api/projects returns 400 without name', async () => {
    const res = await request('POST', '/api/projects', {});
    assert.strictEqual(res.status, 400);
  });

  it('GET /api/projects lists all projects', async () => {
    store.resetStore();
    await request('POST', '/api/projects', { name: 'P1' });
    await request('POST', '/api/projects', { name: 'P2' });
    const res = await request('GET', '/api/projects');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.length, 2);
  });

  it('GET /api/projects/:id gets a single project', async () => {
    store.resetStore();
    const created = await request('POST', '/api/projects', { name: 'Solo' });
    const res = await request('GET', `/api/projects/${created.body.id}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.name, 'Solo');
  });

  it('GET /api/projects/:id returns 404 for missing', async () => {
    const res = await request('GET', '/api/projects/nonexistent');
    assert.strictEqual(res.status, 404);
  });

  it('PUT /api/projects/:id updates a project', async () => {
    store.resetStore();
    const created = await request('POST', '/api/projects', { name: 'Old' });
    const res = await request('PUT', `/api/projects/${created.body.id}`, { name: 'New' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.name, 'New');
  });

  it('DELETE /api/projects/:id deletes a project', async () => {
    store.resetStore();
    const created = await request('POST', '/api/projects', { name: 'Del' });
    const res = await request('DELETE', `/api/projects/${created.body.id}`);
    assert.strictEqual(res.status, 204);
    const check = await request('GET', `/api/projects/${created.body.id}`);
    assert.strictEqual(check.status, 404);
  });

  // --- Tasks ---
  it('POST /api/projects/:id/tasks creates a task with all fields', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    const res = await request('POST', `/api/projects/${proj.body.id}/tasks`, {
      title: 'Task 1',
      description: 'Do something',
      priority: 'high',
      assignee: 'Alice',
      tags: ['urgent']
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.title, 'Task 1');
    assert.strictEqual(res.body.priority, 'high');
    assert.strictEqual(res.body.status, 'todo');
    assert.ok(res.body.created_at);
    assert.ok(res.body.updated_at);
  });

  it('POST /api/projects/:id/tasks returns 400 without title', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    const res = await request('POST', `/api/projects/${proj.body.id}/tasks`, {});
    assert.strictEqual(res.status, 400);
  });

  it('GET /api/projects/:id/tasks lists tasks', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'T1' });
    await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'T2' });
    const res = await request('GET', `/api/projects/${proj.body.id}/tasks`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.length, 2);
  });

  it('GET /api/projects/:id/tasks/:taskId gets a single task', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    const task = await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'Solo' });
    const res = await request('GET', `/api/projects/${proj.body.id}/tasks/${task.body.id}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.title, 'Solo');
  });

  it('PUT /api/projects/:id/tasks/:taskId updates task fields', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    const task = await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'Old' });
    const res = await request('PUT', `/api/projects/${proj.body.id}/tasks/${task.body.id}`, {
      title: 'New',
      status: 'in-progress'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.title, 'New');
    assert.strictEqual(res.body.status, 'in-progress');
  });

  it('PUT updates updated_at timestamp', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    const task = await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'T' });
    const originalUpdatedAt = task.body.updated_at;
    await new Promise(r => setTimeout(r, 10));
    const res = await request('PUT', `/api/projects/${proj.body.id}/tasks/${task.body.id}`, { title: 'Updated' });
    assert.notStrictEqual(res.body.updated_at, originalUpdatedAt);
  });

  it('DELETE /api/projects/:id/tasks/:taskId deletes a task', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    const task = await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'Del' });
    const res = await request('DELETE', `/api/projects/${proj.body.id}/tasks/${task.body.id}`);
    assert.strictEqual(res.status, 204);
  });

  it('Task creation logs activity', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    const task = await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'T' });
    const activities = await request('GET', `/api/projects/${proj.body.id}/tasks/${task.body.id}/activity`);
    assert.strictEqual(activities.status, 200);
    assert.ok(activities.body.length >= 1);
    assert.strictEqual(activities.body[0].action, 'task_created');
  });

  it('Status change logs activity', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    const task = await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'T' });
    await request('PUT', `/api/projects/${proj.body.id}/tasks/${task.body.id}`, { status: 'done' });
    const activities = await request('GET', `/api/projects/${proj.body.id}/tasks/${task.body.id}/activity`);
    const statusChange = activities.body.find(a => a.action === 'status_changed');
    assert.ok(statusChange);
    assert.strictEqual(statusChange.details.from, 'todo');
    assert.strictEqual(statusChange.details.to, 'done');
  });
});
