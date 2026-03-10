# Roadmap: ax-test-projtrack

**Created:** 2026-03-10
**Phases:** 4
**Depth:** Standard

## Overview

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Core API — Projects & Tasks | Working REST API for projects and tasks with CRUD operations | PROJ-01..05, TASK-01..04, TASK-06, TASK-07 | 4 |
| 2 | Comments, Activity & Kanban Logic | Add comments, activity tracking, task ordering and status transitions | TASK-05, TASK-08, CMNT-01..02, ACTV-01..05 | 5 |
| 3 | Sprints, Dashboard & Search | Sprint management, dashboard analytics, and search/filter | SPRT-01..05, DASH-01..04, SRCH-01..05 | 5 |
| 4 | Frontend — Kanban Board & UI | Complete frontend with kanban board, modals, sidebar, sprint view, dashboard, and search | UI-01..08 | 5 |

---

## Phase 1: Core API — Projects & Tasks

**Goal:** Build the Express server foundation with complete CRUD APIs for projects and tasks, including in-memory data store.

**Requirements:** PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05, TASK-01, TASK-02, TASK-03, TASK-04, TASK-06, TASK-07

**Success Criteria:**
1. POST /api/projects creates a project and returns it with an ID
2. GET /api/projects returns all projects; GET /api/projects/:id returns one project with members
3. POST /api/projects/:projectId/tasks creates a task with all fields (title, description, status, priority, assignee, due date, tags) and auto-generated timestamps
4. PUT /api/projects/:projectId/tasks/:id updates any task field and auto-updates updated_at

**Deliverables:**
- Express app with health endpoint
- In-memory data store module
- Project CRUD endpoints
- Task CRUD endpoints
- Input validation and error handling
- Unit and integration tests

---

## Phase 2: Comments, Activity & Kanban Logic

**Goal:** Add task comments, automatic activity logging for all changes, and kanban board logic (status transitions, position ordering).

**Requirements:** TASK-05, TASK-08, CMNT-01, CMNT-02, ACTV-01, ACTV-02, ACTV-03, ACTV-04, ACTV-05

**Success Criteria:**
1. POST /api/projects/:projectId/tasks/:taskId/comments adds a comment with author and timestamp; GET returns all comments chronologically
2. Moving a task to a different status via PUT automatically creates an activity log entry with old and new status
3. Activity log captures task creation, status changes, assignment changes, and new comments with timestamps
4. PUT /api/projects/:projectId/tasks/:taskId with a position field reorders the task within its status column
5. GET /api/projects/:projectId/tasks/:taskId/activity returns the full activity log for that task

**Deliverables:**
- Comment endpoints
- Activity log service with auto-tracking
- Status transition logic
- Position/ordering within columns
- Unit, integration, and scenario tests

---

## Phase 3: Sprints, Dashboard & Search

**Goal:** Add sprint management, dashboard analytics endpoints, and full-text search with filtering.

**Requirements:** SPRT-01, SPRT-02, SPRT-03, SPRT-04, SPRT-05, DASH-01, DASH-02, DASH-03, DASH-04, SRCH-01, SRCH-02, SRCH-03, SRCH-04, SRCH-05

**Success Criteria:**
1. POST /api/projects/:projectId/sprints creates a sprint with name, start/end dates; tasks can be assigned to it
2. GET /api/projects/:projectId/sprints/:id/summary returns task counts by status, completed count, and remaining count
3. GET /api/projects/:projectId/dashboard returns task counts by status, overdue tasks list, tasks-per-assignee breakdown, and burndown data
4. GET /api/projects/:projectId/tasks?q=search&status=todo&priority=high returns filtered, searched results
5. Burndown data endpoint returns daily data points suitable for charting (date, remaining tasks, ideal line)

**Deliverables:**
- Sprint CRUD endpoints
- Sprint task assignment
- Dashboard analytics endpoint
- Search and filter endpoint
- Burndown data calculation
- Unit, integration, and scenario tests

---

## Phase 4: Frontend — Kanban Board & UI

**Goal:** Build a complete static HTML/CSS/JS frontend with kanban board, task modals, project sidebar, sprint view, dashboard, and search — all served by Express.

**Requirements:** UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08

**Success Criteria:**
1. Kanban board renders four columns (todo, in-progress, review, done) with task cards showing title, priority badge, and assignee
2. Drag-and-drop moves task cards between columns and updates the backend via API call
3. Clicking a task card opens a detail modal with editable fields, comments section, and activity log
4. Project sidebar lists all projects and allows creating new ones; selecting a project loads its kanban board
5. Dashboard view shows summary cards (total tasks, overdue count, by priority) and a task distribution chart using canvas/SVG

**Deliverables:**
- Static HTML/CSS/JS served from public/ directory
- Kanban board with drag-and-drop (HTML5 Drag & Drop API)
- Task detail modal
- Project sidebar
- Sprint view with burndown chart
- Dashboard with charts
- Search bar with real-time filtering
- Scenario tests for frontend workflows
