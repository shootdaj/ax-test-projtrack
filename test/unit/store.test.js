const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const store = require('../../src/store');

describe('Store - Projects', () => {
  beforeEach(() => {
    store.resetStore();
  });

  it('createProject creates a project with an ID and timestamps', () => {
    const project = store.createProject({ name: 'Test Project', description: 'A test' });
    assert.ok(project.id);
    assert.strictEqual(project.name, 'Test Project');
    assert.strictEqual(project.description, 'A test');
    assert.ok(project.created_at);
    assert.ok(project.updated_at);
  });

  it('getProject returns the project by ID', () => {
    const created = store.createProject({ name: 'Proj' });
    const found = store.getProject(created.id);
    assert.strictEqual(found.id, created.id);
    assert.strictEqual(found.name, 'Proj');
  });

  it('getProject returns null for non-existent ID', () => {
    assert.strictEqual(store.getProject('999'), null);
  });

  it('getAllProjects returns all projects', () => {
    store.createProject({ name: 'A' });
    store.createProject({ name: 'B' });
    const all = store.getAllProjects();
    assert.strictEqual(all.length, 2);
  });

  it('updateProject updates allowed fields', () => {
    const p = store.createProject({ name: 'Old' });
    const updated = store.updateProject(p.id, { name: 'New', description: 'Updated' });
    assert.strictEqual(updated.name, 'New');
    assert.strictEqual(updated.description, 'Updated');
  });

  it('updateProject returns null for non-existent ID', () => {
    assert.strictEqual(store.updateProject('999', { name: 'X' }), null);
  });

  it('deleteProject removes the project', () => {
    const p = store.createProject({ name: 'Del' });
    assert.strictEqual(store.deleteProject(p.id), true);
    assert.strictEqual(store.getProject(p.id), null);
  });

  it('deleteProject returns false for non-existent ID', () => {
    assert.strictEqual(store.deleteProject('999'), false);
  });

  it('deleteProject cleans up associated tasks', () => {
    const p = store.createProject({ name: 'Proj' });
    store.createTask(p.id, { title: 'Task 1' });
    store.deleteProject(p.id);
    assert.strictEqual(store.getTasksByProject(p.id).length, 0);
  });
});

describe('Store - Tasks', () => {
  let projectId;

  beforeEach(() => {
    store.resetStore();
    const p = store.createProject({ name: 'Test Project' });
    projectId = p.id;
  });

  it('createTask creates a task with defaults', () => {
    const task = store.createTask(projectId, { title: 'My Task' });
    assert.ok(task.id);
    assert.strictEqual(task.title, 'My Task');
    assert.strictEqual(task.status, 'todo');
    assert.strictEqual(task.priority, 'medium');
    assert.strictEqual(task.project_id, projectId);
    assert.ok(task.created_at);
    assert.ok(task.updated_at);
  });

  it('createTask with all fields', () => {
    const task = store.createTask(projectId, {
      title: 'Full Task',
      description: 'Desc',
      status: 'in-progress',
      priority: 'high',
      assignee: 'Alice',
      due_date: '2026-04-01',
      tags: ['urgent', 'backend']
    });
    assert.strictEqual(task.description, 'Desc');
    assert.strictEqual(task.status, 'in-progress');
    assert.strictEqual(task.priority, 'high');
    assert.strictEqual(task.assignee, 'Alice');
    assert.strictEqual(task.due_date, '2026-04-01');
    assert.deepStrictEqual(task.tags, ['urgent', 'backend']);
  });

  it('createTask returns null for non-existent project', () => {
    assert.strictEqual(store.createTask('999', { title: 'X' }), null);
  });

  it('createTask throws on invalid status', () => {
    assert.throws(() => {
      store.createTask(projectId, { title: 'Bad', status: 'invalid' });
    }, /Invalid status/);
  });

  it('createTask throws on invalid priority', () => {
    assert.throws(() => {
      store.createTask(projectId, { title: 'Bad', priority: 'mega' });
    }, /Invalid priority/);
  });

  it('getTask returns the task', () => {
    const t = store.createTask(projectId, { title: 'Get Me' });
    const found = store.getTask(t.id);
    assert.strictEqual(found.title, 'Get Me');
  });

  it('getTasksByProject returns sorted tasks', () => {
    store.createTask(projectId, { title: 'A', position: 1 });
    store.createTask(projectId, { title: 'B', position: 0 });
    const tasks = store.getTasksByProject(projectId);
    assert.strictEqual(tasks[0].title, 'B');
    assert.strictEqual(tasks[1].title, 'A');
  });

  it('updateTask updates fields and returns old/new', () => {
    const t = store.createTask(projectId, { title: 'Old', status: 'todo' });
    const result = store.updateTask(t.id, { title: 'New', status: 'done' });
    assert.strictEqual(result.current.title, 'New');
    assert.strictEqual(result.current.status, 'done');
    assert.strictEqual(result.previous.title, 'Old');
    assert.strictEqual(result.previous.status, 'todo');
  });

  it('updateTask throws on invalid status', () => {
    const t = store.createTask(projectId, { title: 'X' });
    assert.throws(() => {
      store.updateTask(t.id, { status: 'bad' });
    }, /Invalid status/);
  });

  it('deleteTask removes the task', () => {
    const t = store.createTask(projectId, { title: 'Del' });
    assert.strictEqual(store.deleteTask(t.id), true);
    assert.strictEqual(store.getTask(t.id), null);
  });

  it('auto-calculates position when not provided', () => {
    const t1 = store.createTask(projectId, { title: 'A' });
    const t2 = store.createTask(projectId, { title: 'B' });
    assert.strictEqual(t1.position, 0);
    assert.strictEqual(t2.position, 1);
  });
});

describe('Store - Comments', () => {
  let taskId;

  beforeEach(() => {
    store.resetStore();
    const p = store.createProject({ name: 'P' });
    const t = store.createTask(p.id, { title: 'T' });
    taskId = t.id;
  });

  it('addComment adds a comment', () => {
    const c = store.addComment(taskId, { text: 'Hello', author: 'Alice' });
    assert.ok(c.id);
    assert.strictEqual(c.text, 'Hello');
    assert.strictEqual(c.author, 'Alice');
    assert.ok(c.created_at);
  });

  it('addComment returns null for non-existent task', () => {
    assert.strictEqual(store.addComment('999', { text: 'X', author: 'Y' }), null);
  });

  it('getCommentsByTask returns chronological comments', () => {
    store.addComment(taskId, { text: 'First', author: 'A' });
    store.addComment(taskId, { text: 'Second', author: 'B' });
    const comments = store.getCommentsByTask(taskId);
    assert.strictEqual(comments.length, 2);
    assert.strictEqual(comments[0].text, 'First');
    assert.strictEqual(comments[1].text, 'Second');
  });
});

describe('Store - Activities', () => {
  let taskId;

  beforeEach(() => {
    store.resetStore();
    const p = store.createProject({ name: 'P' });
    const t = store.createTask(p.id, { title: 'T' });
    taskId = t.id;
  });

  it('addActivity logs an activity', () => {
    const a = store.addActivity(taskId, { action: 'task_created', details: { title: 'T' } });
    assert.ok(a.id);
    assert.strictEqual(a.action, 'task_created');
    assert.ok(a.created_at);
  });

  it('getActivitiesByTask returns activities in order', () => {
    store.addActivity(taskId, { action: 'created' });
    store.addActivity(taskId, { action: 'updated' });
    const activities = store.getActivitiesByTask(taskId);
    assert.strictEqual(activities.length, 2);
    assert.strictEqual(activities[0].action, 'created');
  });
});

describe('Store - Search', () => {
  let projectId;

  beforeEach(() => {
    store.resetStore();
    const p = store.createProject({ name: 'P' });
    projectId = p.id;
    store.createTask(projectId, { title: 'Fix login bug', status: 'todo', priority: 'high', assignee: 'Alice', tags: ['bug'] });
    store.createTask(projectId, { title: 'Add dashboard', status: 'in-progress', priority: 'medium', assignee: 'Bob', tags: ['feature'] });
    store.createTask(projectId, { title: 'Login page redesign', status: 'done', priority: 'low', assignee: 'Alice', tags: ['design'] });
  });

  it('searches by text in title', () => {
    const results = store.searchTasks(projectId, { q: 'login' });
    assert.strictEqual(results.length, 2);
  });

  it('filters by status', () => {
    const results = store.searchTasks(projectId, { status: 'todo' });
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].title, 'Fix login bug');
  });

  it('filters by priority', () => {
    const results = store.searchTasks(projectId, { priority: 'high' });
    assert.strictEqual(results.length, 1);
  });

  it('filters by assignee', () => {
    const results = store.searchTasks(projectId, { assignee: 'Alice' });
    assert.strictEqual(results.length, 2);
  });

  it('filters by tag', () => {
    const results = store.searchTasks(projectId, { tag: 'bug' });
    assert.strictEqual(results.length, 1);
  });

  it('combines search and filter', () => {
    const results = store.searchTasks(projectId, { q: 'login', status: 'todo' });
    assert.strictEqual(results.length, 1);
  });
});

describe('Store - Dashboard', () => {
  let projectId;

  beforeEach(() => {
    store.resetStore();
    const p = store.createProject({ name: 'P' });
    projectId = p.id;
    store.createTask(projectId, { title: 'A', status: 'todo', assignee: 'Alice' });
    store.createTask(projectId, { title: 'B', status: 'done', assignee: 'Bob' });
    store.createTask(projectId, { title: 'C', status: 'todo', assignee: 'Alice', due_date: '2020-01-01' }); // overdue
  });

  it('returns task counts by status', () => {
    const stats = store.getDashboardStats(projectId);
    assert.strictEqual(stats.by_status['todo'], 2);
    assert.strictEqual(stats.by_status['done'], 1);
  });

  it('returns overdue tasks', () => {
    const stats = store.getDashboardStats(projectId);
    assert.strictEqual(stats.overdue.length, 1);
    assert.strictEqual(stats.overdue[0].title, 'C');
  });

  it('returns task counts by assignee', () => {
    const stats = store.getDashboardStats(projectId);
    assert.strictEqual(stats.by_assignee['Alice'], 2);
    assert.strictEqual(stats.by_assignee['Bob'], 1);
  });

  it('returns total count', () => {
    const stats = store.getDashboardStats(projectId);
    assert.strictEqual(stats.total, 3);
  });
});
