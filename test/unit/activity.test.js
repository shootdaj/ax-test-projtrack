const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const store = require('../../src/store');

describe('Activity Tracking', () => {
  let projectId, taskId;

  beforeEach(() => {
    store.resetStore();
    const p = store.createProject({ name: 'Activity Project' });
    projectId = p.id;
    const t = store.createTask(projectId, { title: 'Tracked Task', assignee: 'Alice' });
    taskId = t.id;
  });

  it('tracks task creation activity', () => {
    // Task creation activity is added via the API route, not store directly
    store.addActivity(taskId, {
      action: 'task_created',
      details: { title: 'Tracked Task', status: 'todo', priority: 'medium' },
      actor: 'Alice'
    });
    const activities = store.getActivitiesByTask(taskId);
    assert.strictEqual(activities.length, 1);
    assert.strictEqual(activities[0].action, 'task_created');
    assert.strictEqual(activities[0].actor, 'Alice');
  });

  it('tracks status changes with old and new values', () => {
    const result = store.updateTask(taskId, { status: 'in-progress' });
    store.addActivity(taskId, {
      action: 'status_changed',
      details: { from: result.previous.status, to: 'in-progress' },
      actor: 'system'
    });
    const activities = store.getActivitiesByTask(taskId);
    const change = activities.find(a => a.action === 'status_changed');
    assert.ok(change);
    assert.strictEqual(change.details.from, 'todo');
    assert.strictEqual(change.details.to, 'in-progress');
  });

  it('tracks assignee changes', () => {
    const result = store.updateTask(taskId, { assignee: 'Bob' });
    store.addActivity(taskId, {
      action: 'assignee_changed',
      details: { from: result.previous.assignee, to: 'Bob' },
      actor: 'system'
    });
    const activities = store.getActivitiesByTask(taskId);
    const change = activities.find(a => a.action === 'assignee_changed');
    assert.ok(change);
    assert.strictEqual(change.details.from, 'Alice');
    assert.strictEqual(change.details.to, 'Bob');
  });

  it('tracks comment additions', () => {
    const comment = store.addComment(taskId, { text: 'Test comment', author: 'Bob' });
    store.addActivity(taskId, {
      action: 'comment_added',
      details: { comment_id: comment.id, author: 'Bob' },
      actor: 'Bob'
    });
    const activities = store.getActivitiesByTask(taskId);
    const commentAct = activities.find(a => a.action === 'comment_added');
    assert.ok(commentAct);
    assert.strictEqual(commentAct.details.author, 'Bob');
  });

  it('returns activities in chronological order', () => {
    store.addActivity(taskId, { action: 'first' });
    store.addActivity(taskId, { action: 'second' });
    store.addActivity(taskId, { action: 'third' });
    const activities = store.getActivitiesByTask(taskId);
    assert.strictEqual(activities.length, 3);
    assert.strictEqual(activities[0].action, 'first');
    assert.strictEqual(activities[2].action, 'third');
  });

  it('activities have timestamps', () => {
    const activity = store.addActivity(taskId, { action: 'test' });
    assert.ok(activity.created_at);
    assert.ok(new Date(activity.created_at).getTime() > 0);
  });

  it('activities are isolated to their task', () => {
    const t2 = store.createTask(projectId, { title: 'Other task' });
    store.addActivity(taskId, { action: 'task1_action' });
    store.addActivity(t2.id, { action: 'task2_action' });
    const acts1 = store.getActivitiesByTask(taskId);
    const acts2 = store.getActivitiesByTask(t2.id);
    assert.strictEqual(acts1.length, 1);
    assert.strictEqual(acts2.length, 1);
    assert.strictEqual(acts1[0].action, 'task1_action');
    assert.strictEqual(acts2[0].action, 'task2_action');
  });
});

describe('Task Position/Ordering', () => {
  let projectId;

  beforeEach(() => {
    store.resetStore();
    const p = store.createProject({ name: 'Kanban Project' });
    projectId = p.id;
  });

  it('auto-assigns position starting from 0', () => {
    const t1 = store.createTask(projectId, { title: 'First' });
    const t2 = store.createTask(projectId, { title: 'Second' });
    const t3 = store.createTask(projectId, { title: 'Third' });
    assert.strictEqual(t1.position, 0);
    assert.strictEqual(t2.position, 1);
    assert.strictEqual(t3.position, 2);
  });

  it('calculates position per status column', () => {
    const todo1 = store.createTask(projectId, { title: 'Todo 1', status: 'todo' });
    const inprog1 = store.createTask(projectId, { title: 'InProg 1', status: 'in-progress' });
    const todo2 = store.createTask(projectId, { title: 'Todo 2', status: 'todo' });
    assert.strictEqual(todo1.position, 0);
    assert.strictEqual(inprog1.position, 0);
    assert.strictEqual(todo2.position, 1);
  });

  it('allows manual position override', () => {
    const t = store.createTask(projectId, { title: 'Manual', position: 5 });
    assert.strictEqual(t.position, 5);
  });

  it('can reorder task via update', () => {
    const t1 = store.createTask(projectId, { title: 'T1' });
    store.updateTask(t1.id, { position: 10 });
    const updated = store.getTask(t1.id);
    assert.strictEqual(updated.position, 10);
  });

  it('tasks sorted by position in getTasksByProject', () => {
    store.createTask(projectId, { title: 'C', position: 2 });
    store.createTask(projectId, { title: 'A', position: 0 });
    store.createTask(projectId, { title: 'B', position: 1 });
    const tasks = store.getTasksByProject(projectId);
    assert.strictEqual(tasks[0].title, 'A');
    assert.strictEqual(tasks[1].title, 'B');
    assert.strictEqual(tasks[2].title, 'C');
  });
});

describe('Comments', () => {
  let projectId, taskId;

  beforeEach(() => {
    store.resetStore();
    const p = store.createProject({ name: 'P' });
    projectId = p.id;
    const t = store.createTask(projectId, { title: 'T' });
    taskId = t.id;
  });

  it('comment has all required fields', () => {
    const c = store.addComment(taskId, { text: 'Hello', author: 'Alice' });
    assert.ok(c.id);
    assert.strictEqual(c.task_id, taskId);
    assert.strictEqual(c.text, 'Hello');
    assert.strictEqual(c.author, 'Alice');
    assert.ok(c.created_at);
  });

  it('multiple comments returned chronologically', () => {
    store.addComment(taskId, { text: 'First', author: 'A' });
    store.addComment(taskId, { text: 'Second', author: 'B' });
    store.addComment(taskId, { text: 'Third', author: 'C' });
    const comments = store.getCommentsByTask(taskId);
    assert.strictEqual(comments.length, 3);
    assert.strictEqual(comments[0].text, 'First');
    assert.strictEqual(comments[1].text, 'Second');
    assert.strictEqual(comments[2].text, 'Third');
  });

  it('comments are isolated to their task', () => {
    const t2 = store.createTask(projectId, { title: 'Other' });
    store.addComment(taskId, { text: 'For T1', author: 'A' });
    store.addComment(t2.id, { text: 'For T2', author: 'B' });
    assert.strictEqual(store.getCommentsByTask(taskId).length, 1);
    assert.strictEqual(store.getCommentsByTask(t2.id).length, 1);
  });

  it('deleting a task removes its comments', () => {
    store.addComment(taskId, { text: 'Will be gone', author: 'A' });
    store.deleteTask(taskId);
    assert.strictEqual(store.getCommentsByTask(taskId).length, 0);
  });
});
