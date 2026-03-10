# ax-test-projtrack

## What This Is

A full-stack project tracking application built with Node.js and Express, featuring a kanban board with drag-and-drop task management, sprint planning, activity logging, and a dashboard with analytics. It serves as a comprehensive project management tool for teams to organize, track, and visualize their work across multiple projects.

## Core Value

Teams can visually organize and track tasks across a kanban board with real-time drag-and-drop, seeing exactly where every piece of work stands at a glance.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] CRUD operations for projects with members and settings
- [ ] CRUD operations for tasks with title, description, status, priority, assignee, due date, tags, timestamps
- [ ] Kanban board with drag-and-drop between status columns (todo/in-progress/review/done)
- [ ] Task comments with author and timestamp
- [ ] Activity log auto-tracking all changes (task created, status changed, assigned, commented)
- [ ] Sprint management with start/end dates, task assignment, and summary stats
- [ ] Dashboard with task counts by status, overdue tasks, tasks per assignee, sprint burndown
- [ ] Full-text search across task titles and descriptions with filters
- [ ] Task position/ordering within kanban columns
- [ ] Static HTML/CSS/JS frontend served by Express
- [ ] Task detail modal with edit, comments, and activity log
- [ ] Project sidebar with project list and creation
- [ ] Sprint view with current sprint tasks and burndown chart
- [ ] Search bar with real-time filtering

### Out of Scope

- Database persistence — using in-memory storage for simplicity
- User authentication — no login system
- Real-time WebSocket updates — standard HTTP request/response
- Mobile-specific responsive design — desktop-first functional UI
- File attachments on tasks — text-only comments and descriptions

## Context

This is a dogfooding test project for the AX project lifecycle tool. The app uses in-memory storage (no database), making it self-contained and easy to deploy. The frontend is vanilla HTML/CSS/JS with no framework dependencies. Deployment target is Vercel.

## Constraints

- **Stack**: Node.js with Express — no other backend frameworks
- **Frontend**: Static HTML/CSS/JS only — no React, Vue, or other frameworks
- **Storage**: In-memory only — no database, no file persistence
- **Deployment**: Vercel serverless — must work with Vercel's routing model
- **Dependencies**: Minimal — Express and essential utilities only

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| In-memory storage over database | Simplicity, no infrastructure dependencies, fast deployment | — Pending |
| Vanilla JS over framework | Lighter deployment, simpler build, demonstrates capability without tooling | — Pending |
| Express over other frameworks | Most common Node.js web framework, excellent Vercel support | — Pending |
| Vercel deployment | Free tier, simple deployment, good for web apps | — Pending |

---
*Last updated: 2026-03-10 after initialization*
