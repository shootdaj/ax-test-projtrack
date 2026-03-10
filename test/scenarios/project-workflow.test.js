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

describe('Scenario: Full Project Workflow', () => {
  before((t, done) => {
    store.resetStore();
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      done();
    });
  });

  after((t, done) => {
    if (server) server.close(done);
    else done();
  });

  it('creates a project, adds tasks, moves them through statuses, and verifies dashboard', async () => {
    // 1. Create a project
    const proj = await request('POST', '/api/projects', {
      name: 'Sprint Alpha',
      description: 'First sprint project',
      members: ['Alice', 'Bob']
    });
    assert.strictEqual(proj.status, 201);
    const projectId = proj.body.id;

    // 2. Create multiple tasks
    const task1 = await request('POST', `/api/projects/${projectId}/tasks`, {
      title: 'Set up database',
      priority: 'high',
      assignee: 'Alice',
      tags: ['backend', 'infrastructure']
    });
    assert.strictEqual(task1.status, 201);

    const task2 = await request('POST', `/api/projects/${projectId}/tasks`, {
      title: 'Design login page',
      priority: 'medium',
      assignee: 'Bob',
      tags: ['frontend', 'design'],
      due_date: '2020-01-01' // Intentionally overdue
    });
    assert.strictEqual(task2.status, 201);

    const task3 = await request('POST', `/api/projects/${projectId}/tasks`, {
      title: 'Write API docs',
      priority: 'low',
      assignee: 'Alice',
      tags: ['docs']
    });
    assert.strictEqual(task3.status, 201);

    // 3. Move task1 through the workflow
    await request('PUT', `/api/projects/${projectId}/tasks/${task1.body.id}`, { status: 'in-progress' });
    await request('PUT', `/api/projects/${projectId}/tasks/${task1.body.id}`, { status: 'review' });
    await request('PUT', `/api/projects/${projectId}/tasks/${task1.body.id}`, { status: 'done' });

    // 4. Verify task1 activity log shows all transitions
    const activities = await request('GET', `/api/projects/${projectId}/tasks/${task1.body.id}/activity`);
    assert.strictEqual(activities.status, 200);
    const statusChanges = activities.body.filter(a => a.action === 'status_changed');
    assert.strictEqual(statusChanges.length, 3); // todo->in-progress, in-progress->review, review->done

    // 5. Add comments on task2
    const comment1 = await request('POST', `/api/projects/${projectId}/tasks/${task2.body.id}/comments`, {
      text: 'Started working on the mockups',
      author: 'Bob'
    });
    assert.strictEqual(comment1.status, 201);

    const comment2 = await request('POST', `/api/projects/${projectId}/tasks/${task2.body.id}/comments`, {
      text: 'Looks great, proceed with implementation',
      author: 'Alice'
    });
    assert.strictEqual(comment2.status, 201);

    // 6. Verify comments
    const comments = await request('GET', `/api/projects/${projectId}/tasks/${task2.body.id}/comments`);
    assert.strictEqual(comments.body.length, 2);
    assert.strictEqual(comments.body[0].author, 'Bob');
    assert.strictEqual(comments.body[1].author, 'Alice');

    // 7. Verify dashboard
    const dashboard = await request('GET', `/api/projects/${projectId}/dashboard`);
    assert.strictEqual(dashboard.status, 200);
    assert.strictEqual(dashboard.body.total, 3);
    assert.strictEqual(dashboard.body.by_status['done'], 1);
    assert.strictEqual(dashboard.body.by_status['todo'], 2);
    assert.strictEqual(dashboard.body.overdue.length, 1); // task2 is overdue
    assert.strictEqual(dashboard.body.by_assignee['Alice'], 2);
    assert.strictEqual(dashboard.body.by_assignee['Bob'], 1);

    // 8. Search tasks
    const searchResults = await request('GET', `/api/projects/${projectId}/tasks?q=login`);
    assert.strictEqual(searchResults.status, 200);
    assert.strictEqual(searchResults.body.length, 1);
    assert.strictEqual(searchResults.body[0].title, 'Design login page');

    // 9. Filter by assignee
    const aliceTasks = await request('GET', `/api/projects/${projectId}/tasks?assignee=Alice`);
    assert.strictEqual(aliceTasks.body.length, 2);

    // 10. Filter by tag
    const backendTasks = await request('GET', `/api/projects/${projectId}/tasks?tag=backend`);
    assert.strictEqual(backendTasks.body.length, 1);

    // 11. Delete a task and verify
    await request('DELETE', `/api/projects/${projectId}/tasks/${task3.body.id}`);
    const remainingTasks = await request('GET', `/api/projects/${projectId}/tasks`);
    assert.strictEqual(remainingTasks.body.length, 2);

    // 12. Verify project details
    const projectDetails = await request('GET', `/api/projects/${projectId}`);
    assert.strictEqual(projectDetails.body.name, 'Sprint Alpha');
    assert.deepStrictEqual(projectDetails.body.members, ['Alice', 'Bob']);
  });
});
