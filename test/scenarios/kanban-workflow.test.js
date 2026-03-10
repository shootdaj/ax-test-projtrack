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

describe('Scenario: Kanban Board Workflow', () => {
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

  it('complete kanban workflow: create tasks, move through columns, add comments, check activity log', async () => {
    // 1. Create a project
    const proj = await request('POST', '/api/projects', { name: 'Kanban Test' });
    const pid = proj.body.id;

    // 2. Create tasks in different columns
    const t1 = await request('POST', `/api/projects/${pid}/tasks`, { title: 'Design wireframes', priority: 'high', assignee: 'Alice' });
    const t2 = await request('POST', `/api/projects/${pid}/tasks`, { title: 'Set up CI', priority: 'medium', assignee: 'Bob' });
    const t3 = await request('POST', `/api/projects/${pid}/tasks`, { title: 'Write docs', priority: 'low', assignee: 'Charlie' });

    // All start as todo
    assert.strictEqual(t1.body.status, 'todo');
    assert.strictEqual(t2.body.status, 'todo');

    // 3. Move t1 through the kanban: todo -> in-progress -> review -> done
    await request('PUT', `/api/projects/${pid}/tasks/${t1.body.id}`, { status: 'in-progress' });

    // Add a comment while in progress
    await request('POST', `/api/projects/${pid}/tasks/${t1.body.id}/comments`, { text: 'Wireframes v1 ready for review', author: 'Alice' });

    await request('PUT', `/api/projects/${pid}/tasks/${t1.body.id}`, { status: 'review' });

    // Reviewer adds comment
    await request('POST', `/api/projects/${pid}/tasks/${t1.body.id}/comments`, { text: 'Looks good, minor changes needed', author: 'Bob' });
    await request('POST', `/api/projects/${pid}/tasks/${t1.body.id}/comments`, { text: 'Changes made, please re-review', author: 'Alice' });

    await request('PUT', `/api/projects/${pid}/tasks/${t1.body.id}`, { status: 'done' });

    // 4. Verify t1 is done
    const t1Final = await request('GET', `/api/projects/${pid}/tasks/${t1.body.id}`);
    assert.strictEqual(t1Final.body.status, 'done');

    // 5. Check comments on t1
    const comments = await request('GET', `/api/projects/${pid}/tasks/${t1.body.id}/comments`);
    assert.strictEqual(comments.body.length, 3);
    assert.strictEqual(comments.body[0].author, 'Alice');
    assert.strictEqual(comments.body[1].author, 'Bob');

    // 6. Check activity log
    const activities = await request('GET', `/api/projects/${pid}/tasks/${t1.body.id}/activity`);
    const actions = activities.body.map(a => a.action);
    assert.ok(actions.includes('task_created'));
    assert.ok(actions.includes('status_changed'));
    assert.ok(actions.includes('comment_added'));

    // Should have 3 status changes
    const statusChanges = activities.body.filter(a => a.action === 'status_changed');
    assert.strictEqual(statusChanges.length, 3);

    // Should have 3 comment activities
    const commentActs = activities.body.filter(a => a.action === 'comment_added');
    assert.strictEqual(commentActs.length, 3);

    // 7. Move t2 and reorder
    await request('PUT', `/api/projects/${pid}/tasks/${t2.body.id}`, { status: 'in-progress' });

    // Reorder remaining todo tasks
    await request('PUT', `/api/projects/${pid}/tasks/${t3.body.id}`, { position: 0 });

    // 8. Reassign t2 and check activity
    await request('PUT', `/api/projects/${pid}/tasks/${t2.body.id}`, { assignee: 'Charlie' });
    const t2Activities = await request('GET', `/api/projects/${pid}/tasks/${t2.body.id}/activity`);
    const assigneeChange = t2Activities.body.find(a => a.action === 'assignee_changed');
    assert.ok(assigneeChange);
    assert.strictEqual(assigneeChange.details.from, 'Bob');
    assert.strictEqual(assigneeChange.details.to, 'Charlie');

    // 9. Verify dashboard shows correct state
    const dashboard = await request('GET', `/api/projects/${pid}/dashboard`);
    assert.strictEqual(dashboard.body.by_status['done'], 1);
    assert.strictEqual(dashboard.body.by_status['in-progress'], 1);
    assert.strictEqual(dashboard.body.by_status['todo'], 1);
    assert.strictEqual(dashboard.body.total, 3);
  });
});
