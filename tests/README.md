# 🧪 SaaS API Testing System

Comprehensive testing suite for the Project Management SaaS Backend.

## 📁 Structure

```text
/tests
  /postman
    collection.json     # Postman API Collection
    environment.json    # Local environment variables
  /integration
    auth.test.js        # Authentication & Registration
    workspace.test.js   # RBAC & Multi-tenancy
    project.test.js     # Project lifecycle
    task.test.js        # Task management
  /helpers
    apiHelper.js       # Reusable test utilities
```

## 🚀 Getting Started

### 1. Automated Tests (Jest + Supertest)

Run all integration tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

### 2. Postman Collection

1. Import `tests/postman/collection.json` into Postman.
2. Import `tests/postman/environment.json`.
3. Select the `SaaS PM - Local` environment.
4. Run the **Auth -> Login** request first to populate `accessToken`.

## 🧠 Key Test Scenarios Covered

### ✅ Security & RBAC
- **Strict Isolation**: Users cannot access data from organizations they don't belong to.
- **Role Permissions**: Validates that `MEMBERS` cannot delete `PROJECTS` or `WORKSPACES`.
- **JWT Integrity**: Checks that expired or invalid tokens are rejected.

### ✅ Functional
- **Chained Identity**: IDs (Workspace ID, Project ID) are automatically passed between requests in Postman.
- **Task Lifecycle**: Creation, assignment, status updates, and deletion.

### ✅ Performance (Basic)
- **Pagination**: Validates `page` and `limit` parameters on list endpoints.
- **Bulk Creation**: Scripted task creation in Postman.

## 🛠️ Environment Variables

- `baseUrl`: API endpoint (defaults to `http://localhost:5001/api/v1`)
- `accessToken`: JWT token (auto-updated by Login request)
- `organizationId`: Current active organization
- `workspaceId`: Target workspace for project/task tests
