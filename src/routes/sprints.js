const express = require('express');
const router = express.Router({ mergeParams: true });
const store = require('../store');

// POST /api/projects/:projectId/sprints - Create a sprint
router.post('/', (req, res) => {
  const { projectId } = req.params;
  const project = store.getProject(projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const { name, start_date, end_date } = req.body;
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'name is required' });
  }
  if (!start_date) {
    return res.status(400).json({ error: 'start_date is required' });
  }
  if (!end_date) {
    return res.status(400).json({ error: 'end_date is required' });
  }

  const sprint = store.createSprint(projectId, {
    name: name.trim(),
    start_date,
    end_date
  });
  res.status(201).json(sprint);
});

// GET /api/projects/:projectId/sprints - List sprints
router.get('/', (req, res) => {
  const { projectId } = req.params;
  const project = store.getProject(projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const sprints = store.getSprintsByProject(projectId);
  res.json(sprints);
});

// GET /api/projects/:projectId/sprints/:sprintId - Get sprint
router.get('/:sprintId', (req, res) => {
  const sprint = store.getSprint(req.params.sprintId);
  if (!sprint || sprint.project_id !== req.params.projectId) {
    return res.status(404).json({ error: 'Sprint not found' });
  }
  res.json(sprint);
});

// GET /api/projects/:projectId/sprints/:sprintId/summary - Sprint summary stats
router.get('/:sprintId/summary', (req, res) => {
  const sprint = store.getSprint(req.params.sprintId);
  if (!sprint || sprint.project_id !== req.params.projectId) {
    return res.status(404).json({ error: 'Sprint not found' });
  }

  const tasks = store.getTasksBySprint(req.params.sprintId);
  const byStatus = {};
  for (const s of store.VALID_STATUSES) {
    byStatus[s] = tasks.filter(t => t.status === s).length;
  }

  res.json({
    sprint_id: sprint.id,
    sprint_name: sprint.name,
    total_tasks: tasks.length,
    completed: byStatus['done'] || 0,
    remaining: tasks.length - (byStatus['done'] || 0),
    by_status: byStatus
  });
});

// POST /api/projects/:projectId/sprints/:sprintId/tasks - Assign task to sprint
router.post('/:sprintId/tasks', (req, res) => {
  const sprint = store.getSprint(req.params.sprintId);
  if (!sprint || sprint.project_id !== req.params.projectId) {
    return res.status(404).json({ error: 'Sprint not found' });
  }

  const { task_id } = req.body;
  if (!task_id) {
    return res.status(400).json({ error: 'task_id is required' });
  }

  const task = store.getTask(task_id);
  if (!task || task.project_id !== req.params.projectId) {
    return res.status(404).json({ error: 'Task not found in this project' });
  }

  const result = store.updateTask(task_id, { sprint_id: req.params.sprintId });
  res.json(result.current);
});

// GET /api/projects/:projectId/sprints/:sprintId/tasks - Get sprint tasks
router.get('/:sprintId/tasks', (req, res) => {
  const sprint = store.getSprint(req.params.sprintId);
  if (!sprint || sprint.project_id !== req.params.projectId) {
    return res.status(404).json({ error: 'Sprint not found' });
  }

  const tasks = store.getTasksBySprint(req.params.sprintId);
  res.json(tasks);
});

module.exports = router;
