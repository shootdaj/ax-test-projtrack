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

describe('Comments & Activity API Integration', () => {
  let projectId, taskId;

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

  it('setup: create project and task', async () => {
    const proj = await request('POST', '/api/projects', { name: 'Comment Test' });
    projectId = proj.body.id;
    const task = await request('POST', `/api/projects/${projectId}/tasks`, { title: 'Task with comments' });
    taskId = task.body.id;
    assert.ok(projectId);
    assert.ok(taskId);
  });

  it('POST comment creates comment with timestamp and author', async () => {
    const res = await request('POST', `/api/projects/${projectId}/tasks/${taskId}/comments`, {
      text: 'First comment',
      author: 'Alice'
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.text, 'First comment');
    assert.strictEqual(res.body.author, 'Alice');
    assert.ok(res.body.created_at);
    assert.ok(res.body.id);
  });

  it('POST comment requires text', async () => {
    const res = await request('POST', `/api/projects/${projectId}/tasks/${taskId}/comments`, {
      author: 'Bob'
    });
    assert.strictEqual(res.status, 400);
  });

  it('POST comment requires author', async () => {
    const res = await request('POST', `/api/projects/${projectId}/tasks/${taskId}/comments`, {
      text: 'No author'
    });
    assert.strictEqual(res.status, 400);
  });

  it('GET comments returns chronological list', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    const task = await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'T' });
    await request('POST', `/api/projects/${proj.body.id}/tasks/${task.body.id}/comments`, { text: 'Comment 1', author: 'A' });
    await request('POST', `/api/projects/${proj.body.id}/tasks/${task.body.id}/comments`, { text: 'Comment 2', author: 'B' });
    await request('POST', `/api/projects/${proj.body.id}/tasks/${task.body.id}/comments`, { text: 'Comment 3', author: 'C' });

    const res = await request('GET', `/api/projects/${proj.body.id}/tasks/${task.body.id}/comments`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.length, 3);
    assert.strictEqual(res.body[0].text, 'Comment 1');
    assert.strictEqual(res.body[2].text, 'Comment 3');
  });

  it('comment addition creates activity log entry', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    const task = await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'T' });
    await request('POST', `/api/projects/${proj.body.id}/tasks/${task.body.id}/comments`, { text: 'Test', author: 'Alice' });

    const acts = await request('GET', `/api/projects/${proj.body.id}/tasks/${task.body.id}/activity`);
    const commentAct = acts.body.find(a => a.action === 'comment_added');
    assert.ok(commentAct);
    assert.strictEqual(commentAct.details.author, 'Alice');
  });

  it('status change creates activity with from/to', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    const task = await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'T' });
    await request('PUT', `/api/projects/${proj.body.id}/tasks/${task.body.id}`, { status: 'in-progress' });
    await request('PUT', `/api/projects/${proj.body.id}/tasks/${task.body.id}`, { status: 'review' });
    await request('PUT', `/api/projects/${proj.body.id}/tasks/${task.body.id}`, { status: 'done' });

    const acts = await request('GET', `/api/projects/${proj.body.id}/tasks/${task.body.id}/activity`);
    const statusChanges = acts.body.filter(a => a.action === 'status_changed');
    assert.strictEqual(statusChanges.length, 3);
    assert.strictEqual(statusChanges[0].details.from, 'todo');
    assert.strictEqual(statusChanges[0].details.to, 'in-progress');
    assert.strictEqual(statusChanges[1].details.from, 'in-progress');
    assert.strictEqual(statusChanges[1].details.to, 'review');
    assert.strictEqual(statusChanges[2].details.from, 'review');
    assert.strictEqual(statusChanges[2].details.to, 'done');
  });

  it('assignee change creates activity', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    const task = await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'T', assignee: 'Alice' });
    await request('PUT', `/api/projects/${proj.body.id}/tasks/${task.body.id}`, { assignee: 'Bob' });

    const acts = await request('GET', `/api/projects/${proj.body.id}/tasks/${task.body.id}/activity`);
    const assigneeChange = acts.body.find(a => a.action === 'assignee_changed');
    assert.ok(assigneeChange);
    assert.strictEqual(assigneeChange.details.from, 'Alice');
    assert.strictEqual(assigneeChange.details.to, 'Bob');
  });

  it('position update works for kanban reordering', async () => {
    store.resetStore();
    const proj = await request('POST', '/api/projects', { name: 'P' });
    const t1 = await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'T1' });
    const t2 = await request('POST', `/api/projects/${proj.body.id}/tasks`, { title: 'T2' });

    // Swap positions
    await request('PUT', `/api/projects/${proj.body.id}/tasks/${t1.body.id}`, { position: 1 });
    await request('PUT', `/api/projects/${proj.body.id}/tasks/${t2.body.id}`, { position: 0 });

    const tasks = await request('GET', `/api/projects/${proj.body.id}/tasks`);
    assert.strictEqual(tasks.body[0].title, 'T2');
    assert.strictEqual(tasks.body[1].title, 'T1');
  });
});
