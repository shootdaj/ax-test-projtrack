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

function rawRequest(method, path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data, headers: res.headers });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

describe('Scenario: Frontend serves correctly and API supports all UI workflows', () => {
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

  it('serves index.html at root', async () => {
    const res = await rawRequest('GET', '/');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('Project Tracker'));
    assert.ok(res.body.includes('kanban-columns'));
  });

  it('serves CSS and JS static files', async () => {
    const css = await rawRequest('GET', '/styles.css');
    assert.strictEqual(css.status, 200);
    assert.ok(css.body.includes('.kanban-board'));

    const js = await rawRequest('GET', '/app.js');
    assert.strictEqual(js.status, 200);
    assert.ok(js.body.includes('handleDrop'));
  });

  it('full frontend workflow: project creation, tasks, kanban drag, comments, dashboard', async () => {
    // 1. Health check
    const health = await request('GET', '/health');
    assert.strictEqual(health.body.status, 'ok');

    // 2. Create a project (simulating sidebar "New Project")
    const proj = await request('POST', '/api/projects', { name: 'Frontend Test Project', description: 'Testing UI workflow' });
    assert.strictEqual(proj.status, 201);
    const pid = proj.body.id;

    // 3. Add tasks (simulating "Add Task" modal)
    const task1 = await request('POST', `/api/projects/${pid}/tasks`, {
      title: 'Build kanban board',
      description: 'Implement drag and drop',
      priority: 'critical',
      assignee: 'Alice',
      tags: ['frontend', 'ui']
    });
    const task2 = await request('POST', `/api/projects/${pid}/tasks`, {
      title: 'Implement search',
      priority: 'high',
      assignee: 'Bob',
      tags: ['frontend']
    });
    const task3 = await request('POST', `/api/projects/${pid}/tasks`, {
      title: 'Add dashboard charts',
      priority: 'medium',
      assignee: 'Alice',
      tags: ['frontend', 'charts'],
      due_date: '2020-01-01'  // overdue
    });

    // 4. Simulate drag-and-drop: move task1 to in-progress
    await request('PUT', `/api/projects/${pid}/tasks/${task1.body.id}`, { status: 'in-progress' });

    // 5. Verify kanban state
    const tasks = await request('GET', `/api/projects/${pid}/tasks`);
    const todoTasks = tasks.body.filter(t => t.status === 'todo');
    const inProgressTasks = tasks.body.filter(t => t.status === 'in-progress');
    assert.strictEqual(todoTasks.length, 2);
    assert.strictEqual(inProgressTasks.length, 1);

    // 6. Open task detail and add comment
    const comment = await request('POST', `/api/projects/${pid}/tasks/${task1.body.id}/comments`, {
      text: 'Drag and drop working!',
      author: 'Alice'
    });
    assert.strictEqual(comment.status, 201);

    // 7. Check activity log in modal
    const activity = await request('GET', `/api/projects/${pid}/tasks/${task1.body.id}/activity`);
    assert.ok(activity.body.some(a => a.action === 'task_created'));
    assert.ok(activity.body.some(a => a.action === 'status_changed'));
    assert.ok(activity.body.some(a => a.action === 'comment_added'));

    // 8. Search tasks (search bar)
    const searchResults = await request('GET', `/api/projects/${pid}/tasks?q=kanban`);
    assert.strictEqual(searchResults.body.length, 1);

    // 9. Check dashboard
    const dashboard = await request('GET', `/api/projects/${pid}/dashboard`);
    assert.strictEqual(dashboard.body.total, 3);
    assert.strictEqual(dashboard.body.overdue.length, 1);
    assert.strictEqual(dashboard.body.by_assignee['Alice'], 2);

    // 10. Create sprint and assign tasks
    const now = new Date();
    const startDate = new Date(now); startDate.setDate(startDate.getDate() - 2);
    const endDate = new Date(now); endDate.setDate(endDate.getDate() + 12);

    const sprint = await request('POST', `/api/projects/${pid}/sprints`, {
      name: 'Sprint 1',
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0]
    });
    assert.strictEqual(sprint.status, 201);

    await request('POST', `/api/projects/${pid}/sprints/${sprint.body.id}/tasks`, { task_id: task1.body.id });
    await request('POST', `/api/projects/${pid}/sprints/${sprint.body.id}/tasks`, { task_id: task2.body.id });

    // 11. Check sprint summary
    const summary = await request('GET', `/api/projects/${pid}/sprints/${sprint.body.id}/summary`);
    assert.strictEqual(summary.body.total_tasks, 2);

    // 12. Check burndown data
    const dashAfterSprint = await request('GET', `/api/projects/${pid}/dashboard`);
    assert.ok(dashAfterSprint.body.burndown);
    assert.ok(dashAfterSprint.body.burndown.data_points.length > 0);

    // 13. Project list
    const projects = await request('GET', '/api/projects');
    assert.ok(projects.body.length >= 1);

    // 14. Delete task
    await request('DELETE', `/api/projects/${pid}/tasks/${task3.body.id}`);
    const tasksAfterDelete = await request('GET', `/api/projects/${pid}/tasks`);
    assert.strictEqual(tasksAfterDelete.body.length, 2);
  });
});
