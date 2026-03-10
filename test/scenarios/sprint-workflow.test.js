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

describe('Scenario: Full Sprint Workflow', () => {
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

  it('creates project, sets up sprint, assigns tasks, tracks progress through dashboard', async () => {
    // 1. Create project
    const proj = await request('POST', '/api/projects', { name: 'Sprint Planning Test' });
    const pid = proj.body.id;

    // 2. Create tasks
    const t1 = await request('POST', `/api/projects/${pid}/tasks`, { title: 'API endpoints', priority: 'critical', assignee: 'Alice', tags: ['backend'] });
    const t2 = await request('POST', `/api/projects/${pid}/tasks`, { title: 'UI components', priority: 'high', assignee: 'Bob', tags: ['frontend'] });
    const t3 = await request('POST', `/api/projects/${pid}/tasks`, { title: 'Write tests', priority: 'medium', assignee: 'Alice', tags: ['testing'] });
    const t4 = await request('POST', `/api/projects/${pid}/tasks`, { title: 'Deploy to staging', priority: 'low', assignee: 'Charlie', tags: ['devops'], due_date: '2020-01-01' }); // overdue
    const t5 = await request('POST', `/api/projects/${pid}/tasks`, { title: 'Documentation', priority: 'low', assignee: 'Bob', tags: ['docs'] });

    // 3. Create sprint with current dates
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 3);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 7);

    const sprint = await request('POST', `/api/projects/${pid}/sprints`, {
      name: 'Sprint 1',
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0]
    });
    assert.strictEqual(sprint.status, 201);

    // 4. Assign tasks to sprint
    await request('POST', `/api/projects/${pid}/sprints/${sprint.body.id}/tasks`, { task_id: t1.body.id });
    await request('POST', `/api/projects/${pid}/sprints/${sprint.body.id}/tasks`, { task_id: t2.body.id });
    await request('POST', `/api/projects/${pid}/sprints/${sprint.body.id}/tasks`, { task_id: t3.body.id });
    await request('POST', `/api/projects/${pid}/sprints/${sprint.body.id}/tasks`, { task_id: t4.body.id });
    // t5 not in sprint

    // 5. Verify sprint tasks
    const sprintTasks = await request('GET', `/api/projects/${pid}/sprints/${sprint.body.id}/tasks`);
    assert.strictEqual(sprintTasks.body.length, 4);

    // 6. Complete some tasks
    await request('PUT', `/api/projects/${pid}/tasks/${t1.body.id}`, { status: 'done' });
    await request('PUT', `/api/projects/${pid}/tasks/${t2.body.id}`, { status: 'in-progress' });
    await request('PUT', `/api/projects/${pid}/tasks/${t3.body.id}`, { status: 'review' });

    // 7. Check sprint summary
    const summary = await request('GET', `/api/projects/${pid}/sprints/${sprint.body.id}/summary`);
    assert.strictEqual(summary.body.total_tasks, 4);
    assert.strictEqual(summary.body.completed, 1);
    assert.strictEqual(summary.body.remaining, 3);
    assert.strictEqual(summary.body.by_status['done'], 1);
    assert.strictEqual(summary.body.by_status['in-progress'], 1);
    assert.strictEqual(summary.body.by_status['review'], 1);
    assert.strictEqual(summary.body.by_status['todo'], 1);

    // 8. Check dashboard
    const dashboard = await request('GET', `/api/projects/${pid}/dashboard`);
    assert.strictEqual(dashboard.body.total, 5); // All project tasks
    assert.strictEqual(dashboard.body.by_status['done'], 1);
    assert.strictEqual(dashboard.body.overdue.length, 1); // t4 is overdue and not done
    assert.strictEqual(dashboard.body.by_assignee['Alice'], 2);
    assert.strictEqual(dashboard.body.by_assignee['Bob'], 2);
    assert.strictEqual(dashboard.body.by_assignee['Charlie'], 1);

    // 9. Check burndown data exists for active sprint
    assert.ok(dashboard.body.burndown);
    assert.strictEqual(dashboard.body.burndown.sprint_name, 'Sprint 1');
    assert.strictEqual(dashboard.body.burndown.total_tasks, 4);
    assert.ok(dashboard.body.burndown.data_points.length > 0);

    // 10. Search for tasks
    const backendTasks = await request('GET', `/api/projects/${pid}/tasks?tag=backend`);
    assert.strictEqual(backendTasks.body.length, 1);
    assert.strictEqual(backendTasks.body[0].title, 'API endpoints');

    const searchResults = await request('GET', `/api/projects/${pid}/tasks?q=deploy`);
    assert.strictEqual(searchResults.body.length, 1);

    const aliceTasks = await request('GET', `/api/projects/${pid}/tasks?assignee=Alice`);
    assert.strictEqual(aliceTasks.body.length, 2);

    // 11. List all sprints
    const sprints = await request('GET', `/api/projects/${pid}/sprints`);
    assert.strictEqual(sprints.body.length, 1);
    assert.strictEqual(sprints.body[0].name, 'Sprint 1');
  });
});
