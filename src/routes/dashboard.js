const express = require('express');
const router = express.Router({ mergeParams: true });
const store = require('../store');

// GET /api/projects/:projectId/dashboard - Dashboard stats
router.get('/', (req, res) => {
  const { projectId } = req.params;
  const project = store.getProject(projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const stats = store.getDashboardStats(projectId);

  // Add burndown data if there's an active sprint
  const sprints = store.getSprintsByProject(projectId);
  const now = new Date();
  const activeSprint = sprints.find(s =>
    new Date(s.start_date) <= now && new Date(s.end_date) >= now
  );

  let burndown = null;
  if (activeSprint) {
    const sprintTasks = store.getTasksBySprint(activeSprint.id);
    const totalTasks = sprintTasks.length;
    const startDate = new Date(activeSprint.start_date);
    const endDate = new Date(activeSprint.end_date);
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const daysPassed = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
    const completedTasks = sprintTasks.filter(t => t.status === 'done').length;
    const remainingTasks = totalTasks - completedTasks;

    burndown = {
      sprint_id: activeSprint.id,
      sprint_name: activeSprint.name,
      total_tasks: totalTasks,
      completed: completedTasks,
      remaining: remainingTasks,
      total_days: totalDays,
      days_passed: daysPassed,
      ideal_remaining: Math.max(0, totalTasks - (totalTasks * daysPassed / totalDays)),
      data_points: []
    };

    // Generate daily data points for burndown
    for (let d = 0; d <= totalDays; d++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + d);
      burndown.data_points.push({
        date: date.toISOString().split('T')[0],
        ideal: Math.max(0, totalTasks - (totalTasks * d / totalDays)),
        actual: d <= daysPassed ? Math.max(0, totalTasks - Math.floor(completedTasks * d / Math.max(daysPassed, 1))) : null
      });
    }
  }

  res.json({ ...stats, burndown });
});

module.exports = router;
