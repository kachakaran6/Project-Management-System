# REST API Reference

All requests must include standard JSON headers. Authenticated endpoints require a valid JWT token passed in the `Authorization: Bearer <token>` header or HttpOnly cookie.

## Authentication
- `POST /api/auth/register` - Create a new user account.
- `POST /api/auth/login` - Authenticate credentials and receive token.
- `POST /api/auth/refresh` - Rotate refresh token.
- `POST /api/auth/logout` - Invalidate session token.

## Projects & Workspaces
- `GET /api/workspaces` - List workspaces accessible to current user.
- `POST /api/workspaces` - Create a workspace.
- `GET /api/projects/:projectId` - Fetch detailed project metadata and board summary.
- `POST /api/projects/:projectId/boards` - Provision a new board with default columns.

## Tasks & Issues
- `GET /api/boards/:boardId/tasks` - Query tasks with pagination and filter criteria.
- `POST /api/tasks` - Create task with assignees, labels, and due dates.
- `PATCH /api/tasks/:taskId` - Partial update (title, priority, custom fields).
- `DELETE /api/tasks/:taskId` - Soft-delete task.
