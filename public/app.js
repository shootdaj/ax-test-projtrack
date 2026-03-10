// === State ===
const state = {
  projects: [],
  currentProject: null,
  tasks: [],
  sprints: [],
  currentView: 'kanban', // kanban, dashboard, sprints
  searchQuery: ''
};

// === API Helper ===
async function api(method, path, body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  if (res.status === 204) return null;
  return res.json();
}

// === Initialization ===
document.addEventListener('DOMContentLoaded', async () => {
  await loadProjects();
  setupEventListeners();
  if (state.projects.length > 0) {
    selectProject(state.projects[0].id);
  }
});

function setupEventListeners() {
  // Navigation
  document.getElementById('nav-kanban').addEventListener('click', () => switchView('kanban'));
  document.getElementById('nav-dashboard').addEventListener('click', () => switchView('dashboard'));
  document.getElementById('nav-sprints').addEventListener('click', () => switchView('sprints'));

  // Add project
  document.getElementById('btn-new-project').addEventListener('click', showNewProjectModal);

  // Search
  document.getElementById('search-input').addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderKanban();
  });

  // Modal close
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  // Add task button
  document.getElementById('btn-add-task').addEventListener('click', showNewTaskModal);
}

// === Projects ===
async function loadProjects() {
  state.projects = await api('GET', '/api/projects');
  renderProjectList();
}

async function selectProject(id) {
  state.currentProject = id;
  state.tasks = await api('GET', `/api/projects/${id}/tasks`);
  state.sprints = await api('GET', `/api/projects/${id}/sprints`);
  renderProjectList();
  renderCurrentView();

  const proj = state.projects.find(p => p.id === id);
  document.getElementById('project-title').textContent = proj ? proj.name : 'Project Tracker';
}

function renderProjectList() {
  const list = document.getElementById('project-items');
  list.innerHTML = state.projects.map(p => `
    <div class="project-item ${p.id === state.currentProject ? 'active' : ''}"
         onclick="selectProject('${p.id}')">
      ${escapeHtml(p.name)}
    </div>
  `).join('');
}

async function showNewProjectModal() {
  const modal = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  content.innerHTML = `
    <div class="modal-header">
      <h3>New Project</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Project Name</label>
        <input type="text" id="project-name-input" placeholder="e.g., My Project" autofocus>
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="project-desc-input" placeholder="Project description..."></textarea>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="createProject()">Create</button>
    </div>
  `;
  modal.classList.remove('hidden');
}

async function createProject() {
  const name = document.getElementById('project-name-input').value.trim();
  const description = document.getElementById('project-desc-input').value.trim();
  if (!name) return;
  const project = await api('POST', '/api/projects', { name, description });
  state.projects.push(project);
  closeModal();
  renderProjectList();
  selectProject(project.id);
}

// === Views ===
function switchView(view) {
  state.currentView = view;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById(`nav-${view}`).classList.add('active');
  document.querySelectorAll('.view-content').forEach(el => el.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');
  renderCurrentView();
}

function renderCurrentView() {
  if (!state.currentProject) return;
  if (state.currentView === 'kanban') renderKanban();
  else if (state.currentView === 'dashboard') renderDashboard();
  else if (state.currentView === 'sprints') renderSprintView();
}

// === Kanban Board ===
function renderKanban() {
  const statuses = ['todo', 'in-progress', 'review', 'done'];
  const statusLabels = { 'todo': 'To Do', 'in-progress': 'In Progress', 'review': 'Review', 'done': 'Done' };

  let filteredTasks = state.tasks;
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    filteredTasks = state.tasks.filter(t =>
      t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );
  }

  const board = document.getElementById('kanban-columns');
  board.innerHTML = statuses.map(status => {
    const columnTasks = filteredTasks
      .filter(t => t.status === status)
      .sort((a, b) => a.position - b.position);

    return `
      <div class="kanban-column status-${status}" data-status="${status}">
        <div class="column-header">
          ${statusLabels[status]}
          <span class="column-count">${columnTasks.length}</span>
        </div>
        <div class="column-cards" data-status="${status}"
             ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event)">
          ${columnTasks.map(t => renderTaskCard(t)).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function renderTaskCard(task) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  return `
    <div class="task-card" draggable="true" data-task-id="${task.id}"
         ondragstart="handleDragStart(event)" ondragend="handleDragEnd(event)"
         onclick="showTaskDetail('${task.id}')">
      <div class="task-card-title">${escapeHtml(task.title)}</div>
      <div class="task-card-meta">
        <span class="priority-badge priority-${task.priority}">${task.priority}</span>
        ${task.tags.map(t => `<span class="tag-badge">${escapeHtml(t)}</span>`).join('')}
        ${task.due_date ? `<span class="due-date-badge ${isOverdue ? 'overdue' : ''}">${task.due_date}</span>` : ''}
        ${task.assignee ? `<span class="assignee-badge">${escapeHtml(task.assignee)}</span>` : ''}
      </div>
    </div>
  `;
}

// === Drag and Drop ===
let draggedTaskId = null;

function handleDragStart(e) {
  draggedTaskId = e.target.dataset.taskId;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  document.querySelectorAll('.column-cards').forEach(c => c.classList.remove('drag-over'));
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

async function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  const newStatus = e.currentTarget.dataset.status;
  if (!draggedTaskId || !newStatus) return;

  const task = state.tasks.find(t => t.id === draggedTaskId);
  if (!task || task.status === newStatus) return;

  // Optimistic update
  task.status = newStatus;
  renderKanban();

  // API call
  await api('PUT', `/api/projects/${state.currentProject}/tasks/${draggedTaskId}`, { status: newStatus });

  // Refresh tasks
  state.tasks = await api('GET', `/api/projects/${state.currentProject}/tasks`);
  renderKanban();
  draggedTaskId = null;
}

// === Task Detail Modal ===
async function showTaskDetail(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  const comments = await api('GET', `/api/projects/${state.currentProject}/tasks/${taskId}/comments`);
  const activities = await api('GET', `/api/projects/${state.currentProject}/tasks/${taskId}/activity`);

  const modal = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  content.innerHTML = `
    <div class="modal-header">
      <h3>${escapeHtml(task.title)}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Title</label>
        <input type="text" id="edit-title" value="${escapeHtml(task.title)}">
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="edit-description">${escapeHtml(task.description || '')}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Status</label>
          <select id="edit-status">
            <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>To Do</option>
            <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
            <option value="review" ${task.status === 'review' ? 'selected' : ''}>Review</option>
            <option value="done" ${task.status === 'done' ? 'selected' : ''}>Done</option>
          </select>
        </div>
        <div class="form-group">
          <label>Priority</label>
          <select id="edit-priority">
            <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
            <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
            <option value="critical" ${task.priority === 'critical' ? 'selected' : ''}>Critical</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Assignee</label>
          <input type="text" id="edit-assignee" value="${escapeHtml(task.assignee || '')}">
        </div>
        <div class="form-group">
          <label>Due Date</label>
          <input type="date" id="edit-duedate" value="${task.due_date || ''}">
        </div>
      </div>
      <div class="form-group">
        <label>Tags (comma-separated)</label>
        <input type="text" id="edit-tags" value="${(task.tags || []).join(', ')}">
      </div>

      <!-- Comments -->
      <div class="comments-section">
        <h4>Comments (${comments.length})</h4>
        <div id="comments-list">
          ${comments.map(c => `
            <div class="comment-item">
              <div class="comment-header">
                <span class="comment-author">${escapeHtml(c.author)}</span>
                <span>${new Date(c.created_at).toLocaleString()}</span>
              </div>
              <div class="comment-text">${escapeHtml(c.text)}</div>
            </div>
          `).join('')}
        </div>
        <div class="comment-form">
          <input type="text" id="comment-author" placeholder="Your name" style="max-width:120px">
          <input type="text" id="comment-text" placeholder="Add a comment...">
          <button class="btn btn-primary" onclick="addComment('${taskId}')">Post</button>
        </div>
      </div>

      <!-- Activity Log -->
      <div class="activity-section">
        <h4>Activity</h4>
        ${activities.map(a => `
          <div class="activity-item">
            <div class="activity-dot"></div>
            <span>${formatActivity(a)}</span>
            <span class="activity-time">${new Date(a.created_at).toLocaleString()}</span>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-danger" onclick="deleteTask('${taskId}')">Delete</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveTask('${taskId}')">Save</button>
    </div>
  `;
  modal.classList.remove('hidden');
}

function formatActivity(a) {
  switch (a.action) {
    case 'task_created': return `Task created`;
    case 'status_changed': return `Status: ${a.details.from} → ${a.details.to}`;
    case 'assignee_changed': return `Assigned: ${a.details.from || 'none'} → ${a.details.to}`;
    case 'comment_added': return `${a.details.author} commented`;
    default: return a.action;
  }
}

async function saveTask(taskId) {
  const updates = {
    title: document.getElementById('edit-title').value.trim(),
    description: document.getElementById('edit-description').value.trim(),
    status: document.getElementById('edit-status').value,
    priority: document.getElementById('edit-priority').value,
    assignee: document.getElementById('edit-assignee').value.trim() || null,
    due_date: document.getElementById('edit-duedate').value || null,
    tags: document.getElementById('edit-tags').value.split(',').map(t => t.trim()).filter(Boolean)
  };
  await api('PUT', `/api/projects/${state.currentProject}/tasks/${taskId}`, updates);
  state.tasks = await api('GET', `/api/projects/${state.currentProject}/tasks`);
  closeModal();
  renderCurrentView();
}

async function deleteTask(taskId) {
  if (!confirm('Delete this task?')) return;
  await api('DELETE', `/api/projects/${state.currentProject}/tasks/${taskId}`);
  state.tasks = await api('GET', `/api/projects/${state.currentProject}/tasks`);
  closeModal();
  renderCurrentView();
}

async function addComment(taskId) {
  const text = document.getElementById('comment-text').value.trim();
  const author = document.getElementById('comment-author').value.trim();
  if (!text || !author) return;
  await api('POST', `/api/projects/${state.currentProject}/tasks/${taskId}/comments`, { text, author });
  showTaskDetail(taskId); // Refresh modal
}

// === New Task Modal ===
function showNewTaskModal() {
  if (!state.currentProject) return;
  const modal = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  content.innerHTML = `
    <div class="modal-header">
      <h3>New Task</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Title</label>
        <input type="text" id="new-task-title" placeholder="Task title" autofocus>
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="new-task-desc" placeholder="Task description..."></textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Status</label>
          <select id="new-task-status">
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div class="form-group">
          <label>Priority</label>
          <select id="new-task-priority">
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Assignee</label>
          <input type="text" id="new-task-assignee" placeholder="Name">
        </div>
        <div class="form-group">
          <label>Due Date</label>
          <input type="date" id="new-task-duedate">
        </div>
      </div>
      <div class="form-group">
        <label>Tags (comma-separated)</label>
        <input type="text" id="new-task-tags" placeholder="e.g., bug, frontend">
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="createTask()">Create</button>
    </div>
  `;
  modal.classList.remove('hidden');
}

async function createTask() {
  const title = document.getElementById('new-task-title').value.trim();
  if (!title) return;
  const taskData = {
    title,
    description: document.getElementById('new-task-desc').value.trim(),
    status: document.getElementById('new-task-status').value,
    priority: document.getElementById('new-task-priority').value,
    assignee: document.getElementById('new-task-assignee').value.trim() || null,
    due_date: document.getElementById('new-task-duedate').value || null,
    tags: document.getElementById('new-task-tags').value.split(',').map(t => t.trim()).filter(Boolean)
  };
  await api('POST', `/api/projects/${state.currentProject}/tasks`, taskData);
  state.tasks = await api('GET', `/api/projects/${state.currentProject}/tasks`);
  closeModal();
  renderKanban();
}

// === Dashboard ===
async function renderDashboard() {
  if (!state.currentProject) return;
  const stats = await api('GET', `/api/projects/${state.currentProject}/dashboard`);
  const container = document.getElementById('dashboard-content');

  const priorityCounts = {};
  state.tasks.forEach(t => { priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1; });

  container.innerHTML = `
    <div class="dashboard-cards">
      <div class="dash-card">
        <div class="dash-card-label">Total Tasks</div>
        <div class="dash-card-value">${stats.total}</div>
      </div>
      <div class="dash-card">
        <div class="dash-card-label">Overdue</div>
        <div class="dash-card-value" style="color:${stats.overdue.length > 0 ? '#dc2626' : '#059669'}">${stats.overdue.length}</div>
      </div>
      <div class="dash-card">
        <div class="dash-card-label">Completed</div>
        <div class="dash-card-value">${stats.by_status.done || 0}</div>
        <div class="dash-card-sub">${stats.total > 0 ? Math.round(((stats.by_status.done || 0) / stats.total) * 100) : 0}% complete</div>
      </div>
      <div class="dash-card">
        <div class="dash-card-label">In Progress</div>
        <div class="dash-card-value">${(stats.by_status['in-progress'] || 0) + (stats.by_status.review || 0)}</div>
      </div>
    </div>

    <div class="dashboard-charts">
      <div class="chart-container">
        <h4>Tasks by Status</h4>
        <canvas id="status-chart" class="chart-canvas"></canvas>
      </div>
      <div class="chart-container">
        <h4>Tasks by Priority</h4>
        <canvas id="priority-chart" class="chart-canvas"></canvas>
      </div>
      <div class="chart-container">
        <h4>Tasks by Assignee</h4>
        <canvas id="assignee-chart" class="chart-canvas"></canvas>
      </div>
      ${stats.burndown ? `
        <div class="chart-container">
          <h4>Sprint Burndown</h4>
          <canvas id="burndown-chart" class="chart-canvas"></canvas>
        </div>
      ` : ''}
    </div>

    ${stats.overdue.length > 0 ? `
      <div style="margin-top:20px">
        <h4 style="margin-bottom:12px;color:#dc2626">Overdue Tasks</h4>
        <div class="sprint-tasks-list">
          ${stats.overdue.map(t => `
            <div class="sprint-task-item" onclick="showTaskDetail('${t.id}')">
              <div class="sprint-task-status status-dot-${t.status.replace('-', '')}"></div>
              <span>${escapeHtml(t.title)}</span>
              <span class="due-date-badge overdue">${t.due_date}</span>
              <span class="assignee-badge">${t.assignee || ''}</span>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;

  // Draw charts
  drawBarChart('status-chart', stats.by_status, { 'todo': '#9ca3af', 'in-progress': '#3b82f6', 'review': '#f59e0b', 'done': '#10b981' });
  drawBarChart('priority-chart', priorityCounts, { 'low': '#9ca3af', 'medium': '#3b82f6', 'high': '#f59e0b', 'critical': '#ef4444' });
  drawBarChart('assignee-chart', stats.by_assignee, {});

  if (stats.burndown) {
    drawBurndownChart('burndown-chart', stats.burndown);
  }
}

function drawBarChart(canvasId, data, colorMap) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth;
  canvas.height = 200;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const entries = Object.entries(data);
  if (entries.length === 0) return;

  const maxVal = Math.max(...entries.map(e => e[1]), 1);
  const barWidth = Math.min(60, (canvas.width - 40) / entries.length - 10);
  const startX = 30;
  const chartHeight = canvas.height - 50;

  const defaultColors = ['#4f46e5', '#06b6d4', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6'];

  entries.forEach(([label, value], i) => {
    const x = startX + i * (barWidth + 10);
    const barHeight = (value / maxVal) * chartHeight;
    const y = chartHeight - barHeight + 10;

    ctx.fillStyle = colorMap[label] || defaultColors[i % defaultColors.length];
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = '#666';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + barWidth / 2, canvas.height - 5);
    ctx.fillText(String(value), x + barWidth / 2, y - 5);
  });
}

function drawBurndownChart(canvasId, burndown) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth;
  canvas.height = 200;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const data = burndown.data_points;
  if (data.length < 2) return;

  const maxVal = burndown.total_tasks;
  const chartWidth = canvas.width - 60;
  const chartHeight = canvas.height - 40;
  const startX = 40;
  const startY = 10;

  // Ideal line
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  data.forEach((point, i) => {
    const x = startX + (i / (data.length - 1)) * chartWidth;
    const y = startY + ((maxVal - point.ideal) / maxVal) * chartHeight;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Actual line
  ctx.strokeStyle = '#4f46e5';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.beginPath();
  let started = false;
  data.forEach((point, i) => {
    if (point.actual === null) return;
    const x = startX + (i / (data.length - 1)) * chartWidth;
    const y = startY + ((maxVal - point.actual) / maxVal) * chartHeight;
    if (!started) { ctx.moveTo(x, y); started = true; }
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Labels
  ctx.fillStyle = '#999';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(data[0].date, startX, canvas.height - 5);
  ctx.fillText(data[data.length - 1].date, startX + chartWidth, canvas.height - 5);
}

// === Sprint View ===
async function renderSprintView() {
  if (!state.currentProject) return;
  state.sprints = await api('GET', `/api/projects/${state.currentProject}/sprints`);
  const container = document.getElementById('sprint-content');

  if (state.sprints.length === 0) {
    container.innerHTML = '<p style="padding:20px;color:#888">No sprints yet. Create one to get started.</p>';
    return;
  }

  // Find active sprint (current date between start and end)
  const now = new Date();
  const activeSprint = state.sprints.find(s =>
    new Date(s.start_date) <= now && new Date(s.end_date) >= now
  ) || state.sprints[state.sprints.length - 1];

  const summary = await api('GET', `/api/projects/${state.currentProject}/sprints/${activeSprint.id}/summary`);
  const sprintTasks = await api('GET', `/api/projects/${state.currentProject}/sprints/${activeSprint.id}/tasks`);
  const dashboard = await api('GET', `/api/projects/${state.currentProject}/dashboard`);

  container.innerHTML = `
    <div class="sprint-header">
      <h3>${escapeHtml(activeSprint.name)}</h3>
      <p style="color:#888">${activeSprint.start_date} to ${activeSprint.end_date}</p>
    </div>

    <div class="sprint-stats">
      <div class="sprint-stat">
        <div class="sprint-stat-value">${summary.total_tasks}</div>
        <div class="sprint-stat-label">Total</div>
      </div>
      <div class="sprint-stat">
        <div class="sprint-stat-value" style="color:#10b981">${summary.completed}</div>
        <div class="sprint-stat-label">Completed</div>
      </div>
      <div class="sprint-stat">
        <div class="sprint-stat-value" style="color:#f59e0b">${summary.remaining}</div>
        <div class="sprint-stat-label">Remaining</div>
      </div>
      <div class="sprint-stat">
        <div class="sprint-stat-value">${summary.total_tasks > 0 ? Math.round((summary.completed / summary.total_tasks) * 100) : 0}%</div>
        <div class="sprint-stat-label">Progress</div>
      </div>
    </div>

    <div class="sprint-tasks-list">
      ${sprintTasks.map(t => `
        <div class="sprint-task-item" onclick="showTaskDetail('${t.id}')" style="cursor:pointer">
          <div class="sprint-task-status status-dot-${t.status.replace('-', '')}"></div>
          <span style="flex:1">${escapeHtml(t.title)}</span>
          <span class="priority-badge priority-${t.priority}">${t.priority}</span>
          <span class="assignee-badge">${t.assignee || ''}</span>
        </div>
      `).join('')}
    </div>

    ${dashboard.burndown ? `
      <div class="burndown-chart">
        <h4>Burndown Chart</h4>
        <canvas id="sprint-burndown" class="chart-canvas"></canvas>
      </div>
    ` : ''}
  `;

  if (dashboard.burndown) {
    drawBurndownChart('sprint-burndown', dashboard.burndown);
  }
}

// === Utilities ===
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
