const express = require('express');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const sprintRoutes = require('./routes/sprints');
const dashboardRoutes = require('./routes/dashboard');

app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/tasks', taskRoutes);
app.use('/api/projects/:projectId/sprints', sprintRoutes);
app.use('/api/projects/:projectId/dashboard', dashboardRoutes);

// Catch-all: serve index.html for non-API routes (SPA support)
app.use((req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

module.exports = app;
