const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const store = require('../../src/store');

describe('Store - Sprints', () => {
  let projectId;

  beforeEach(() => {
    store.resetStore();
    const p = store.createProject({ name: 'Sprint Project' });
    projectId = p.id;
  });

  it('createSprint creates a sprint with all fields', () => {
    const sprint = store.createSprint(projectId, {
      name: 'Sprint 1',
      start_date: '2026-03-01',
      end_date: '2026-03-14'
    });
    assert.ok(sprint.id);
    assert.strictEqual(sprint.name, 'Sprint 1');
    assert.strictEqual(sprint.start_date, '2026-03-01');
    assert.strictEqual(sprint.end_date, '2026-03-14');
    assert.strictEqual(sprint.project_id, projectId);
    assert.ok(sprint.created_at);
  });

  it('createSprint returns null for non-existent project', () => {
    const sprint = store.createSprint('999', { name: 'S', start_date: '2026-01-01', end_date: '2026-01-14' });
    assert.strictEqual(sprint, null);
  });

  it('getSprint returns the sprint', () => {
    const s = store.createSprint(projectId, { name: 'S', start_date: '2026-01-01', end_date: '2026-01-14' });
    const found = store.getSprint(s.id);
    assert.strictEqual(found.name, 'S');
  });

  it('getSprint returns null for non-existent', () => {
    assert.strictEqual(store.getSprint('999'), null);
  });

  it('getSprintsByProject returns all sprints sorted by start date', () => {
    store.createSprint(projectId, { name: 'Sprint 2', start_date: '2026-03-15', end_date: '2026-03-28' });
    store.createSprint(projectId, { name: 'Sprint 1', start_date: '2026-03-01', end_date: '2026-03-14' });
    const sprints = store.getSprintsByProject(projectId);
    assert.strictEqual(sprints.length, 2);
    assert.strictEqual(sprints[0].name, 'Sprint 1');
    assert.strictEqual(sprints[1].name, 'Sprint 2');
  });

  it('assigns task to sprint via updateTask', () => {
    const sprint = store.createSprint(projectId, { name: 'S1', start_date: '2026-01-01', end_date: '2026-01-14' });
    const task = store.createTask(projectId, { title: 'Task 1' });
    store.updateTask(task.id, { sprint_id: sprint.id });
    const updated = store.getTask(task.id);
    assert.strictEqual(updated.sprint_id, sprint.id);
  });

  it('getTasksBySprint returns assigned tasks', () => {
    const sprint = store.createSprint(projectId, { name: 'S1', start_date: '2026-01-01', end_date: '2026-01-14' });
    const t1 = store.createTask(projectId, { title: 'T1' });
    const t2 = store.createTask(projectId, { title: 'T2' });
    const t3 = store.createTask(projectId, { title: 'T3 no sprint' });
    store.updateTask(t1.id, { sprint_id: sprint.id });
    store.updateTask(t2.id, { sprint_id: sprint.id });
    const sprintTasks = store.getTasksBySprint(sprint.id);
    assert.strictEqual(sprintTasks.length, 2);
  });

  it('sprint summary shows correct stats', () => {
    const sprint = store.createSprint(projectId, { name: 'S1', start_date: '2026-01-01', end_date: '2026-01-14' });
    const t1 = store.createTask(projectId, { title: 'T1', status: 'done' });
    const t2 = store.createTask(projectId, { title: 'T2', status: 'todo' });
    const t3 = store.createTask(projectId, { title: 'T3', status: 'in-progress' });
    store.updateTask(t1.id, { sprint_id: sprint.id });
    store.updateTask(t2.id, { sprint_id: sprint.id });
    store.updateTask(t3.id, { sprint_id: sprint.id });

    const sprintTasks = store.getTasksBySprint(sprint.id);
    const byStatus = {};
    for (const s of store.VALID_STATUSES) {
      byStatus[s] = sprintTasks.filter(t => t.status === s).length;
    }
    assert.strictEqual(sprintTasks.length, 3);
    assert.strictEqual(byStatus['done'], 1);
    assert.strictEqual(byStatus['todo'], 1);
    assert.strictEqual(byStatus['in-progress'], 1);
  });

  it('deleting project removes sprints', () => {
    store.createSprint(projectId, { name: 'S1', start_date: '2026-01-01', end_date: '2026-01-14' });
    store.deleteProject(projectId);
    assert.strictEqual(store.getSprintsByProject(projectId).length, 0);
  });
});
