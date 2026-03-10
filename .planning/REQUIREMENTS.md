# Requirements: ax-test-projtrack

**Defined:** 2026-03-10
**Core Value:** Teams can visually organize and track tasks across a kanban board with drag-and-drop

## v1 Requirements

### Projects

- [ ] **PROJ-01**: User can create a new project with name and description
- [ ] **PROJ-02**: User can view list of all projects
- [ ] **PROJ-03**: User can update project name, description, and settings
- [ ] **PROJ-04**: User can delete a project
- [ ] **PROJ-05**: User can view project members list

### Tasks

- [ ] **TASK-01**: User can create a task with title, description, status, priority, assignee, due date, and tags
- [ ] **TASK-02**: User can view a task with all its details
- [ ] **TASK-03**: User can update any field on a task
- [ ] **TASK-04**: User can delete a task
- [ ] **TASK-05**: User can move a task between status columns (todo, in-progress, review, done)
- [ ] **TASK-06**: User can set task priority (low, medium, high, critical)
- [ ] **TASK-07**: Tasks have created_at and updated_at timestamps that update automatically
- [ ] **TASK-08**: User can reorder tasks within a kanban column via position field

### Comments

- [ ] **CMNT-01**: User can add a comment to a task with author name and text
- [ ] **CMNT-02**: User can view all comments on a task in chronological order

### Activity Log

- [ ] **ACTV-01**: System automatically logs when a task is created
- [ ] **ACTV-02**: System automatically logs when a task status changes
- [ ] **ACTV-03**: System automatically logs when a task is assigned or reassigned
- [ ] **ACTV-04**: System automatically logs when a comment is added to a task
- [ ] **ACTV-05**: User can view activity log for a specific task

### Sprints

- [ ] **SPRT-01**: User can create a sprint with name, start date, and end date
- [ ] **SPRT-02**: User can assign tasks to a sprint
- [ ] **SPRT-03**: User can view all tasks in a sprint
- [ ] **SPRT-04**: User can view sprint summary stats (total tasks, completed, remaining, by status)
- [ ] **SPRT-05**: User can list all sprints for a project

### Dashboard

- [ ] **DASH-01**: User can view task counts grouped by status
- [ ] **DASH-02**: User can view list of overdue tasks
- [ ] **DASH-03**: User can view task counts per assignee
- [ ] **DASH-04**: User can view sprint burndown data for charting

### Search

- [ ] **SRCH-01**: User can search tasks by text across titles and descriptions
- [ ] **SRCH-02**: User can filter tasks by status
- [ ] **SRCH-03**: User can filter tasks by priority
- [ ] **SRCH-04**: User can filter tasks by assignee
- [ ] **SRCH-05**: User can filter tasks by tag

### Frontend

- [ ] **UI-01**: Kanban board displays columns for each status with task cards
- [ ] **UI-02**: User can drag and drop task cards between kanban columns
- [ ] **UI-03**: Task detail modal shows all task fields, comments, and activity log
- [ ] **UI-04**: Project sidebar shows project list and create-project button
- [ ] **UI-05**: Sprint view shows current sprint tasks and burndown chart (canvas/SVG)
- [ ] **UI-06**: Dashboard shows summary cards and task distribution chart
- [ ] **UI-07**: Search bar filters results in real-time
- [ ] **UI-08**: Clean, functional UI with consistent styling

## v2 Requirements

### Notifications

- **NOTF-01**: User receives in-app notification when assigned to a task
- **NOTF-02**: User receives notification when a comment is added to their task

### Advanced Features

- **ADV-01**: User can create subtasks within a task
- **ADV-02**: User can set task dependencies
- **ADV-03**: User can export project data as JSON
- **ADV-04**: User can import tasks from CSV

## Out of Scope

| Feature | Reason |
|---------|--------|
| Database persistence | In-memory storage by design for simplicity |
| User authentication | No login system needed for this version |
| Real-time WebSocket updates | Standard HTTP sufficient for v1 |
| File attachments | Text-only for simplicity |
| Mobile responsive design | Desktop-first functional UI |
| Email notifications | No email infrastructure |
| Role-based permissions | No auth system |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROJ-01 | Phase 1 | Pending |
| PROJ-02 | Phase 1 | Pending |
| PROJ-03 | Phase 1 | Pending |
| PROJ-04 | Phase 1 | Pending |
| PROJ-05 | Phase 1 | Pending |
| TASK-01 | Phase 1 | Pending |
| TASK-02 | Phase 1 | Pending |
| TASK-03 | Phase 1 | Pending |
| TASK-04 | Phase 1 | Pending |
| TASK-05 | Phase 2 | Pending |
| TASK-06 | Phase 1 | Pending |
| TASK-07 | Phase 1 | Pending |
| TASK-08 | Phase 2 | Pending |
| CMNT-01 | Phase 2 | Pending |
| CMNT-02 | Phase 2 | Pending |
| ACTV-01 | Phase 2 | Pending |
| ACTV-02 | Phase 2 | Pending |
| ACTV-03 | Phase 2 | Pending |
| ACTV-04 | Phase 2 | Pending |
| ACTV-05 | Phase 2 | Pending |
| SPRT-01 | Phase 3 | Pending |
| SPRT-02 | Phase 3 | Pending |
| SPRT-03 | Phase 3 | Pending |
| SPRT-04 | Phase 3 | Pending |
| SPRT-05 | Phase 3 | Pending |
| DASH-01 | Phase 3 | Pending |
| DASH-02 | Phase 3 | Pending |
| DASH-03 | Phase 3 | Pending |
| DASH-04 | Phase 3 | Pending |
| SRCH-01 | Phase 3 | Pending |
| SRCH-02 | Phase 3 | Pending |
| SRCH-03 | Phase 3 | Pending |
| SRCH-04 | Phase 3 | Pending |
| SRCH-05 | Phase 3 | Pending |
| UI-01 | Phase 4 | Pending |
| UI-02 | Phase 4 | Pending |
| UI-03 | Phase 4 | Pending |
| UI-04 | Phase 4 | Pending |
| UI-05 | Phase 4 | Pending |
| UI-06 | Phase 4 | Pending |
| UI-07 | Phase 4 | Pending |
| UI-08 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0

---
*Requirements defined: 2026-03-10*
*Last updated: 2026-03-10 after initial definition*
