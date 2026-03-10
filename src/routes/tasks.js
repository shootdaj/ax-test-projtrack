const express = require('express');
const router = express.Router({ mergeParams: true });
const store = require('../store');

// POST /api/projects/:projectId/tasks - Create a task
router.post('/', (req, res) => {
  const { projectId } = req.params;
  const project = store.getProject(projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const { title, description, status, priority, assignee, due_date, tags, position } = req.body;
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'title is required and must be a non-empty string' });
  }

  try {
    const task = store.createTask(projectId, {
      title: title.trim(),
      description,
      status,
      priority,
      assignee,
      due_date,
      tags,
      position
    });

    if (!task) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Log task creation activity
    store.addActivity(task.id, {
      action: 'task_created',
      details: { title: task.title, status: task.status, priority: task.priority },
      actor: assignee || 'system'
    });

    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/projects/:projectId/tasks - List tasks for a project
router.get('/', (req, res) => {
  const { projectId } = req.params;
  const project = store.getProject(projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Support search and filtering via query params
  const { q, status, priority, assignee, tag } = req.query;
  if (q || status || priority || assignee || tag) {
    const results = store.searchTasks(projectId, { q, status, priority, assignee, tag });
    return res.json(results);
  }

  const tasks = store.getTasksByProject(projectId);
  res.json(tasks);
});

// GET /api/projects/:projectId/tasks/:taskId - Get a single task
router.get('/:taskId', (req, res) => {
  const task = store.getTask(req.params.taskId);
  if (!task || task.project_id !== req.params.projectId) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

// PUT /api/projects/:projectId/tasks/:taskId - Update a task
router.put('/:taskId', (req, res) => {
  const task = store.getTask(req.params.taskId);
  if (!task || task.project_id !== req.params.projectId) {
    return res.status(404).json({ error: 'Task not found' });
  }

  try {
    const result = store.updateTask(req.params.taskId, req.body);

    // Log activity for status changes
    if (req.body.status && req.body.status !== result.previous.status) {
      store.addActivity(req.params.taskId, {
        action: 'status_changed',
        details: { from: result.previous.status, to: req.body.status },
        actor: req.body.actor || 'system'
      });
    }

    // Log activity for assignee changes
    if (req.body.assignee !== undefined && req.body.assignee !== result.previous.assignee) {
      store.addActivity(req.params.taskId, {
        action: 'assignee_changed',
        details: { from: result.previous.assignee, to: req.body.assignee },
        actor: req.body.actor || 'system'
      });
    }

    res.json(result.current);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/projects/:projectId/tasks/:taskId - Delete a task
router.delete('/:taskId', (req, res) => {
  const task = store.getTask(req.params.taskId);
  if (!task || task.project_id !== req.params.projectId) {
    return res.status(404).json({ error: 'Task not found' });
  }
  store.deleteTask(req.params.taskId);
  res.status(204).send();
});

// --- Comment routes ---

// POST /api/projects/:projectId/tasks/:taskId/comments
router.post('/:taskId/comments', (req, res) => {
  const task = store.getTask(req.params.taskId);
  if (!task || task.project_id !== req.params.projectId) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const { text, author } = req.body;
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ error: 'text is required' });
  }
  if (!author || typeof author !== 'string' || author.trim() === '') {
    return res.status(400).json({ error: 'author is required' });
  }

  const comment = store.addComment(req.params.taskId, { text: text.trim(), author: author.trim() });

  // Log comment activity
  store.addActivity(req.params.taskId, {
    action: 'comment_added',
    details: { comment_id: comment.id, author: comment.author },
    actor: comment.author
  });

  res.status(201).json(comment);
});

// GET /api/projects/:projectId/tasks/:taskId/comments
router.get('/:taskId/comments', (req, res) => {
  const task = store.getTask(req.params.taskId);
  if (!task || task.project_id !== req.params.projectId) {
    return res.status(404).json({ error: 'Task not found' });
  }
  const comments = store.getCommentsByTask(req.params.taskId);
  res.json(comments);
});

// --- Activity routes ---

// GET /api/projects/:projectId/tasks/:taskId/activity
router.get('/:taskId/activity', (req, res) => {
  const task = store.getTask(req.params.taskId);
  if (!task || task.project_id !== req.params.projectId) {
    return res.status(404).json({ error: 'Task not found' });
  }
  const activities = store.getActivitiesByTask(req.params.taskId);
  res.json(activities);
});

module.exports = router;
