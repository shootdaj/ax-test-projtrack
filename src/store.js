// In-memory data store for the project tracker
// All data lives here — no database persistence

const store = {
  projects: new Map(),
  tasks: new Map(),
  comments: new Map(),
  activities: new Map(),
  sprints: new Map(),
  counters: {
    project: 0,
    task: 0,
    comment: 0,
    activity: 0,
    sprint: 0
  }
};

function nextId(type) {
  store.counters[type] += 1;
  return String(store.counters[type]);
}

function resetStore() {
  store.projects.clear();
  store.tasks.clear();
  store.comments.clear();
  store.activities.clear();
  store.sprints.clear();
  store.counters = { project: 0, task: 0, comment: 0, activity: 0, sprint: 0 };
}

// --- Project operations ---

function createProject({ name, description = '', members = [], settings = {} }) {
  const id = nextId('project');
  const project = {
    id,
    name,
    description,
    members,
    settings,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  store.projects.set(id, project);
  return { ...project };
}

function getProject(id) {
  const project = store.projects.get(id);
  return project ? { ...project } : null;
}

function getAllProjects() {
  return Array.from(store.projects.values()).map(p => ({ ...p }));
}

function updateProject(id, updates) {
  const project = store.projects.get(id);
  if (!project) return null;
  const allowed = ['name', 'description', 'members', 'settings'];
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      project[key] = updates[key];
    }
  }
  project.updated_at = new Date().toISOString();
  store.projects.set(id, project);
  return { ...project };
}

function deleteProject(id) {
  const existed = store.projects.has(id);
  if (existed) {
    store.projects.delete(id);
    // Clean up associated tasks, comments, activities, sprints
    for (const [taskId, task] of store.tasks) {
      if (task.project_id === id) {
        store.tasks.delete(taskId);
        // Clean up comments and activities for this task
        for (const [cId, comment] of store.comments) {
          if (comment.task_id === taskId) store.comments.delete(cId);
        }
        for (const [aId, activity] of store.activities) {
          if (activity.task_id === taskId) store.activities.delete(aId);
        }
      }
    }
    for (const [sId, sprint] of store.sprints) {
      if (sprint.project_id === id) store.sprints.delete(sId);
    }
  }
  return existed;
}

// --- Task operations ---

const VALID_STATUSES = ['todo', 'in-progress', 'review', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];

function createTask(projectId, { title, description = '', status = 'todo', priority = 'medium', assignee = null, due_date = null, tags = [], position = null }) {
  if (!store.projects.has(projectId)) return null;
  if (!VALID_STATUSES.includes(status)) throw new Error(`Invalid status: ${status}`);
  if (!VALID_PRIORITIES.includes(priority)) throw new Error(`Invalid priority: ${priority}`);

  const id = nextId('task');

  // Auto-calculate position if not provided
  if (position === null) {
    const tasksInColumn = getTasksByProject(projectId).filter(t => t.status === status);
    position = tasksInColumn.length;
  }

  const task = {
    id,
    project_id: projectId,
    title,
    description,
    status,
    priority,
    assignee,
    due_date,
    tags: Array.isArray(tags) ? tags : [],
    position,
    sprint_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  store.tasks.set(id, task);
  return { ...task };
}

function getTask(id) {
  const task = store.tasks.get(id);
  return task ? { ...task } : null;
}

function getTasksByProject(projectId) {
  return Array.from(store.tasks.values())
    .filter(t => t.project_id === projectId)
    .sort((a, b) => a.position - b.position)
    .map(t => ({ ...t }));
}

function updateTask(id, updates) {
  const task = store.tasks.get(id);
  if (!task) return null;

  const oldTask = { ...task };
  const allowed = ['title', 'description', 'status', 'priority', 'assignee', 'due_date', 'tags', 'position', 'sprint_id'];
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      if (key === 'status' && !VALID_STATUSES.includes(updates[key])) {
        throw new Error(`Invalid status: ${updates[key]}`);
      }
      if (key === 'priority' && !VALID_PRIORITIES.includes(updates[key])) {
        throw new Error(`Invalid priority: ${updates[key]}`);
      }
      task[key] = updates[key];
    }
  }
  task.updated_at = new Date().toISOString();
  store.tasks.set(id, task);
  return { current: { ...task }, previous: oldTask };
}

function deleteTask(id) {
  const existed = store.tasks.has(id);
  if (existed) {
    store.tasks.delete(id);
    // Clean up comments and activities
    for (const [cId, comment] of store.comments) {
      if (comment.task_id === id) store.comments.delete(cId);
    }
    for (const [aId, activity] of store.activities) {
      if (activity.task_id === id) store.activities.delete(aId);
    }
  }
  return existed;
}

// --- Comment operations ---

function addComment(taskId, { text, author }) {
  if (!store.tasks.has(taskId)) return null;
  const id = nextId('comment');
  const comment = {
    id,
    task_id: taskId,
    text,
    author,
    created_at: new Date().toISOString()
  };
  store.comments.set(id, comment);
  return { ...comment };
}

function getCommentsByTask(taskId) {
  return Array.from(store.comments.values())
    .filter(c => c.task_id === taskId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map(c => ({ ...c }));
}

// --- Activity operations ---

function addActivity(taskId, { action, details = {}, actor = 'system' }) {
  const id = nextId('activity');
  const activity = {
    id,
    task_id: taskId,
    action,
    details,
    actor,
    created_at: new Date().toISOString()
  };
  store.activities.set(id, activity);
  return { ...activity };
}

function getActivitiesByTask(taskId) {
  return Array.from(store.activities.values())
    .filter(a => a.task_id === taskId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map(a => ({ ...a }));
}

// --- Sprint operations ---

function createSprint(projectId, { name, start_date, end_date }) {
  if (!store.projects.has(projectId)) return null;
  const id = nextId('sprint');
  const sprint = {
    id,
    project_id: projectId,
    name,
    start_date,
    end_date,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  store.sprints.set(id, sprint);
  return { ...sprint };
}

function getSprint(id) {
  const sprint = store.sprints.get(id);
  return sprint ? { ...sprint } : null;
}

function getSprintsByProject(projectId) {
  return Array.from(store.sprints.values())
    .filter(s => s.project_id === projectId)
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    .map(s => ({ ...s }));
}

function getTasksBySprint(sprintId) {
  return Array.from(store.tasks.values())
    .filter(t => t.sprint_id === sprintId)
    .map(t => ({ ...t }));
}

// --- Search operations ---

function searchTasks(projectId, { q = '', status = null, priority = null, assignee = null, tag = null } = {}) {
  let tasks = Array.from(store.tasks.values()).filter(t => t.project_id === projectId);

  if (q) {
    const query = q.toLowerCase();
    tasks = tasks.filter(t =>
      t.title.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query)
    );
  }
  if (status) {
    tasks = tasks.filter(t => t.status === status);
  }
  if (priority) {
    tasks = tasks.filter(t => t.priority === priority);
  }
  if (assignee) {
    tasks = tasks.filter(t => t.assignee === assignee);
  }
  if (tag) {
    tasks = tasks.filter(t => t.tags && t.tags.includes(tag));
  }

  return tasks.map(t => ({ ...t }));
}

// --- Dashboard operations ---

function getDashboardStats(projectId) {
  const tasks = Array.from(store.tasks.values()).filter(t => t.project_id === projectId);

  const byStatus = {};
  for (const s of VALID_STATUSES) {
    byStatus[s] = tasks.filter(t => t.status === s).length;
  }

  const now = new Date();
  const overdue = tasks.filter(t =>
    t.due_date && new Date(t.due_date) < now && t.status !== 'done'
  ).map(t => ({ ...t }));

  const byAssignee = {};
  for (const t of tasks) {
    const key = t.assignee || 'unassigned';
    byAssignee[key] = (byAssignee[key] || 0) + 1;
  }

  return {
    total: tasks.length,
    by_status: byStatus,
    overdue,
    by_assignee: byAssignee
  };
}

module.exports = {
  store,
  resetStore,
  createProject, getProject, getAllProjects, updateProject, deleteProject,
  createTask, getTask, getTasksByProject, updateTask, deleteTask,
  addComment, getCommentsByTask,
  addActivity, getActivitiesByTask,
  createSprint, getSprint, getSprintsByProject, getTasksBySprint,
  searchTasks, getDashboardStats,
  VALID_STATUSES, VALID_PRIORITIES
};
