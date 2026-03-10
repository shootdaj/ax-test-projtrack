const express = require('express');
const router = express.Router();
const store = require('../store');

// POST /api/projects - Create a project
router.post('/', (req, res) => {
  const { name, description, members, settings } = req.body;
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'name is required and must be a non-empty string' });
  }
  const project = store.createProject({ name: name.trim(), description, members, settings });
  res.status(201).json(project);
});

// GET /api/projects - List all projects
router.get('/', (req, res) => {
  const projects = store.getAllProjects();
  res.json(projects);
});

// GET /api/projects/:id - Get a single project
router.get('/:id', (req, res) => {
  const project = store.getProject(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json(project);
});

// PUT /api/projects/:id - Update a project
router.put('/:id', (req, res) => {
  const project = store.updateProject(req.params.id, req.body);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json(project);
});

// DELETE /api/projects/:id - Delete a project
router.delete('/:id', (req, res) => {
  const deleted = store.deleteProject(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.status(204).send();
});

module.exports = router;
