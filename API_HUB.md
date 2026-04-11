# 🚀 PROJECT MANAGEMENT SYSTEM — COMPLETE API HUB

> **Version:** 1.0 | **Stack:** Node.js + Express + MongoDB | **Auth:** JWT (Access + Refresh Tokens)
> **Base URL:** `http://localhost:5000/api/v1` (dev) | `https://your-domain.com/api/v1` (prod)

---

## 1. 🔐 AUTHENTICATION OVERVIEW

### Auth Type
- **Access Token:** JWT, signed with `JWT_ACCESS_SECRET`, expires in **15 minutes**
- **Refresh Token:** JWT, signed with `JWT_REFRESH_SECRET`, stored in DB + sent as **httpOnly cookie**, expires in **7 days**

### Token Flow
```
1. POST /auth/register   → Create account
2. POST /auth/login      → Receive { accessToken } in body + refreshToken in httpOnly cookie
3. Use accessToken       → Send as "Authorization: Bearer <token>" on every protected request
4. Token expires (401)   → POST /auth/refresh → new accessToken issued (refresh token rotated)
5. POST /auth/logout     → Refresh token revoked in DB, cookie cleared
```

### Required Headers (All Protected Routes)
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

### Role System
| Role | Scope | Description |
|------|-------|-------------|
| `SUPER_ADMIN` | Platform-wide | Seeded via `seed-admin.js`. Bypasses all permission checks. Access to `/admin/*` routes. |
| `ADMIN` | Organization | Org-level admin. Requires approval from SUPER_ADMIN before login is allowed. |
| `MANAGER` | Organization | Can create/manage workspaces, tasks, invite users. |
| `MEMBER` | Organization | Read-only access to projects. Cannot create tasks by default. |
| `USER` | Solo | Default registered user with no org context. Can manage their own projects/tasks. |

> **Note:** Organization roles are stored in `OrganizationMember` collection and merged into JWT via the refresh flow.

---

## 2. 📁 MODULE-WISE API STRUCTURE

---

### ══════════════════════════════
### 📌 MODULE 1: AUTH (`/api/v1/auth`)
### ══════════════════════════════

**Description:** Handles user registration, login, token management, email verification, and password reset.

---

#### 🔸 Register User
- **Method:** `POST` | **URL:** `/api/v1/auth/register` | **Access:** Public

**Body:**
```json
{
  "firstName": "string (required)",
  "lastName": "string (required)",
  "email": "string (required)",
  "password": "string (required)",
  "role": "string (optional) — 'ADMIN' triggers PENDING_APPROVAL"
}
```

**Success (201):**
```json
{
  "success": true,
  "message": "User registered successfully.",
  "data": {
    "_id": "6632a1f8c2d4a900123abc01",
    "firstName": "Karan",
    "email": "karan@example.com",
    "role": "USER",
    "status": "ACTIVE"
  }
}
```

**Errors:** `400` duplicate email

**Business Logic:** Hashes password (bcrypt). If `role: ADMIN` → `status: PENDING_APPROVAL`, `isApproved: false`.

---

#### 🔸 Login
- **Method:** `POST` | **URL:** `/api/v1/auth/login` | **Access:** Public

**Body:** `{ "email": "string", "password": "string" }`

**Success (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { "id": "...", "firstName": "Karan", "email": "...", "role": "USER" }
  }
}
```

> ⚠️ `refreshToken` is set as httpOnly cookie — NOT in body.

**Errors:** `400` missing fields | `401` invalid credentials | `403` admin pending approval

**Business Logic:** Updates `lastLogin`. Creates `RefreshToken` DB record.

**Frontend Notes:** Store `accessToken` in memory only. Set up Axios interceptor for 401 → auto-refresh.

---

#### 🔸 Refresh Access Token
- **Method:** `POST` | **URL:** `/api/v1/auth/refresh` | **Access:** Public

**Body (fallback):** `{ "refreshToken": "string (optional if cookie present)" }`

**Success (200):** `{ "success": true, "data": { "accessToken": "..." } }`

**Business Logic:** Old token revoked, new token issued (rotation). Updates org membership in new token payload.

---

#### 🔸 Get Current User
- **Method:** `GET` | **URL:** `/api/v1/auth/me` | **Access:** Protected

**Success (200):**
```json
{ "success": true, "data": { "user": { "id": "...", "role": "ADMIN" }, "organizationId": "...", "role": "ADMIN" } }
```

---

#### 🔸 Forgot Password
- **Method:** `POST` | **URL:** `/api/v1/auth/forgot-password` | **Access:** Public

**Body:** `{ "email": "string (required)" }`

**Success (200):** Always returns success for security (no user enumeration). Generates SHA-256 token, expires 1hr.

---

#### 🔸 Reset Password
- **Method:** `POST` | **URL:** `/api/v1/auth/reset-password` | **Access:** Public

**Body:** `{ "token": "string", "password": "string" }`

**Business Logic:** Validates token. Updates password. Revokes all refresh tokens for user.

---

#### 🔸 Verify Email
- **Method:** `GET` | **URL:** `/api/v1/auth/verify-email?token=<token>` | **Access:** Public

---

#### 🔸 Logout
- **Method:** `POST` | **URL:** `/api/v1/auth/logout` | **Access:** Protected

**Business Logic:** Marks `RefreshToken.isRevoked = true`. Clears cookie.

---

### ══════════════════════════════
### 📌 MODULE 2: WORKSPACE (`/api/v1/workspaces`)
### ══════════════════════════════

**Description:** Organizational containers. Projects live inside Workspaces.
**All routes:** `requireAuth`

---

#### 🔸 List Workspaces
- **Method:** `GET` | **URL:** `/api/v1/workspaces` | **Access:** Any org member

**Query Params:** `page (default:1)`, `limit (default:10)`

**Success (200):**
```json
{
  "success": true,
  "data": {
    "workspaces": [{ "_id": "...", "name": "Engineering", "slug": "engineering", "isPrivate": false }],
    "totalCount": 5
  }
}
```

---

#### 🔸 Get Workspace by ID
- **Method:** `GET` | **URL:** `/api/v1/workspaces/:id`
- **Errors:** `404` not found or wrong org

---

#### 🔸 Create Workspace
- **Method:** `POST` | **URL:** `/api/v1/workspaces`
- **Access:** `ADMIN` or `MANAGER` + `MANAGE_WORKSPACE` permission

**Body:**
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "icon": "string (optional)",
  "isPrivate": "boolean (default: false)"
}
```

**Side Effects:** Logs `CREATE` activity.

---

#### 🔸 Update Workspace
- **Method:** `PATCH` | **URL:** `/api/v1/workspaces/:id`
- **Access:** `ADMIN` or `MANAGER` + `MANAGE_WORKSPACE`

**Body:** Any of `{ name, description, icon, isPrivate }`

**Side Effects:** Logs `UPDATE` activity with changed fields list.

---

#### 🔸 Delete Workspace (Soft)
- **Method:** `DELETE` | **URL:** `/api/v1/workspaces/:id`
- **Access:** `ADMIN` or `MANAGER` + `MANAGE_WORKSPACE`

**Business Logic:** Sets `isActive: false`. No hard delete. Sub-resources remain in DB.

**Side Effects:** Logs `DELETE` activity.

---

### ══════════════════════════════
### 📌 MODULE 3: PROJECT (`/api/v1/projects`)
### ══════════════════════════════

**Description:** Projects belong to Workspaces and contain Tasks.
**All routes:** `requireAuth`

---

#### 🔸 List Projects
- **Method:** `GET` | **URL:** `/api/v1/projects`

**Query Params:** `page`, `limit`, `workspaceId`, `status (active|completed|archived|planned|on_hold)`

**Scoping:**
- `SUPER_ADMIN` → all projects
- Org member → scoped by `organizationId`
- Solo user → scoped by `ownerId`

**Success (200):**
```json
{
  "success": true,
  "data": {
    "projects": [{
      "_id": "663400def456",
      "name": "Website Redesign",
      "status": "active",
      "workspaceId": { "_id": "...", "name": "Engineering" }
    }],
    "totalCount": 3
  }
}
```

---

#### 🔸 Get Project by ID
- **Method:** `GET` | **URL:** `/api/v1/projects/:id`

---

#### 🔸 Create Project
- **Method:** `POST` | **URL:** `/api/v1/projects`

**Body:**
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "workspaceId": "ObjectId (optional)",
  "status": "string (default: active)",
  "startDate": "ISO date (optional)",
  "endDate": "ISO date (optional)"
}
```

**Side Effects:** Logs `CREATE_PROJECT` activity.

---

#### 🔸 Update Project
- **Method:** `PATCH` | **URL:** `/api/v1/projects/:id`

**Body:** Any of `{ name, description, status, startDate, endDate }`

**Side Effects:** Logs `UPDATE_PROJECT`.

---

#### 🔸 Archive Project
- **Method:** `POST` | **URL:** `/api/v1/projects/:id/archive`

**Business Logic:** Sets `status: 'archived'`. Project still `isActive: true`.

---

#### 🔸 Delete Project (Soft)
- **Method:** `DELETE` | **URL:** `/api/v1/projects/:id`

**Business Logic:** Sets `isActive: false`. Logs `DELETE_PROJECT`.

---

### ══════════════════════════════
### 📌 MODULE 4: TASK (`/api/v1/tasks`)
### ══════════════════════════════

**Description:** Core entity. Supports assignees, tags, status transitions, and real-time WebSocket events.
**All routes:** `requireAuth`

---

#### 🔸 List Tasks
- **Method:** `GET` | **URL:** `/api/v1/tasks`

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | default: 1 |
| `limit` | number | default: 10 |
| `projectId` | string | Filter by project |
| `workspaceId` | string | Filter by workspace |
| `status` | string | `BACKLOG\|TODO\|IN_PROGRESS\|IN_REVIEW\|DONE\|ARCHIVED` |
| `priority` | string | `LOW\|MEDIUM\|HIGH\|URGENT` |
| `dueDate` | ISO date | Tasks due on or before |
| `assigneeId` | string | Filter by assignee userId |
| `tagId` | string | Filter by tag |

---

#### 🔸 Get Task by ID
- **Method:** `GET` | **URL:** `/api/v1/tasks/:id`

**Success (200):** Full task with `assignees[]` (populated user info) and `tags[]` (populated tag info).

---

#### 🔸 Create Task
- **Method:** `POST` | **URL:** `/api/v1/tasks`

**Body:**
```json
{
  "title": "string (required)",
  "description": "string (optional)",
  "projectId": "ObjectId (required)",
  "workspaceId": "ObjectId (optional)",
  "status": "TODO (default)",
  "priority": "MEDIUM (default)",
  "dueDate": "ISO date (optional)",
  "assignees": ["userId1", "userId2"],
  "tags": ["tagId1"]
}
```

**Business Logic:** MongoDB **transaction** — atomically creates Task + TaskAssignee + TaskTag records.

**Side Effects:**
- Logs `CREATE` activity
- Sends `TASK_ASSIGNED` notification to assignees
- Emits `task:created` to `workspace:{workspaceId}` room

---

#### 🔸 Update Task
- **Method:** `PATCH` | **URL:** `/api/v1/tasks/:id`

**Body:** Any of `{ title, description, priority, dueDate, startDate, position }`

**Side Effects:** Logs `UPDATE` activity.

---

#### 🔸 Change Task Status
- **Method:** `PATCH` | **URL:** `/api/v1/tasks/:id/status`

**Body:** `{ "status": "TODO|IN_PROGRESS|IN_REVIEW|DONE|ARCHIVED" }`

**Side Effects:** Logs `STATUS_CHANGE`. Emits `task:updated` to workspace room.

---

#### 🔸 Assign Users to Task
- **Method:** `POST` | **URL:** `/api/v1/tasks/:id/assign`

**Body:** `{ "userIds": ["userId1", "userId2"] }`

**Business Logic:** Idempotent. Duplicate assignments silently ignored (MongoDB `11000` error caught).

**Side Effects:** Sends `TASK_ASSIGNED` notifications. Emits `task:assigned` to each user's personal room.

---

#### 🔸 Delete Task (Soft)
- **Method:** `DELETE` | **URL:** `/api/v1/tasks/:id`

**Business Logic:** Sets `isActive: false`. Emits `task:deleted` to workspace room.

---

### ══════════════════════════════
### 📌 MODULE 5: COMMENT (`/api/v1/comments`)
### ══════════════════════════════

**Description:** Threaded comments on tasks. Supports `@mentions` and nested replies via `parentId`.

---

#### 🔸 Get Task Comments
- **Method:** `GET` | **URL:** `/api/v1/comments/task/:taskId`
- **Permission:** `VIEW_PROJECT`

**Query Params:** `page (default:1)`, `limit (default:20)`

**Response:** Flat array sorted `createdAt ASC`. Use `parentId` to build tree client-side.

---

#### 🔸 Add Comment
- **Method:** `POST` | **URL:** `/api/v1/comments`
- **Permission:** `CREATE_TASK`

**Body:**
```json
{
  "content": "string (required) — supports @mentions",
  "taskId": "ObjectId (required)",
  "organizationId": "ObjectId (required)",
  "parentId": "ObjectId (optional) — for threaded replies"
}
```

**Business Logic:** Parses `@mentions` from content text → resolves to `userId[]`. Stores in `mentions` array.

**Side Effects:**
- Logs `COMMENT` activity
- Sends `MENTION` notification to mentioned users
- Sends `COMMENT_ADDED` notification to task creator

---

#### 🔸 Update Comment
- **Method:** `PATCH` | **URL:** `/api/v1/comments/:id`
- **Permission:** `CREATE_TASK`

**Business Logic:** Only original author can update. Sets `isEdited: true`.

---

#### 🔸 Delete Comment
- **Method:** `DELETE` | **URL:** `/api/v1/comments/:id`
- **Permission:** `CREATE_TASK`

**Business Logic:** Hard delete. Only original author can delete.

---

### ══════════════════════════════
### 📌 MODULE 6: ATTACHMENT (`/api/v1/attachments`)
### ══════════════════════════════

**Description:** Stores file metadata. Actual file upload handled externally (S3/Cloudinary).

---

#### 🔸 Get Task Attachments
- **Method:** `GET` | **URL:** `/api/v1/attachments/task/:taskId`
- **Permission:** `VIEW_PROJECT`

---

#### 🔸 Store Attachment Metadata
- **Method:** `POST` | **URL:** `/api/v1/attachments`
- **Permission:** `CREATE_TASK`

**Body:**
```json
{
  "fileName": "string (required)",
  "fileType": "string (required) — e.g. image/png",
  "fileSize": "number (required) — bytes",
  "fileUrl": "string (required) — CDN/S3 URL",
  "key": "string (required) — S3 storage key",
  "taskId": "ObjectId (required)",
  "organizationId": "ObjectId (required)"
}
```

**Side Effects:** Logs UPDATE on parent task. Sends `TASK_UPDATED` notification to task creator.

> ⚠️ Upload file to S3 first, then call this API with the resulting `fileUrl` and `key`.

---

#### 🔸 Delete Attachment
- **Method:** `DELETE` | **URL:** `/api/v1/attachments/:id`
- **Permission:** `CREATE_TASK`

**Business Logic:** Only original uploader can delete. Removes DB record only — cloud file deletion is caller's responsibility.

---

### ══════════════════════════════
### 📌 MODULE 7: TAG (`/api/v1/tags`)
### ══════════════════════════════

**Description:** Reusable color-coded labels scoped to Organization (optionally Workspace).

---

#### 🔸 List Tags
- **Method:** `GET` | **URL:** `/api/v1/tags`
- **Permission:** `VIEW_PROJECT`

**Query Params:** `workspaceId (optional)`

---

#### 🔸 Create Tag
- **Method:** `POST` | **URL:** `/api/v1/tags`
- **Permission:** `CREATE_TASK`

**Body:**
```json
{
  "name": "string (required) — unique per org",
  "color": "string (optional) — hex e.g. #3B82F6",
  "organizationId": "ObjectId (required)",
  "workspaceId": "ObjectId (optional)"
}
```

**Errors:** `400` duplicate tag name in org.

---

#### 🔸 Assign Tag to Task
- **Method:** `POST` | **URL:** `/api/v1/tags/task/:taskId`
- **Permission:** `CREATE_TASK`

**Body:** `{ "tagId": "ObjectId (required)" }`

**Business Logic:** Idempotent. Duplicate silently ignored.

---

#### 🔸 Remove Tag from Task
- **Method:** `DELETE` | **URL:** `/api/v1/tags/task/:taskId/:tagId`
- **Permission:** `CREATE_TASK`

---

#### 🔸 Delete Tag Globally
- **Method:** `DELETE` | **URL:** `/api/v1/tags/:id`
- **Permission:** `CREATE_TASK`

**Business Logic:** Hard deletes tag AND all `TaskTag` junction records. **Affects all tasks.**

---

### ══════════════════════════════
### 📌 MODULE 8: SEARCH (`/api/v1/search`)
### ══════════════════════════════

**Description:** Global full-text search across Tasks, Projects, and Workspaces within the current organization.

---

#### 🔸 Global Search
- **Method:** `GET` | **URL:** `/api/v1/search?q=<query>`
- **Access:** Any authenticated user

**Query Params:** `q: string (required)`

**Success (200):**
```json
{
  "success": true,
  "data": {
    "tasks": [{ "_id": "...", "title": "Implement login UI", "status": "IN_PROGRESS", "priority": "HIGH" }],
    "projects": [{ "_id": "...", "name": "Website Redesign", "status": "active" }],
    "workspaces": [{ "_id": "...", "name": "Engineering", "description": "..." }]
  }
}
```

**Business Logic:** Uses MongoDB `$text` index. Max 10 results per entity type. Scoped to `organizationId`.

**Frontend Notes:** Debounce 300ms. Minimum 2 characters recommended.

---

### ══════════════════════════════
### 📌 MODULE 9: INVITE (`/api/v1/invites`)
### ══════════════════════════════

**Description:** Email-based organization invitations using secure tokenized links.

---

#### 🔸 List Pending Invites
- **Method:** `GET` | **URL:** `/api/v1/invites`
- **Permission:** `INVITE_USER`

**Response:** All `PENDING` invites for the current org.

---

#### 🔸 Send Invite
- **Method:** `POST` | **URL:** `/api/v1/invites`
- **Permission:** `INVITE_USER`

**Body:**
```json
{
  "email": "string (required)",
  "organizationId": "ObjectId (required)",
  "role": "ADMIN|MANAGER|MEMBER (default: MEMBER)"
}
```

**Business Logic:**
1. Check if user already a member → `400`
2. Check for existing PENDING invite → `400`
3. Generate 32-byte random token
4. Create `Invite` record (auto-expires in 7 days)
5. Send invite email: `{frontendUrl}/invite/accept?token=<token>`

**Side Effects:** Sends invite email.

---

#### 🔸 Accept Invite
- **Method:** `POST` | **URL:** `/api/v1/invites/accept`
- **Access:** Protected (logged in user)

**Body:** `{ "token": "string (required)" }`

**Business Logic:** Validates token + expiry. Creates `OrganizationMember` record. Sets invite `status: ACCEPTED`.

**Success (200):** `{ "success": true, "data": { "organizationId": "..." } }`

**Frontend Notes:** After accepting, call `POST /auth/refresh` so new org role appears in JWT.

---

### ══════════════════════════════
### 📌 MODULE 10: ADMIN (`/api/v1/admin`)
### ══════════════════════════════

**Description:** Platform-level management. **SUPER_ADMIN only.** All routes require `requireAuth` + `requireSuperAdmin`.

---

#### 🔸 Dashboard Stats
- **Method:** `GET` | **URL:** `/api/v1/admin/dashboard`

**Success (200):**
```json
{
  "success": true,
  "data": { "totalUsers": 148, "totalProjects": 32, "totalTasks": 517, "pendingAdminRequests": 3 }
}
```

---

#### 🔸 List All Users
- **Method:** `GET` | **URL:** `/api/v1/admin/users`

**Query Params:** `role (optional)`, `status (optional)`

---

#### 🔸 Update User
- **Method:** `PATCH` | **URL:** `/api/v1/admin/users/:userId`

**Body:** Any of `{ role, status, isApproved, avatarUrl, settings }`

---

#### 🔸 Delete User (Hard)
- **Method:** `DELETE` | **URL:** `/api/v1/admin/users/:userId`

---

#### 🔸 Get Pending Admin Approvals
- **Method:** `GET` | **URL:** `/api/v1/admin/pending-users`

**Response:** Users where `role: ADMIN, isApproved: false`.

---

#### 🔸 Approve Admin Account
- **Method:** `PATCH` | **URL:** `/api/v1/admin/approve/:userId`

**Business Logic:** Sets `isApproved: true`, `status: ACTIVE`.

---

#### 🔸 List All Projects (Global)
- **Method:** `GET` | **URL:** `/api/v1/admin/projects`

**Response:** All projects with owner info populated.

---

#### 🔸 List All Tasks (Global)
- **Method:** `GET` | **URL:** `/api/v1/admin/tasks`

---

#### 🔸 System Activity Logs
- **Method:** `GET` | **URL:** `/api/v1/admin/logs`

**Query Params:** `actorId (optional)`, `action (optional)`

**Response:** Last 100 logs sorted by `createdAt DESC` with actor info.

---

### ══════════════════════════════
### 📌 MODULE 11: BILLING (`/api/v1/billing`)
### ══════════════════════════════

**Description:** Stripe-powered subscription management.

> ⚠️ Billing routes are registered **before** `express.json()` in `app.js` to allow Stripe webhook raw body verification.

---

#### 🔸 Stripe Webhook (Internal/Stripe Only)
- **Method:** `POST` | **URL:** `/api/v1/billing/webhook`
- **Access:** Public (Stripe calls this — validated via Stripe-Signature header)

**Handled Events:**
- `checkout.session.completed` → Upserts Subscription
- `customer.subscription.created|updated` → Upserts Subscription
- `customer.subscription.deleted` → Status → `CANCELED`

---

#### 🔸 Get Subscription
- **Method:** `GET` | **URL:** `/api/v1/billing`
- **Access:** Protected

**Success (200):**
```json
{
  "success": true,
  "data": {
    "tier": "PRO",
    "status": "ACTIVE",
    "currentPeriodEnd": "2026-05-10T00:00:00.000Z",
    "cancelAtPeriodEnd": false
  }
}
```

---

#### 🔸 Create Checkout Session
- **Method:** `POST` | **URL:** `/api/v1/billing/checkout`
- **Permission:** `MANAGE_WORKSPACE`

**Body:**
```json
{
  "priceId": "string (required) — Stripe Price ID",
  "organizationId": "ObjectId (required)"
}
```

**Success (200):** `{ "success": true, "data": { "url": "https://checkout.stripe.com/pay/..." } }`

**Frontend Notes:** Redirect immediately to `data.url`. Stripe handles payment. After success, webhook updates subscription.

---

### ══════════════════════════════
### 📌 MODULE 12: REALTIME (WebSocket / Socket.IO)
### ══════════════════════════════

**Connection:** `ws://localhost:5000`

**Auth on connect:**
```js
const socket = io('http://localhost:5000', { auth: { token: accessToken } });
```

### Socket Rooms
| Room Pattern | Join Method | Purpose |
|-------------|-------------|---------|
| `organization:{orgId}` | Auto on connect | Org-level events |
| `user:{userId}` | Auto on connect | Personal notifications |
| `workspace:{workspaceId}` | `presence:join` | Task/presence events |
| `project:{projectId}` | `room:join:project` | Project events |
| `task:{taskId}` | `room:join:task` | Typing indicators |

### Events: Client → Server
| Event | Payload | Purpose |
|-------|---------|---------|
| `presence:join` | `{ workspaceId }` | Join workspace |
| `presence:leave` | `{ workspaceId }` | Leave workspace |
| `typing:start` | `{ taskId }` | Signal typing |
| `typing:stop` | `{ taskId }` | Stop typing |
| `room:join:project` | `{ projectId }` | Subscribe to project |
| `room:join:task` | `{ taskId }` | Subscribe to task |

### Events: Server → Client
| Event | Payload | Trigger |
|-------|---------|---------|
| `presence:update` | `{ workspaceId, activeUsers[] }` | Join/leave |
| `task:created` | `{ taskId, title, projectId }` | `POST /tasks` |
| `task:updated` | `{ taskId, newStatus, projectId }` | Status change |
| `task:deleted` | `{ taskId, projectId }` | `DELETE /tasks/:id` |
| `task:assigned` | `{ taskId, title, actorId }` | Assign endpoint |
| `notification:new` | `{ type, message, resourceId }` | Any notification |
| `typing:start` | `{ userId, taskId }` | Another user typing |
| `typing:stop` | `{ userId, taskId }` | Stopped typing |

---

## 3. 🔄 GLOBAL FEATURES

### Pagination Structure
All list endpoints return:
```json
{ "data": { "items": [...], "totalCount": 50, "page": 1, "limit": 10 } }
```
*(Exact key may be `workspaces`, `projects`, `tasks` etc.)*

### Filtering & Sorting
- Default sort: `createdAt: -1` (newest first) across all list endpoints
- Filtering via query params (see each endpoint)

### Search
Uses MongoDB `$text` index. Always org-scoped. Max 10 per entity type.

### File Upload Flow
1. Upload directly to S3/Cloudinary from frontend
2. Call `POST /attachments` with metadata + `fileUrl` + `key`
3. On delete: `DELETE /attachments/:id` (DB only). Delete from S3 using `key`.

### Rate Limiting
- **Default:** 100 req / 15 min per IP on `/api/*`
- Controlled by `RATE_LIMIT_ENABLED` env var
- Response: `{ "success": false, "message": "Too many requests. Please try again later." }`

### Body Size Limit
- JSON + URL-encoded: **10kb maximum**

---

## 4. 🧠 RBAC (ROLE-BASED ACCESS CONTROL)

### Permission Matrix (Defaults)
| Permission | SUPER_ADMIN | ADMIN | MANAGER | MEMBER |
|-----------|:-----------:|:-----:|:-------:|:------:|
| `VIEW_PROJECT` | ✅ | ✅ | ✅ | ✅ |
| `CREATE_TASK` | ✅ | ✅ | ✅ | ❌ |
| `DELETE_TASK` | ✅ | ✅ | ❌ | ❌ |
| `INVITE_USER` | ✅ | ✅ | ❌ | ❌ |
| `MANAGE_WORKSPACE` | ✅ | ✅ | ✅ | ❌ |

### API Role Access Summary
| API | SUPER_ADMIN | ADMIN | MANAGER | MEMBER | USER(solo) |
|-----|:-----------:|:-----:|:-------:|:------:|:----------:|
| `POST /auth/register` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /workspaces` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /workspaces` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `DELETE /workspaces/:id` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `GET /projects` | ✅ | ✅ | ✅ | ✅ | ✅(own) |
| `POST /projects` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /tasks` | ✅ | ✅ | ✅ | ❌ | ✅(own) |
| `DELETE /tasks/:id` | ✅ | ✅ | ❌ | ❌ | ✅(own) |
| `POST /tasks/:id/assign` | ✅ | ✅ | ✅ | ❌ | ✅ |
| `POST /invites` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `GET /admin/*` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `POST /billing/checkout` | ✅ | ✅ | ✅ | ❌ | ❌ |

> **Dynamic RBAC:** Middleware checks `RolePermission` collection first. Falls back to static defaults if no DB row found. Allows per-org permission customization at runtime.

---

## 5. 🔗 API FLOW MAPPING

### Flow 1: Admin Onboarding
```
POST /auth/register { role: "ADMIN" }          → status: PENDING_APPROVAL
SUPER_ADMIN: GET /admin/pending-users          → See request
SUPER_ADMIN: PATCH /admin/approve/:userId      → isApproved: true
POST /auth/login                               → Get tokens
GET /auth/me                                   → Confirm role
```

### Flow 2: Full Team Project Setup
```
POST /auth/login                               → Get accessToken
POST /invites { email, role: "MANAGER" }       → Email sent
Member: POST /invites/accept { token }         → OrganizationMember created
POST /workspaces { name: "Q2 Sprint" }         → Workspace created
POST /projects { name: "Mobile App", workspaceId }
POST /tags { name: "Frontend", color: "#3B82F6" }
POST /tasks { title, projectId, assignees[], tags[] }
  → Task + assignees + tags created atomically
  → TASK_ASSIGNED notification sent
  → task:created WebSocket emitted
POST /comments { content: "Looks good! @member", taskId }
  → Mention parsed → MENTION notification sent
POST /attachments { fileUrl, key, taskId }
PATCH /tasks/:id/status { status: "DONE" }
  → task:updated WebSocket emitted
```

### Flow 3: Search & Filter
```
GET /search?q=login                            → Cross-entity results
GET /tasks?projectId=X&status=IN_PROGRESS&priority=HIGH
GET /tasks?assigneeId=Y&dueDate=2026-04-20
```

### Flow 4: Billing Upgrade
```
GET /billing                                   → Check current tier
POST /billing/checkout { priceId, organizationId }
  → Redirect to Stripe URL
(Stripe webhook) POST /billing/webhook         → Subscription updated
GET /billing                                   → Confirm new tier
```

---

## 6. ⚠️ EDGE CASES & VALIDATIONS

### Duplicate Handling
| Scenario | Behavior |
|----------|----------|
| Register with existing email | `400 "User with this email already exists."` |
| Send duplicate pending invite | `400 "Invitation already sent and is still pending."` |
| Assign same user to task twice | Silently ignored (unique index + `ordered: false`) |
| Tag same tag to task twice | `{ success: true, message: 'Already tagged' }` |
| Duplicate tag name in org | `400 "Tag with this name already exists in organization."` |

### Race Conditions
| Scenario | Mitigation |
|----------|-----------|
| Concurrent task creation | MongoDB transaction (all-or-nothing) |
| Concurrent invite acceptance | Status check + unique org membership index |
| Concurrent refresh token use | Token rotation with `replacedByToken` tracking |
| Concurrent task status update | `findOneAndUpdate` is atomic |

### Token Expiry Reference
| Token | Expiry | On Expiry |
|-------|--------|-----------|
| Access Token | 15 min | `401 { code: "TOKEN_EXPIRED" }` |
| Refresh Token | 7 days | `401 "Refresh token invalid or expired."` |
| Password Reset | 1 hour | `400 "Invalid or expired password reset token."` |
| Invite Token | 7 days | Invite status → `EXPIRED`, `400` |

### Important Caveats
- Soft-deleted resources (`isActive: false`) are filtered from all queries but remain in DB for auditing.
- JWT role does **not** update in real-time on org membership change — user must call `/auth/refresh`.
- Deleting a Tag globally cascades to all `TaskTag` records (hard delete).
- Comment delete is a **hard delete** — no recovery.

---

## 7. 🧪 TESTING READY DATA

### Dummy IDs
```
Super Admin User ID:    000000000000000000000001
Test Org ID:            663200000000000000000001
Test Workspace ID:      663300000000000000000001
Test Project ID:        663400000000000000000001
Test Task ID:           663500000000000000000001
Test Tag ID:            663600000000000000000001
```

### Seed SUPER_ADMIN
```bash
node seed-admin.js
```

### Example Payloads

**Register:**
```json
{ "firstName": "Test", "lastName": "User", "email": "test@example.com", "password": "Test@1234" }
```

**Login:**
```json
{ "email": "test@example.com", "password": "Test@1234" }
```

**Create Task (full):**
```json
{
  "title": "Build Login Page",
  "description": "Implement login form with JWT auth",
  "projectId": "663400000000000000000001",
  "workspaceId": "663300000000000000000001",
  "status": "TODO",
  "priority": "HIGH",
  "dueDate": "2026-04-20T00:00:00.000Z",
  "assignees": ["6632a1f8c2d4a900123abc01"],
  "tags": ["663600000000000000000001"]
}
```

**Change Status:**
```json
{ "status": "IN_PROGRESS" }
```

**Assign Users:**
```json
{ "userIds": ["6632a1f8c2d4a900123abc01"] }
```

**Send Invite:**
```json
{ "email": "newmember@example.com", "organizationId": "663200000000000000000001", "role": "MEMBER" }
```

**Checkout:**
```json
{ "priceId": "price_1OzXXXXXXX", "organizationId": "663200000000000000000001" }
```

---

## 8. 📊 API NAMING CONSISTENCY CHECK

### Current Standards ✅
- Base path: `/api/v1/<resource>` (plural nouns)
- CRUD: `GET /`, `POST /`, `PATCH /:id`, `DELETE /:id`
- Action endpoints: `POST /:id/assign`, `POST /:id/archive`

### Suggested Improvements
| Current | Suggested | Reason |
|---------|-----------|--------|
| `POST /tasks/:id/assign` | `POST /tasks/:id/assignees` | REST noun convention |
| `POST /projects/:id/archive` | `PATCH /projects/:id { status: "archived" }` | Merge into update |
| `GET /admin/pending-users` | `GET /admin/users?status=PENDING_APPROVAL` | Use existing filter |
| `PATCH /admin/approve/:userId` | `PATCH /admin/users/:userId/approve` | Cleaner hierarchy |
| `GET /comments/task/:taskId` | `GET /tasks/:taskId/comments` | Standard nested resource |
| `GET /attachments/task/:taskId` | `GET /tasks/:taskId/attachments` | Standard nested resource |

---

## 9. 🚀 PERFORMANCE & OPTIMIZATION NOTES

### Heavy APIs (Needs Attention)
| Endpoint | Risk | Fix |
|----------|------|-----|
| `GET /admin/users` | Full scan, no pagination | Add `page`/`limit` |
| `GET /admin/projects` | Full scan, populates owner | Add pagination |
| `GET /admin/tasks` | Full scan, populates creator | Add pagination |
| `GET /admin/logs` | Hardcoded `.limit(100)` | Make it a query param |
| Task filter by `assigneeId` | Sub-query on TaskAssignee | Add index on `userId` |

### Caching Suggestions (Redis)
| Data | TTL | Invalidate On |
|------|-----|---------------|
| Tag list per org | 10 min | Tag create/delete |
| Admin dashboard stats | 1 min | Any write |
| Search results | 30 sec | Any content write |
| User org membership | 5 min | Membership change |

### DB Indexes in Place
- `User.email` — unique
- `Task.(projectId, status)` — compound for board queries
- `Task.(workspaceId, dueDate)` — deadline views
- `Comment.(taskId, createdAt)` — thread loading
- `Notification.(recipientId, isRead, createdAt)` — unread badge
- `Workspace.(organizationId, slug)` — unique compound
- Text indexes on Task, Project, Workspace for search

### Lazy Loading Recommendations
- Comments: Load top-level only; fetch replies on expand
- Attachments: Load on task drawer open, not on list view
- Notifications: Poll every 30s OR use `notification:new` WebSocket
- Admin logs: Implement cursor-based pagination for scale

---

## 10. 🔌 WEBSOCKET FRONTEND INTEGRATION

```javascript
import { io } from 'socket.io-client';

// 1. Connect with auth
const socket = io('http://localhost:5000', {
  auth: { token: accessToken },
  reconnection: true,
  reconnectionAttempts: 5,
});

// 2. Join workspace on navigation
socket.emit('presence:join', { workspaceId });

// 3. Task events
socket.on('task:created', ({ taskId, title, projectId }) => { /* refetch task list */ });
socket.on('task:updated', ({ taskId, newStatus }) => { /* update board card */ });
socket.on('task:deleted', ({ taskId }) => { /* remove from board */ });

// 4. Typing indicators
socket.emit('typing:start', { taskId });
socket.on('typing:start', ({ userId, taskId }) => { /* show indicator */ });
socket.emit('typing:stop', { taskId });

// 5. Personal notifications
socket.on('notification:new', (n) => { /* show toast / update badge */ });

// 6. Cleanup on unmount
socket.emit('presence:leave', { workspaceId });
socket.off('task:created');
```

---

*Generated from full source code analysis of `k:\Project Management System`*
*Last Updated: 2026-04-10 | Covers: Auth, Workspace, Project, Task, Comment, Attachment, Tag, Search, Invite, Admin, Billing, WebSocket (12 Modules)*
