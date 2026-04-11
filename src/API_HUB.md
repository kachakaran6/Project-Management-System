# API Hub

Generated from code inspection on 2026-04-10.

Base URL used in examples: `<INSERT_BASE_URL>`

Tech stack observed in code:
- Node.js
- Express
- MongoDB with Mongoose
- JWT access + refresh token auth
- Socket.IO for realtime events
- Stripe for billing
- Nodemailer for invitation email delivery

Important implementation note:
- This document is code-derived from mounted routes, controllers, services, schemas, and middleware.
- Several organization-scoped modules rely on `req.organizationId`, but the current REST auth middleware does not populate it.
- The codebase currently exposes REST modules for `auth`, `workspace`, `project`, `task`, `comment`, `attachment`, `tag`, `search`, `invite`, `billing`, `admin`, and `system`.
- There are models for `organization`, `organization members`, `workspace members`, `notifications`, and `subscriptions`, but there are no mounted REST routes for organization CRUD, notification inbox management, message/chat, or user self-service profile management beyond `GET /auth/me`.

--------------------------------------------

## 1. 🔐 AUTHENTICATION OVERVIEW

- Auth Type:
  JWT access token + refresh token rotation persisted in MongoDB.

- Token Flow:
  1. `POST /api/v1/auth/login`
  2. API returns `accessToken` in JSON and sets `refreshToken` in an `HttpOnly` cookie.
  3. Frontend sends `Authorization: Bearer <accessToken>` to protected APIs.
  4. When access token expires, frontend calls `POST /api/v1/auth/refresh` using cookie or request-body refresh token.
  5. Backend revokes the old refresh token and issues a new access token and new refresh token.
  6. `POST /api/v1/auth/logout` revokes refresh token and clears the cookie.

- Token TTL:
  - Access token: `15m` by default
  - Refresh token: `7d` by default

- Required Headers:
  - `Authorization: Bearer <access_token>` for protected routes
  - `Content-Type: application/json` for JSON routes
  - `stripe-signature: <signature>` for Stripe webhook only

- Cookie Behavior:
  - `refreshToken` is set with `httpOnly: true`
  - `secure: true` only in production
  - `sameSite: strict`

- Role-based access explanation:
  - Platform roles implemented in user auth token: `SUPER_ADMIN`, `ADMIN`, `USER`
  - Organization-level routes and invite flow also reference `ADMIN`, `MANAGER`, `MEMBER`
  - Current role model is inconsistent:
    - `MANAGER` and `MEMBER` are referenced by routes and invite flow
    - `constants/index.js` only defines `SUPER_ADMIN`, `ADMIN`, `USER`
    - Manager/member behavior is partially designed but not fully implemented

- Current auth caveats:
  - `POST /auth/login` accepts `organizationId` in controller input, but the service ignores it.
  - Access tokens issued at login do not include organization context.
  - Refresh flow does infer one organization membership, but `requireAuth` still does not attach `req.organizationId`.
  - Most org-scoped APIs therefore depend on backend fixes before frontend integration is fully reliable.

--------------------------------------------

## 2. 📁 MODULE-WISE API STRUCTURE

==============================
📌 MODULE: SYSTEM
==============================

🔹 Description:
System-level operational endpoint exposed outside business modules.

--------------------------------------------

🔹 Endpoints:

--------------------------------------------
🔸 Endpoint Name: Health Check
🔸 Method: `GET`
🔸 URL: `<INSERT_BASE_URL>/health`

🔸 Description:
Returns server liveness plus runtime environment metadata.

🔸 Access Level:
- Public
- Roles Allowed: Super Admin, Admin, Manager, Member, anonymous

🔸 Headers:
- `Content-Type: application/json`

🔸 Request Parameters:

📍 Path Params:
- None

📍 Query Params:
- None

📍 Body:
```json
{}
```

🔸 Sample Request:
```json
{}
```

🔸 Success Response:
```json
{
  "success": true,
  "status": "ok",
  "environment": "development",
  "timestamp": "2026-04-10T12:00:00.000Z"
}
```

🔸 Error Responses:
- `500` → runtime failure

🔸 Business Logic:
Static heartbeat JSON with environment and current timestamp.

🔸 Side Effects:
- None

🔸 Frontend Usage Notes:
Use for uptime checks or deployment smoke tests. Do not poll aggressively from the main app shell.

--------------------------------------------

==============================
📌 MODULE: AUTH
==============================

🔹 Description:
User registration, login, token rotation, password recovery, email verification, and logout.

--------------------------------------------

🔹 Endpoints:

--------------------------------------------
🔸 Endpoint Name: Register User
🔸 Method: `POST`
🔸 URL: `<INSERT_BASE_URL>/api/v1/auth/register`

🔸 Description:
Creates a platform user account. Admin registrations are stored as pending approval.

🔸 Access Level:
- Public
- Roles Allowed: anonymous

🔸 Headers:
- `Content-Type: application/json`

🔸 Request Parameters:

📍 Path Params:
- None

📍 Query Params:
- None

📍 Body:
```json
{
  "firstName": "string (required) -> given name",
  "lastName": "string (required) -> family name",
  "email": "string (required) -> unique email",
  "password": "string (required) -> raw password",
  "role": "string (optional) -> ADMIN or USER"
}
```

🔸 Sample Request:
```json
{
  "firstName": "Ava",
  "lastName": "Sharma",
  "email": "ava.sharma@example.com",
  "password": "StrongPass123!",
  "role": "ADMIN"
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "User registered successfully.",
  "data": {
    "_id": "680000000000000000000001",
    "firstName": "Ava",
    "lastName": "Sharma",
    "email": "ava.sharma@example.com",
    "role": "ADMIN",
    "status": "PENDING_APPROVAL",
    "isApproved": false
  }
}
```

🔸 Error Responses:
- `400` → duplicate email or malformed input
- `409` → duplicate key at DB level
- `422` → schema validation failure
- `500` → server error

🔸 Business Logic:
Checks uniqueness, hashes password with bcrypt, maps requested role to `ADMIN` or `USER`, and sets admin accounts to `PENDING_APPROVAL`.

🔸 Side Effects:
- Creates `User`

🔸 Frontend Usage Notes:
Surface a dedicated “pending approval” state for admin signups.

--------------------------------------------
🔸 Endpoint Name: Login
🔸 Method: `POST`
🔸 URL: `<INSERT_BASE_URL>/api/v1/auth/login`

🔸 Description:
Authenticates user and returns access token plus refresh-token cookie.

🔸 Access Level:
- Public
- Roles Allowed: anonymous

🔸 Headers:
- `Content-Type: application/json`

🔸 Request Parameters:

📍 Path Params:
- None

📍 Query Params:
- None

📍 Body:
```json
{
  "email": "string (required) -> login email",
  "password": "string (required) -> login password",
  "organizationId": "string (optional) -> accepted by controller but ignored in service"
}
```

🔸 Sample Request:
```json
{
  "email": "ava.sharma@example.com",
  "password": "StrongPass123!",
  "organizationId": "680000000000000000000101"
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "accessToken": "<JWT_ACCESS_TOKEN>",
    "user": {
      "id": "680000000000000000000001",
      "firstName": "Ava",
      "lastName": "Sharma",
      "email": "ava.sharma@example.com",
      "role": "ADMIN",
      "status": "ACTIVE"
    }
  }
}
```

🔸 Error Responses:
- `400` → email/password missing
- `401` → invalid credentials
- `403` → admin pending approval
- `500` → server error

🔸 Business Logic:
Validates email/password, blocks unapproved admins, updates `lastLogin`, creates access token, creates refresh-token record, and sets refresh cookie.

🔸 Side Effects:
- Updates `User.lastLogin`
- Creates `RefreshToken`
- Sets `refreshToken` cookie

🔸 Frontend Usage Notes:
Persist the access token client-side and allow cookie storage for refresh flow. The login token does not currently carry organization context.

--------------------------------------------
🔸 Endpoint Name: Refresh Access Token
🔸 Method: `POST`
🔸 URL: `<INSERT_BASE_URL>/api/v1/auth/refresh`

🔸 Description:
Rotates refresh token and returns a new access token.

🔸 Access Level:
- Public
- Roles Allowed: anonymous or authenticated client with refresh token

🔸 Headers:
- `Content-Type: application/json`

🔸 Request Parameters:

📍 Path Params:
- None

📍 Query Params:
- None

📍 Body:
```json
{
  "refreshToken": "string (optional) -> used if cookie is unavailable"
}
```

🔸 Sample Request:
```json
{
  "refreshToken": "<JWT_REFRESH_TOKEN>"
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Token refreshed successfully.",
  "data": {
    "accessToken": "<NEW_JWT_ACCESS_TOKEN>"
  }
}
```

🔸 Error Responses:
- `401` → refresh token missing, revoked, or expired
- `500` → server error

🔸 Business Logic:
Validates stored refresh token, revokes it, creates a new refresh token, and attempts to infer one active organization membership for the new access token.

🔸 Side Effects:
- Revokes old `RefreshToken`
- Creates replacement `RefreshToken`
- Updates cookie

🔸 Frontend Usage Notes:
Serialize refresh attempts in one client-side queue to avoid token-rotation races.

--------------------------------------------
🔸 Endpoint Name: Forgot Password
🔸 Method: `POST`
🔸 URL: `<INSERT_BASE_URL>/api/v1/auth/forgot-password`

🔸 Description:
Starts password reset flow for a given email.

🔸 Access Level:
- Public
- Roles Allowed: anonymous

🔸 Headers:
- `Content-Type: application/json`

🔸 Request Parameters:

📍 Path Params:
- None

📍 Query Params:
- None

📍 Body:
```json
{
  "email": "string (required) -> account email"
}
```

🔸 Sample Request:
```json
{
  "email": "ava.sharma@example.com"
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "If an account exists with that email, a reset link has been sent."
}
```

🔸 Error Responses:
- `400` → email missing
- `500` → server error

🔸 Business Logic:
Silently succeeds for unknown emails. For existing users it stores a hashed reset token and 1-hour expiry.

🔸 Side Effects:
- Updates password-reset fields on `User`
- Reset email is marked TODO and is not currently sent

🔸 Frontend Usage Notes:
Always show the same generic success message.

--------------------------------------------
🔸 Endpoint Name: Reset Password
🔸 Method: `POST`
🔸 URL: `<INSERT_BASE_URL>/api/v1/auth/reset-password`

🔸 Description:
Completes password reset using token and new password.

🔸 Access Level:
- Public
- Roles Allowed: anonymous

🔸 Headers:
- `Content-Type: application/json`

🔸 Request Parameters:

📍 Path Params:
- None

📍 Query Params:
- None

📍 Body:
```json
{
  "token": "string (required) -> raw reset token",
  "password": "string (required) -> new password"
}
```

🔸 Sample Request:
```json
{
  "token": "9ecf4a2b19c5ef41e9bb2f8cdbb2f65511c9ff8e8dc49e5d4f1a93d1d66a5a6b",
  "password": "NewStrongPass123!"
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Password reset successful. Please login with your new password."
}
```

🔸 Error Responses:
- `400` → invalid or expired token
- `500` → server error

🔸 Business Logic:
Hashes incoming token, finds matching user, updates password, clears reset fields, and revokes all refresh tokens for that user.

🔸 Side Effects:
- Updates password hash
- Clears reset fields
- Revokes all refresh tokens

🔸 Frontend Usage Notes:
Force the user back to login after success.

--------------------------------------------
🔸 Endpoint Name: Verify Email
🔸 Method: `GET`
🔸 URL: `<INSERT_BASE_URL>/api/v1/auth/verify-email?token=<token>`

🔸 Description:
Marks email as verified using a token.

🔸 Access Level:
- Public
- Roles Allowed: anonymous

🔸 Headers:
- `Content-Type: application/json`

🔸 Request Parameters:

📍 Path Params:
- None

📍 Query Params:
- `token: string (required) -> verification token`

📍 Body:
```json
{}
```

🔸 Sample Request:
```json
{
  "query": {
    "token": "verify-token-123"
  }
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Email verified successfully."
}
```

🔸 Error Responses:
- `400` → token missing, invalid, or expired
- `500` → server error

🔸 Business Logic:
Looks up token and expiry on the user document and flips verification state.

🔸 Side Effects:
- Updates `User.isEmailVerified`

🔸 Frontend Usage Notes:
Treat as a one-time deep-link endpoint.

--------------------------------------------
🔸 Endpoint Name: Logout
🔸 Method: `POST`
🔸 URL: `<INSERT_BASE_URL>/api/v1/auth/logout`

🔸 Description:
Revokes refresh token session and clears refresh cookie.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User

🔸 Headers:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

🔸 Request Parameters:

📍 Path Params:
- None

📍 Query Params:
- None

📍 Body:
```json
{
  "refreshToken": "string (optional) -> fallback if cookie is unavailable"
}
```

🔸 Sample Request:
```json
{
  "refreshToken": "<JWT_REFRESH_TOKEN>"
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

🔸 Error Responses:
- `401` → invalid or missing access token
- `500` → server error

🔸 Business Logic:
If refresh token is available in cookie or body it is marked revoked, then the cookie is cleared.

🔸 Side Effects:
- Revokes `RefreshToken`
- Clears cookie

🔸 Frontend Usage Notes:
Clear client-side auth state even if the network response is lost after the request is sent.

--------------------------------------------
🔸 Endpoint Name: Get Current Session User
🔸 Method: `GET`
🔸 URL: `<INSERT_BASE_URL>/api/v1/auth/me`

🔸 Description:
Returns the request context attached by auth middleware.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User

🔸 Headers:
- `Authorization: Bearer <token>`

🔸 Request Parameters:

📍 Path Params:
- None

📍 Query Params:
- None

📍 Body:
```json
{}
```

🔸 Sample Request:
```json
{}
```

🔸 Success Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "680000000000000000000001",
      "role": "ADMIN"
    },
    "organizationId": null,
    "role": "ADMIN"
  }
}
```

🔸 Error Responses:
- `401` → unauthorized
- `500` → server error

🔸 Business Logic:
Returns middleware context only, not a fresh DB profile read.

🔸 Side Effects:
- None

🔸 Frontend Usage Notes:
Use for session bootstrap only. It is not a full profile endpoint.

--------------------------------------------

==============================
📌 MODULE: WORKSPACE
==============================

🔹 Description:
Organization-scoped workspace CRUD intended to group projects and realtime collaboration.

--------------------------------------------

🔹 Endpoints:

--------------------------------------------
🔸 Endpoint Name: List Workspaces
🔸 Method: `GET`
🔸 URL: `<INSERT_BASE_URL>/api/v1/workspaces`

🔸 Description:
Returns paginated active workspaces for the current organization.

🔸 Access Level:
- Protected
- Roles Allowed: Admin, Manager, Member

🔸 Headers:
- `Authorization: Bearer <token>`

🔸 Request Parameters:

📍 Path Params:
- None

📍 Query Params:
- `page: number (optional) -> default 1`
- `limit: number (optional) -> default 10`

📍 Body:
```json
{}
```

🔸 Sample Request:
```json
{
  "query": {
    "page": 1,
    "limit": 10
  }
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Workspaces retrieved successfully.",
  "data": {
    "items": [
      {
        "_id": "680000000000000000000201",
        "name": "Engineering",
        "slug": "engineering",
        "organizationId": "680000000000000000000101",
        "description": "Core product delivery workspace"
      }
    ],
    "meta": {
      "totalItems": 1,
      "itemCount": 1,
      "itemsPerPage": 10,
      "totalPages": 1,
      "currentPage": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

🔸 Error Responses:
- `401` → unauthorized
- `403` → permission or role context missing
- `500` → server error

🔸 Business Logic:
Filters by `organizationId` and `isActive: true`, sorts by newest, then paginates.

🔸 Side Effects:
- None

🔸 Frontend Usage Notes:
Cache by organization and page. Current REST auth middleware never sets `req.organizationId`, so this endpoint can return empty or inconsistent data until org context is fixed.

--------------------------------------------
🔸 Endpoint Name: Get Workspace By ID
🔸 Method: `GET`
🔸 URL: `<INSERT_BASE_URL>/api/v1/workspaces/:id`

🔸 Description:
Fetches one active workspace in the current organization.

🔸 Access Level:
- Protected
- Roles Allowed: Admin, Manager, Member

🔸 Headers:
- `Authorization: Bearer <token>`

🔸 Request Parameters:

📍 Path Params:
- `id: string (required) -> workspace ObjectId`

📍 Query Params:
- None

📍 Body:
```json
{}
```

🔸 Sample Request:
```json
{
  "params": {
    "id": "680000000000000000000201"
  }
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Workspace details retrieved.",
  "data": {
    "_id": "680000000000000000000201",
    "name": "Engineering",
    "slug": "engineering",
    "description": "Core product delivery workspace"
  }
}
```

🔸 Error Responses:
- `401` → unauthorized
- `404` → workspace not found or unauthorized
- `500` → server error

🔸 Business Logic:
Fetches active workspace by id and organization.

🔸 Side Effects:
- None

🔸 Frontend Usage Notes:
Use for workspace detail pages, but expect failures in fresh environments because workspace service depends on schema fields that are currently missing.

--------------------------------------------
🔸 Endpoint Name: Create Workspace
🔸 Method: `POST`
🔸 URL: `<INSERT_BASE_URL>/api/v1/workspaces`

🔸 Description:
Creates a workspace inside the current organization.

🔸 Access Level:
- Protected
- Roles Allowed: Admin, Manager

🔸 Headers:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

🔸 Request Parameters:

📍 Path Params:
- None

📍 Query Params:
- None

📍 Body:
```json
{
  "name": "string (required) -> workspace name",
  "description": "string (optional) -> workspace summary"
}
```

🔸 Sample Request:
```json
{
  "name": "Engineering",
  "description": "Core product delivery workspace"
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Workspace created successfully.",
  "data": {
    "_id": "680000000000000000000201",
    "name": "Engineering",
    "organizationId": "680000000000000000000101"
  }
}
```

🔸 Error Responses:
- `400` → name missing
- `401` → unauthorized
- `403` → permission denied
- `422` → schema validation failure
- `500` → server error

🔸 Business Logic:
Validates name, creates workspace, and attempts to write activity log.

🔸 Side Effects:
- Creates `Workspace`
- Attempts activity log

🔸 Frontend Usage Notes:
This route is currently blocked by backend mismatches:
- `workspaceSchema` requires `slug`, but controller/service do not send it
- service reads/writes `isActive`, but schema does not define it

--------------------------------------------
🔸 Endpoint Name: Update Workspace
🔸 Method: `PATCH`
🔸 URL: `<INSERT_BASE_URL>/api/v1/workspaces/:id`

🔸 Description:
Updates workspace name or description.

🔸 Access Level:
- Protected
- Roles Allowed: Admin, Manager

🔸 Headers:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

🔸 Request Parameters:

📍 Path Params:
- `id: string (required) -> workspace ObjectId`

📍 Query Params:
- None

📍 Body:
```json
{
  "name": "string (optional)",
  "description": "string (optional)"
}
```

🔸 Sample Request:
```json
{
  "name": "Engineering Ops",
  "description": "Delivery and platform operations"
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Workspace updated successfully.",
  "data": {
    "_id": "680000000000000000000201",
    "name": "Engineering Ops",
    "description": "Delivery and platform operations"
  }
}
```

🔸 Error Responses:
- `401` → unauthorized
- `403` → permission denied
- `404` → workspace not found or unauthorized
- `422` → validation failure
- `500` → server error

🔸 Business Logic:
Updates active workspace by id and organization, then attempts activity logging.

🔸 Side Effects:
- Updates `Workspace`
- Attempts activity log

🔸 Frontend Usage Notes:
Avoid optimistic UI unless you handle rollback. Reads and writes are unstable until org context and schema gaps are fixed.

--------------------------------------------
🔸 Endpoint Name: Delete Workspace
🔸 Method: `DELETE`
🔸 URL: `<INSERT_BASE_URL>/api/v1/workspaces/:id`

🔸 Description:
Soft-deletes a workspace.

🔸 Access Level:
- Protected
- Roles Allowed: Admin, Manager

🔸 Headers:
- `Authorization: Bearer <token>`

🔸 Request Parameters:

📍 Path Params:
- `id: string (required) -> workspace ObjectId`

📍 Query Params:
- None

📍 Body:
```json
{}
```

🔸 Sample Request:
```json
{
  "params": {
    "id": "680000000000000000000201"
  }
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Workspace deleted successfully.",
  "data": null
}
```

🔸 Error Responses:
- `401` → unauthorized
- `403` → permission denied
- `404` → workspace not found or unauthorized
- `500` → server error

🔸 Business Logic:
Intended to mark `isActive = false` and log deletion.

🔸 Side Effects:
- Updates `Workspace`
- Attempts activity log

🔸 Frontend Usage Notes:
The soft-delete field is not actually defined in the schema, so QA should treat this route as unstable.

--------------------------------------------

==============================
📌 MODULE: PROJECT
==============================

🔹 Description:
Project CRUD and archive operations, typically inside a workspace.

--------------------------------------------

🔹 Endpoints:

--------------------------------------------
🔸 Endpoint Name: List Projects
🔸 Method: `GET`
🔸 URL: `<INSERT_BASE_URL>/api/v1/projects`

🔸 Description:
Returns paginated projects with workspace and status filters.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User

🔸 Headers:
- `Authorization: Bearer <token>`

🔸 Request Parameters:

📍 Path Params:
- None

📍 Query Params:
- `page: number (optional) -> default 1`
- `limit: number (optional) -> default 10`
- `workspaceId: string (optional)`
- `status: string (optional) -> active|completed|archived|planned|on_hold`

📍 Body:
```json
{}
```

🔸 Sample Request:
```json
{
  "query": {
    "page": 1,
    "limit": 10,
    "workspaceId": "680000000000000000000201",
    "status": "active"
  }
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Projects retrieved successfully.",
  "data": {
    "items": [
      {
        "_id": "680000000000000000000301",
        "name": "PMS Revamp",
        "workspaceId": {
          "_id": "680000000000000000000201",
          "name": "Engineering"
        },
        "status": "active"
      }
    ],
    "meta": {
      "totalItems": 1,
      "itemCount": 1,
      "itemsPerPage": 10,
      "totalPages": 1,
      "currentPage": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

🔸 Error Responses:
- `401` → unauthorized
- `500` → server error

🔸 Business Logic:
Super admin sees all active projects. Otherwise the query falls back to organization scope or owner scope, then applies workspace/status filters.

🔸 Side Effects:
- None

🔸 Frontend Usage Notes:
Good candidate for SWR-style caching by filter key. There is no route-level permission middleware on project CRUD today.

--------------------------------------------
🔸 Endpoint Name: Create Project
🔸 Method: `POST`
🔸 URL: `<INSERT_BASE_URL>/api/v1/projects`

🔸 Description:
Creates a project under a workspace or as a solo-owned project.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User

🔸 Headers:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

🔸 Request Parameters:

📍 Path Params:
- None

📍 Query Params:
- None

📍 Body:
```json
{
  "name": "string (required) -> project name",
  "description": "string (optional)",
  "workspaceId": "string (optional)",
  "status": "string (optional) -> active|completed|archived|planned|on_hold"
}
```

🔸 Sample Request:
```json
{
  "name": "PMS Revamp",
  "description": "Backend stabilization and API cleanup",
  "workspaceId": "680000000000000000000201",
  "status": "active"
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Project created successfully.",
  "data": {
    "_id": "680000000000000000000301",
    "name": "PMS Revamp",
    "workspaceId": "680000000000000000000201",
    "organizationId": "680000000000000000000101",
    "ownerId": "680000000000000000000001",
    "status": "active"
  }
}
```

🔸 Error Responses:
- `400` → project name missing
- `401` → unauthorized
- `422` → validation failure
- `500` → server error

🔸 Business Logic:
Validates name, creates project, lowercases status, and attempts activity logging.

🔸 Side Effects:
- Creates `Project`
- Attempts activity log

🔸 Frontend Usage Notes:
Backend does not verify workspace ownership or membership consistency. Validate those relationships at the UI layer for now.

--------------------------------------------
🔸 Endpoint Name: Update Project
🔸 Method: `PATCH`
🔸 URL: `<INSERT_BASE_URL>/api/v1/projects/:id`

🔸 Description:
Updates project fields.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User

🔸 Headers:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

🔸 Request Parameters:

📍 Path Params:
- `id: string (required) -> project ObjectId`

📍 Query Params:
- None

📍 Body:
```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "status": "string (optional)",
  "startDate": "string (optional) -> ISO date",
  "endDate": "string (optional) -> ISO date"
}
```

🔸 Sample Request:
```json
{
  "description": "API contract cleanup and QA-ready docs",
  "status": "on_hold"
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Project updated successfully.",
  "data": {
    "_id": "680000000000000000000301",
    "status": "on_hold"
  }
}
```

🔸 Error Responses:
- `401` → unauthorized
- `404` → project not found
- `422` → validation failure
- `500` → server error

🔸 Business Logic:
Updates active project by id with validators enabled.

🔸 Side Effects:
- Updates `Project`
- Attempts activity log

🔸 Frontend Usage Notes:
Project activity logs may not persist because services use action values not allowed by the current activity schema.

--------------------------------------------
🔸 Endpoint Name: Archive Project
🔸 Method: `POST`
🔸 URL: `<INSERT_BASE_URL>/api/v1/projects/:id/archive`

🔸 Description:
Marks a project as archived.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User

🔸 Headers:
- `Authorization: Bearer <token>`

🔸 Request Parameters:

📍 Path Params:
- `id: string (required) -> project ObjectId`

📍 Query Params:
- None

📍 Body:
```json
{}
```

🔸 Sample Request:
```json
{
  "params": {
    "id": "680000000000000000000301"
  }
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Project archived successfully.",
  "data": {
    "_id": "680000000000000000000301",
    "status": "archived"
  }
}
```

🔸 Error Responses:
- `401` → unauthorized
- `404` → project not found
- `500` → server error

🔸 Business Logic:
Targeted status update to `archived`.

🔸 Side Effects:
- Updates `Project`
- Attempts activity log

🔸 Frontend Usage Notes:
This is a custom action endpoint. It would be more REST-consistent as a standard status patch.

--------------------------------------------
🔸 Endpoint Name: Get Project By ID
🔸 Method: `GET`
🔸 URL: `<INSERT_BASE_URL>/api/v1/projects/:id`

🔸 Description:
Returns one active project with workspace summary.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User

🔸 Headers:
- `Authorization: Bearer <token>`

🔸 Request Parameters:

📍 Path Params:
- `id: string (required) -> project ObjectId`

📍 Query Params:
- None

📍 Body:
```json
{}
```

🔸 Sample Request:
```json
{
  "params": {
    "id": "680000000000000000000301"
  }
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Project details retrieved.",
  "data": {
    "_id": "680000000000000000000301",
    "name": "PMS Revamp",
    "workspaceId": {
      "_id": "680000000000000000000201",
      "name": "Engineering"
    },
    "status": "active"
  }
}
```

🔸 Error Responses:
- `401` → unauthorized
- `404` → project not found
- `500` → server error

🔸 Business Logic:
Fetches active project by id and populates workspace name.

🔸 Side Effects:
- None

🔸 Frontend Usage Notes:
Use this for detail pages instead of relying on list-row data.

--------------------------------------------
🔸 Endpoint Name: Delete Project
🔸 Method: `DELETE`
🔸 URL: `<INSERT_BASE_URL>/api/v1/projects/:id`

🔸 Description:
Soft-deletes a project.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User

🔸 Headers:
- `Authorization: Bearer <token>`

🔸 Request Parameters:

📍 Path Params:
- `id: string (required) -> project ObjectId`

📍 Query Params:
- None

📍 Body:
```json
{}
```

🔸 Sample Request:
```json
{
  "params": {
    "id": "680000000000000000000301"
  }
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Project deleted successfully.",
  "data": null
}
```

🔸 Error Responses:
- `401` → unauthorized
- `404` → project not found
- `500` → server error

🔸 Business Logic:
Marks `isActive = false` on the project.

🔸 Side Effects:
- Updates `Project`
- Attempts activity log

🔸 Frontend Usage Notes:
Deleting a project does not cascade to tasks. Refresh related task views yourself.

--------------------------------------------

==============================
📌 MODULE: TASK
==============================

🔹 Description:
Task CRUD, assignment, status management, and task detail expansion with assignees and tags.

--------------------------------------------

🔹 Endpoints:

--------------------------------------------
🔸 Endpoint Name: List Tasks
🔸 Method: `GET`
🔸 URL: `<INSERT_BASE_URL>/api/v1/tasks`

🔸 Description:
Returns paginated tasks with workspace, project, status, priority, assignee, tag, and due-date filters.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User

🔸 Headers:
- `Authorization: Bearer <token>`

🔸 Request Parameters:

📍 Path Params:
- None

📍 Query Params:
- `page: number (optional) -> default 1`
- `limit: number (optional) -> default 10`
- `workspaceId: string (optional)`
- `projectId: string (optional)`
- `status: string (optional) -> BACKLOG|TODO|IN_PROGRESS|IN_REVIEW|DONE|ARCHIVED`
- `priority: string (optional) -> LOW|MEDIUM|HIGH|URGENT`
- `assigneeId: string (optional)`
- `tagId: string (optional)`
- `dueDate: string (optional) -> tasks due on or before date`

📍 Body:
```json
{}
```

🔸 Sample Request:
```json
{
  "query": {
    "page": 1,
    "limit": 20,
    "projectId": "680000000000000000000301",
    "status": "IN_PROGRESS",
    "assigneeId": "680000000000000000000002"
  }
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Tasks retrieved successfully.",
  "data": {
    "items": [
      {
        "_id": "680000000000000000000401",
        "title": "Document every API route",
        "status": "IN_PROGRESS",
        "priority": "HIGH",
        "projectId": {
          "_id": "680000000000000000000301",
          "name": "PMS Revamp"
        }
      }
    ],
    "meta": {
      "totalItems": 1,
      "itemCount": 1,
      "itemsPerPage": 20,
      "totalPages": 1,
      "currentPage": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

🔸 Error Responses:
- `401` → unauthorized
- `500` → server error

🔸 Business Logic:
Builds a base active-task query, optionally scopes by organization or creator, then applies assignee/tag subqueries and paginates.

🔸 Side Effects:
- None

🔸 Frontend Usage Notes:
Debounce filter changes. Assignee/tag filters are heavier than simple status filters because they require extra DB lookups.

--------------------------------------------
🔸 Endpoint Name: Create Task
🔸 Method: `POST`
🔸 URL: `<INSERT_BASE_URL>/api/v1/tasks`

🔸 Description:
Creates a task and optionally bulk-creates task-assignee and task-tag relations.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User

🔸 Headers:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

🔸 Request Parameters:

📍 Path Params:
- None

📍 Query Params:
- None

📍 Body:
```json
{
  "title": "string (required) -> task title",
  "description": "string (optional)",
  "projectId": "string (required) -> project ObjectId",
  "workspaceId": "string (optional)",
  "status": "string (optional) -> defaults to TODO",
  "priority": "string (optional) -> defaults to MEDIUM",
  "dueDate": "string (optional) -> ISO date",
  "assignees": "string[] (optional) -> user ObjectIds",
  "tags": "string[] (optional) -> tag ObjectIds"
}
```

🔸 Sample Request:
```json
{
  "title": "Document every API route",
  "description": "Write complete frontend-facing API hub",
  "projectId": "680000000000000000000301",
  "workspaceId": "680000000000000000000201",
  "priority": "HIGH",
  "dueDate": "2026-04-20T00:00:00.000Z",
  "assignees": [
    "680000000000000000000002"
  ],
  "tags": [
    "680000000000000000000701"
  ]
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Task created successfully.",
  "data": {
    "_id": "680000000000000000000401",
    "title": "Document every API route",
    "projectId": "680000000000000000000301",
    "workspaceId": "680000000000000000000201",
    "status": "TODO",
    "priority": "HIGH"
  }
}
```

🔸 Error Responses:
- `400` → title missing
- `401` → unauthorized
- `422` → validation failure
- `500` → transaction or server error

🔸 Business Logic:
Runs a Mongo transaction:
- create task
- insert assignee rows
- insert tag rows
Then logs activity, attempts notifications, and emits `task:created`.

🔸 Side Effects:
- Creates `Task`
- Creates `TaskAssignee`
- Creates `TaskTag`
- Attempts activity log
- Attempts notifications
- Emits realtime event

🔸 Frontend Usage Notes:
Organization context is not reliably attached in REST auth, so org-scoped task creation is currently environment-dependent.

--------------------------------------------
🔸 Endpoint Name: Update Task
🔸 Method: `PATCH`
🔸 URL: `<INSERT_BASE_URL>/api/v1/tasks/:id`

🔸 Description:
Updates arbitrary task fields.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User

🔸 Headers:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

🔸 Request Parameters:

📍 Path Params:
- `id: string (required) -> task ObjectId`

📍 Query Params:
- None

📍 Body:
```json
{
  "title": "string (optional)",
  "description": "string (optional)",
  "priority": "string (optional)",
  "dueDate": "string (optional)",
  "position": "number (optional)",
  "startDate": "string (optional)"
}
```

🔸 Sample Request:
```json
{
  "priority": "URGENT",
  "position": 4
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Task updated successfully.",
  "data": {
    "_id": "680000000000000000000401",
    "priority": "URGENT",
    "position": 4
  }
}
```

🔸 Error Responses:
- `401` → unauthorized
- `404` → task not found
- `422` → validation failure
- `500` → server error

🔸 Business Logic:
Updates active task with validators enabled, then attempts to log changed fields.

🔸 Side Effects:
- Updates `Task`
- Attempts activity log

🔸 Frontend Usage Notes:
Useful for inline edits. Backend currently applies broad access because route-level permission enforcement is missing here.

--------------------------------------------
🔸 Endpoint Name: Assign Users To Task
🔸 Method: `POST`
🔸 URL: `<INSERT_BASE_URL>/api/v1/tasks/:id/assign`

🔸 Description:
Adds one or more assignees to a task.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User

🔸 Headers:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

🔸 Request Parameters:

📍 Path Params:
- `id: string (required) -> task ObjectId`

📍 Query Params:
- None

📍 Body:
```json
{
  "userIds": "string[] (required) -> user ObjectIds"
}
```

🔸 Sample Request:
```json
{
  "userIds": [
    "680000000000000000000002",
    "680000000000000000000003"
  ]
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Users assigned successfully.",
  "data": null
}
```

🔸 Error Responses:
- `400` → invalid or missing `userIds`
- `401` → unauthorized
- `404` → task not found
- `500` → server error

🔸 Business Logic:
Creates task-assignee rows with `ordered: false`, ignores duplicate-key errors, attempts notifications, and emits `task:assigned` to each user room.

🔸 Side Effects:
- Creates `TaskAssignee`
- Attempts notifications
- Emits realtime event

🔸 Frontend Usage Notes:
Treat as idempotent for duplicate assignees.

--------------------------------------------
🔸 Endpoint Name: Change Task Status
🔸 Method: `PATCH`
🔸 URL: `<INSERT_BASE_URL>/api/v1/tasks/:id/status`

🔸 Description:
Changes task workflow status.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User

🔸 Headers:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

🔸 Request Parameters:

📍 Path Params:
- `id: string (required) -> task ObjectId`

📍 Query Params:
- None

📍 Body:
```json
{
  "status": "string (required) -> TODO|IN_PROGRESS|IN_REVIEW|DONE|ARCHIVED"
}
```

🔸 Sample Request:
```json
{
  "status": "DONE"
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Task status changed to DONE.",
  "data": {
    "_id": "680000000000000000000401",
    "status": "DONE"
  }
}
```

🔸 Error Responses:
- `400` → invalid status
- `401` → unauthorized
- `404` → task not found
- `500` → server error

🔸 Business Logic:
Validates against explicit allowed list, updates task, logs status change, and emits `task:updated`.

🔸 Side Effects:
- Updates `Task`
- Attempts activity log
- Emits realtime event

🔸 Frontend Usage Notes:
Well-suited to optimistic kanban updates.

--------------------------------------------
🔸 Endpoint Name: Get Task By ID
🔸 Method: `GET`
🔸 URL: `<INSERT_BASE_URL>/api/v1/tasks/:id`

🔸 Description:
Returns full task detail including populated project, workspace, assignees, and tags.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User

🔸 Headers:
- `Authorization: Bearer <token>`

🔸 Request Parameters:

📍 Path Params:
- `id: string (required) -> task ObjectId`

📍 Query Params:
- None

📍 Body:
```json
{}
```

🔸 Sample Request:
```json
{
  "params": {
    "id": "680000000000000000000401"
  }
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Task details retrieved.",
  "data": {
    "_id": "680000000000000000000401",
    "title": "Document every API route",
    "projectId": {
      "_id": "680000000000000000000301",
      "name": "PMS Revamp"
    },
    "workspaceId": {
      "_id": "680000000000000000000201",
      "name": "Engineering"
    },
    "assignees": [],
    "tags": []
  }
}
```

🔸 Error Responses:
- `401` → unauthorized
- `404` → task not found
- `500` → server error

🔸 Business Logic:
Loads task first, then loads task-assignee rows and task-tag rows separately.

🔸 Side Effects:
- None

🔸 Frontend Usage Notes:
Use this endpoint for drawers or detail pages rather than overloading the task list.

--------------------------------------------
🔸 Endpoint Name: Delete Task
🔸 Method: `DELETE`
🔸 URL: `<INSERT_BASE_URL>/api/v1/tasks/:id`

🔸 Description:
Soft-deletes a task.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User

🔸 Headers:
- `Authorization: Bearer <token>`

🔸 Request Parameters:

📍 Path Params:
- `id: string (required) -> task ObjectId`

📍 Query Params:
- None

📍 Body:
```json
{}
```

🔸 Sample Request:
```json
{
  "params": {
    "id": "680000000000000000000401"
  }
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Task deleted successfully.",
  "data": null
}
```

🔸 Error Responses:
- `401` → unauthorized
- `404` → task not found
- `500` → server error

🔸 Business Logic:
Marks `isActive = false`, attempts activity log, and emits `task:deleted`.

🔸 Side Effects:
- Updates `Task`
- Attempts activity log
- Emits realtime event

🔸 Frontend Usage Notes:
Refresh project counters and task lists after delete. Assignee/tag join rows are not explicitly cleaned up.

--------------------------------------------

==============================
📌 MODULE: COMMENT
==============================

🔹 Description:
Task-thread comments with optional reply threading and `@mention` parsing.

--------------------------------------------

🔹 Endpoints:

--------------------------------------------
🔸 Endpoint Name: List Task Comments
🔸 Method: `GET`
🔸 URL: `<INSERT_BASE_URL>/api/v1/comments/task/:taskId`

🔸 Description:
Returns paginated comments for one task in chronological order.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User with `VIEW_PROJECT`

🔸 Headers:
- `Authorization: Bearer <token>`

🔸 Request Parameters:

📍 Path Params:
- `taskId: string (required) -> task ObjectId`

📍 Query Params:
- `page: number (optional) -> default 1`
- `limit: number (optional) -> default 20`

📍 Body:
```json
{}
```

🔸 Sample Request:
```json
{
  "params": {
    "taskId": "680000000000000000000401"
  },
  "query": {
    "page": 1,
    "limit": 20
  }
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Comments retrieved successfully.",
  "data": {
    "items": [
      {
        "_id": "680000000000000000000801",
        "content": "Please review the auth section @Riya",
        "taskId": "680000000000000000000401",
        "parentId": null,
        "isEdited": false
      }
    ],
    "meta": {
      "totalItems": 1,
      "itemCount": 1,
      "itemsPerPage": 20,
      "totalPages": 1,
      "currentPage": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

🔸 Error Responses:
- `401` → unauthorized
- `403` → permission denied
- `500` → server error

🔸 Business Logic:
Fetches flat comment rows and leaves thread assembly to the client using `parentId`.

🔸 Side Effects:
- None

🔸 Frontend Usage Notes:
Paginating threaded data can split parents and replies across pages, so keep render logic defensive.

--------------------------------------------
🔸 Endpoint Name: Add Comment
🔸 Method: `POST`
🔸 URL: `<INSERT_BASE_URL>/api/v1/comments`

🔸 Description:
Adds a task comment or reply.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User with `CREATE_TASK`

🔸 Headers:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

🔸 Request Parameters:

📍 Path Params:
- None

📍 Query Params:
- None

📍 Body:
```json
{
  "content": "string (required) -> comment text",
  "taskId": "string (required) -> task ObjectId",
  "parentId": "string (optional) -> parent comment ObjectId"
}
```

🔸 Sample Request:
```json
{
  "content": "Please review the auth section @Riya",
  "taskId": "680000000000000000000401",
  "parentId": null
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Comment added successfully.",
  "data": {
    "_id": "680000000000000000000801",
    "content": "Please review the auth section @Riya",
    "taskId": "680000000000000000000401",
    "authorId": "680000000000000000000001",
    "mentions": [
      "680000000000000000000002"
    ]
  }
}
```

🔸 Error Responses:
- `401` → unauthorized
- `403` → permission denied
- `404` → task not found
- `500` → server error

🔸 Business Logic:
Validates task access, parses mentions, creates comment, logs activity, and attempts mention/task-creator notifications.

🔸 Side Effects:
- Creates `Comment`
- Attempts activity log
- Attempts notifications

🔸 Frontend Usage Notes:
Mention parsing is currently based on first name or a synthetic Gmail fallback, so treat mention notifications as best-effort.

--------------------------------------------
🔸 Endpoint Name: Update Comment
🔸 Method: `PATCH`
🔸 URL: `<INSERT_BASE_URL>/api/v1/comments/:id`

🔸 Description:
Updates the current user’s own comment.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User with `CREATE_TASK`

🔸 Headers:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

🔸 Request Parameters:

📍 Path Params:
- `id: string (required) -> comment ObjectId`

📍 Query Params:
- None

📍 Body:
```json
{
  "content": "string (required) -> updated comment text"
}
```

🔸 Sample Request:
```json
{
  "content": "Please review auth and billing sections @Riya"
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Comment updated successfully.",
  "data": {
    "_id": "680000000000000000000801",
    "content": "Please review auth and billing sections @Riya",
    "isEdited": true
  }
}
```

🔸 Error Responses:
- `401` → unauthorized
- `403` → permission denied
- `404` → comment not found or unauthorized
- `500` → server error

🔸 Business Logic:
Updates comment only when both author and organization match.

🔸 Side Effects:
- Updates `Comment`

🔸 Frontend Usage Notes:
Expose edit controls only to the author. Mention list is not recalculated on edit.

--------------------------------------------
🔸 Endpoint Name: Delete Comment
🔸 Method: `DELETE`
🔸 URL: `<INSERT_BASE_URL>/api/v1/comments/:id`

🔸 Description:
Deletes the current user’s own comment.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User with `CREATE_TASK`

🔸 Headers:
- `Authorization: Bearer <token>`

🔸 Request Parameters:

📍 Path Params:
- `id: string (required) -> comment ObjectId`

📍 Query Params:
- None

📍 Body:
```json
{}
```

🔸 Sample Request:
```json
{
  "params": {
    "id": "680000000000000000000801"
  }
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Comment deleted successfully.",
  "data": null
}
```

🔸 Error Responses:
- `401` → unauthorized
- `403` → permission denied
- `404` → comment not found or unauthorized
- `500` → server error

🔸 Business Logic:
Hard-deletes a comment if author and organization match.

🔸 Side Effects:
- Deletes `Comment`

🔸 Frontend Usage Notes:
There is no restore flow, so show destructive confirmation.

--------------------------------------------

==============================
📌 MODULE: ATTACHMENT
==============================

🔹 Description:
Stores task attachment metadata only. Binary upload is expected to happen outside this API.

--------------------------------------------

🔹 Endpoints:

--------------------------------------------
🔸 Endpoint Name: List Task Attachments
🔸 Method: `GET`
🔸 URL: `<INSERT_BASE_URL>/api/v1/attachments/task/:taskId`

🔸 Description:
Returns attachment metadata linked to a task.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User with `VIEW_PROJECT`

🔸 Headers:
- `Authorization: Bearer <token>`

🔸 Request Parameters:

📍 Path Params:
- `taskId: string (required) -> task ObjectId`

📍 Query Params:
- None

📍 Body:
```json
{}
```

🔸 Sample Request:
```json
{
  "params": {
    "taskId": "680000000000000000000401"
  }
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Attachments retrieved successfully.",
  "data": [
    {
      "_id": "680000000000000000000901",
      "fileName": "api-hub-draft.pdf",
      "fileType": "application/pdf",
      "fileSize": 1048576,
      "fileUrl": "https://cdn.example.com/files/api-hub-draft.pdf"
    }
  ]
}
```

🔸 Error Responses:
- `401` → unauthorized
- `403` → permission denied
- `500` → server error

🔸 Business Logic:
Lists attachment metadata sorted newest first.

🔸 Side Effects:
- None

🔸 Frontend Usage Notes:
Fetch lazily when the file panel opens.

--------------------------------------------
🔸 Endpoint Name: Store Attachment Metadata
🔸 Method: `POST`
🔸 URL: `<INSERT_BASE_URL>/api/v1/attachments`

🔸 Description:
Creates an attachment metadata row after binary upload succeeds elsewhere.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User with `CREATE_TASK`

🔸 Headers:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

🔸 Request Parameters:

📍 Path Params:
- None

📍 Query Params:
- None

📍 Body:
```json
{
  "fileName": "string (required)",
  "fileType": "string (required) -> MIME type",
  "fileSize": "number (required) -> bytes",
  "fileUrl": "string (required) -> accessible file URL",
  "key": "string (required) -> cloud storage object key",
  "taskId": "string (required) -> task ObjectId"
}
```

🔸 Sample Request:
```json
{
  "fileName": "api-hub-draft.pdf",
  "fileType": "application/pdf",
  "fileSize": 1048576,
  "fileUrl": "https://cdn.example.com/files/api-hub-draft.pdf",
  "key": "tasks/680000000000000000000401/api-hub-draft.pdf",
  "taskId": "680000000000000000000401"
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Attachment stored successfully.",
  "data": {
    "_id": "680000000000000000000901",
    "fileName": "api-hub-draft.pdf",
    "taskId": "680000000000000000000401"
  }
}
```

🔸 Error Responses:
- `401` → unauthorized
- `403` → permission denied
- `404` → task not found
- `422` → validation failure
- `500` → server error

🔸 Business Logic:
Validates task existence in org, creates attachment metadata, logs task update, and attempts a notification to task creator.

🔸 Side Effects:
- Creates `Attachment`
- Attempts activity log
- Attempts notifications

🔸 Frontend Usage Notes:
This is metadata-only. Do not send multipart binary to this backend.

--------------------------------------------
🔸 Endpoint Name: Delete Attachment
🔸 Method: `DELETE`
🔸 URL: `<INSERT_BASE_URL>/api/v1/attachments/:id`

🔸 Description:
Deletes attachment metadata if current user uploaded it.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User with `CREATE_TASK`

🔸 Headers:
- `Authorization: Bearer <token>`

🔸 Request Parameters:

📍 Path Params:
- `id: string (required) -> attachment ObjectId`

📍 Query Params:
- None

📍 Body:
```json
{}
```

🔸 Sample Request:
```json
{
  "params": {
    "id": "680000000000000000000901"
  }
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Attachment removed successfully.",
  "data": null
}
```

🔸 Error Responses:
- `401` → unauthorized
- `403` → permission denied
- `404` → attachment not found or unauthorized
- `500` → server error

🔸 Business Logic:
Hard-deletes attachment row scoped by organization and uploader.

🔸 Side Effects:
- Deletes `Attachment`

🔸 Frontend Usage Notes:
This does not remove the underlying cloud object.

--------------------------------------------

==============================
📌 MODULE: TAG
==============================

🔹 Description:
Reusable org/workspace tags and task-tag associations.

--------------------------------------------

🔹 Endpoints:

--------------------------------------------
🔸 Endpoint Name: List Tags
🔸 Method: `GET`
🔸 URL: `<INSERT_BASE_URL>/api/v1/tags`

🔸 Description:
Returns tags for current organization, optionally filtered by workspace.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User with `VIEW_PROJECT`

🔸 Headers:
- `Authorization: Bearer <token>`

🔸 Request Parameters:

📍 Path Params:
- None

📍 Query Params:
- `workspaceId: string (optional) -> workspace filter`

📍 Body:
```json
{}
```

🔸 Sample Request:
```json
{
  "query": {
    "workspaceId": "680000000000000000000201"
  }
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Tags retrieved successfully.",
  "data": [
    {
      "_id": "680000000000000000000701",
      "name": "Documentation",
      "color": "#2563eb"
    }
  ]
}
```

🔸 Error Responses:
- `401` → unauthorized
- `403` → permission denied
- `500` → server error

🔸 Business Logic:
Fetches tags by organization and optional workspace.

🔸 Side Effects:
- None

🔸 Frontend Usage Notes:
Cache aggressively; tags are low-churn reference data.

--------------------------------------------
🔸 Endpoint Name: Create Tag
🔸 Method: `POST`
🔸 URL: `<INSERT_BASE_URL>/api/v1/tags`

🔸 Description:
Creates a new reusable tag.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User with `CREATE_TASK`

🔸 Headers:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

🔸 Request Parameters:

📍 Path Params:
- None

📍 Query Params:
- None

📍 Body:
```json
{
  "name": "string (required) -> unique tag name within org",
  "color": "string (optional) -> defaults to #6366f1",
  "workspaceId": "string (optional)"
}
```

🔸 Sample Request:
```json
{
  "name": "Documentation",
  "color": "#2563eb",
  "workspaceId": "680000000000000000000201"
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Tag created successfully.",
  "data": {
    "_id": "680000000000000000000701",
    "name": "Documentation",
    "color": "#2563eb"
  }
}
```

🔸 Error Responses:
- `400` → duplicate tag name
- `401` → unauthorized
- `403` → permission denied
- `422` → validation failure
- `500` → server error

🔸 Business Logic:
Checks name uniqueness in organization, then creates tag.

🔸 Side Effects:
- Creates `Tag`

🔸 Frontend Usage Notes:
Normalize whitespace/casing client-side to reduce duplicate attempts.

--------------------------------------------
🔸 Endpoint Name: Assign Tag To Task
🔸 Method: `POST`
🔸 URL: `<INSERT_BASE_URL>/api/v1/tags/task/:taskId`

🔸 Description:
Links an existing tag to a task.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User with `CREATE_TASK`

🔸 Headers:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

🔸 Request Parameters:

📍 Path Params:
- `taskId: string (required) -> task ObjectId`

📍 Query Params:
- None

📍 Body:
```json
{
  "tagId": "string (required) -> tag ObjectId"
}
```

🔸 Sample Request:
```json
{
  "tagId": "680000000000000000000701"
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Tag assigned to task.",
  "data": null
}
```

🔸 Error Responses:
- `401` → unauthorized
- `403` → permission denied
- `500` → server error

🔸 Business Logic:
Creates `TaskTag`; duplicates are treated as success.

🔸 Side Effects:
- Creates `TaskTag`

🔸 Frontend Usage Notes:
Safe to retry on network errors.

--------------------------------------------
🔸 Endpoint Name: Remove Tag From Task
🔸 Method: `DELETE`
🔸 URL: `<INSERT_BASE_URL>/api/v1/tags/task/:taskId/:tagId`

🔸 Description:
Unlinks one tag from one task.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User with `CREATE_TASK`

🔸 Headers:
- `Authorization: Bearer <token>`

🔸 Request Parameters:

📍 Path Params:
- `taskId: string (required) -> task ObjectId`
- `tagId: string (required) -> tag ObjectId`

📍 Query Params:
- None

📍 Body:
```json
{}
```

🔸 Sample Request:
```json
{
  "params": {
    "taskId": "680000000000000000000401",
    "tagId": "680000000000000000000701"
  }
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Tag removed from task.",
  "data": null
}
```

🔸 Error Responses:
- `401` → unauthorized
- `403` → permission denied
- `500` → server error

🔸 Business Logic:
Deletes a single `TaskTag` relation.

🔸 Side Effects:
- Deletes `TaskTag`

🔸 Frontend Usage Notes:
Optimistic UI is fine here.

--------------------------------------------
🔸 Endpoint Name: Delete Tag Globally
🔸 Method: `DELETE`
🔸 URL: `<INSERT_BASE_URL>/api/v1/tags/:id`

🔸 Description:
Deletes a tag globally and removes its task links.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User with `CREATE_TASK`

🔸 Headers:
- `Authorization: Bearer <token>`

🔸 Request Parameters:

📍 Path Params:
- `id: string (required) -> tag ObjectId`

📍 Query Params:
- None

📍 Body:
```json
{}
```

🔸 Sample Request:
```json
{
  "params": {
    "id": "680000000000000000000701"
  }
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Tag deleted globally.",
  "data": null
}
```

🔸 Error Responses:
- `401` → unauthorized
- `403` → permission denied
- `404` → tag not found or unauthorized
- `500` → server error

🔸 Business Logic:
Deletes the tag, then deletes all matching `TaskTag` rows.

🔸 Side Effects:
- Deletes `Tag`
- Deletes many `TaskTag`

🔸 Frontend Usage Notes:
Refresh all task views showing the deleted tag.

--------------------------------------------

==============================
📌 MODULE: SEARCH
==============================

🔹 Description:
Global text search across tasks, projects, and workspaces using MongoDB text indexes.

--------------------------------------------

🔹 Endpoints:

--------------------------------------------
🔸 Endpoint Name: Global Search
🔸 Method: `GET`
🔸 URL: `<INSERT_BASE_URL>/api/v1/search`

🔸 Description:
Performs cross-entity quick search and returns grouped results.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager, Member, User

🔸 Headers:
- `Authorization: Bearer <token>`

🔸 Request Parameters:

📍 Path Params:
- None

📍 Query Params:
- `q: string (optional) -> empty query returns empty arrays`

📍 Body:
```json
{}
```

🔸 Sample Request:
```json
{
  "query": {
    "q": "documentation auth"
  }
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Search results retrieved.",
  "data": {
    "tasks": [],
    "projects": [],
    "workspaces": []
  }
}
```

🔸 Error Responses:
- `401` → unauthorized
- `500` → server or text-index error

🔸 Business Logic:
Runs three parallel text-search queries with `limit(10)` per entity group.

🔸 Side Effects:
- None

🔸 Frontend Usage Notes:
Debounce 250-400ms for command-palette style usage.

--------------------------------------------

==============================
📌 MODULE: INVITE
==============================

🔹 Description:
Organization invitation creation, listing, and acceptance.

--------------------------------------------

🔹 Endpoints:

--------------------------------------------
🔸 Endpoint Name: List Organization Invites
🔸 Method: `GET`
🔸 URL: `<INSERT_BASE_URL>/api/v1/invites`

🔸 Description:
Returns pending invites for the current organization.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager with `INVITE_USER`

🔸 Headers:
- `Authorization: Bearer <token>`

🔸 Request Parameters:

📍 Path Params:
- None

📍 Query Params:
- None

📍 Body:
```json
{}
```

🔸 Sample Request:
```json
{}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Invitations retrieved successfully.",
  "data": [
    {
      "_id": "680000000000000000001001",
      "email": "member@example.com",
      "role": "MEMBER",
      "status": "PENDING"
    }
  ]
}
```

🔸 Error Responses:
- `401` → unauthorized
- `403` → permission denied
- `500` → server error

🔸 Business Logic:
Fetches pending invites by organization id.

🔸 Side Effects:
- None

🔸 Frontend Usage Notes:
There is no pagination, so render carefully for large orgs.

--------------------------------------------
🔸 Endpoint Name: Send Invite
🔸 Method: `POST`
🔸 URL: `<INSERT_BASE_URL>/api/v1/invites`

🔸 Description:
Creates an invite and attempts to send invite email.

🔸 Access Level:
- Protected
- Roles Allowed: Super Admin, Admin, Manager with `INVITE_USER`

🔸 Headers:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

🔸 Request Parameters:

📍 Path Params:
- None

📍 Query Params:
- None

📍 Body:
```json
{
  "email": "string (required) -> invitee email",
  "role": "string (required) -> ADMIN|MANAGER|MEMBER"
}
```

🔸 Sample Request:
```json
{
  "email": "member@example.com",
  "role": "MEMBER"
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Invitation sent successfully.",
  "data": {
    "_id": "680000000000000000001001",
    "email": "member@example.com",
    "role": "MEMBER",
    "token": "b3fa0beef4d5c45df8ff..."
  }
}
```

🔸 Error Responses:
- `400` → already a member or invite already pending
- `401` → unauthorized
- `403` → permission denied
- `404` → organization not found
- `409` → duplicate invite at DB level
- `500` → server or email error

🔸 Business Logic:
Checks membership, blocks duplicate pending invite, creates invite token and record, builds invite URL, then sends email.

🔸 Side Effects:
- Creates `Invite`
- Sends email through Nodemailer

🔸 Frontend Usage Notes:
Treat success as “invite stored” rather than guaranteed email deliverability.

--------------------------------------------
🔸 Endpoint Name: Accept Invite
🔸 Method: `POST`
🔸 URL: `<INSERT_BASE_URL>/api/v1/invites/accept`

🔸 Description:
Accepts a pending invite for the current authenticated user.

🔸 Access Level:
- Protected
- Roles Allowed: authenticated recipient

🔸 Headers:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

🔸 Request Parameters:

📍 Path Params:
- None

📍 Query Params:
- None

📍 Body:
```json
{
  "token": "string (required) -> invite token"
}
```

🔸 Sample Request:
```json
{
  "token": "b3fa0beef4d5c45df8ff..."
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Invitation accepted successfully.",
  "data": {
    "organizationId": "680000000000000000000101"
  }
}
```

🔸 Error Responses:
- `401` → unauthorized
- `404` → invalid invite
- `400` → invite expired
- `422` → membership validation failure
- `500` → server error

🔸 Business Logic:
Validates invite token and expiry, creates organization membership, then marks invite as accepted.

🔸 Side Effects:
- Creates `OrganizationMember`
- Updates `Invite`

🔸 Frontend Usage Notes:
Refresh auth/session immediately after acceptance. Current role constants do not fully support `MANAGER` and `MEMBER`.

--------------------------------------------

==============================
📌 MODULE: BILLING
==============================

🔹 Description:
Stripe checkout initiation, subscription retrieval, and webhook processing.

--------------------------------------------

🔹 Endpoints:

--------------------------------------------
🔸 Endpoint Name: Stripe Webhook
🔸 Method: `POST`
🔸 URL: `<INSERT_BASE_URL>/api/v1/billing/webhook`

🔸 Description:
Receives Stripe events and synchronizes subscription state.

🔸 Access Level:
- Public but signature protected
- Roles Allowed: Stripe only

🔸 Headers:
- `stripe-signature: <signature>`
- `Content-Type: application/json`

🔸 Request Parameters:

📍 Path Params:
- None

📍 Query Params:
- None

📍 Body:
```json
{
  "type": "customer.subscription.updated",
  "data": {
    "object": {
      "id": "sub_123",
      "customer": "cus_123",
      "status": "active",
      "current_period_end": 1776124800,
      "cancel_at_period_end": false,
      "metadata": {
        "organizationId": "680000000000000000000101"
      }
    }
  }
}
```

🔸 Sample Request:
```json
{
  "type": "customer.subscription.updated"
}
```

🔸 Success Response:
```json
{
  "received": true
}
```

🔸 Error Responses:
- `400` → invalid Stripe signature
- `500` → webhook processing failure

🔸 Business Logic:
Validates webhook signature, switches by event type, and upserts or updates subscription rows.

🔸 Side Effects:
- Creates or updates `Subscription`

🔸 Frontend Usage Notes:
Never call this directly from the frontend.

--------------------------------------------
🔸 Endpoint Name: Get Subscription
🔸 Method: `GET`
🔸 URL: `<INSERT_BASE_URL>/api/v1/billing`

🔸 Description:
Returns current organization subscription data.

🔸 Access Level:
- Protected
- Roles Allowed: Admin, Manager

🔸 Headers:
- `Authorization: Bearer <token>`

🔸 Request Parameters:

📍 Path Params:
- None

📍 Query Params:
- None

📍 Body:
```json
{}
```

🔸 Sample Request:
```json
{}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Subscription details retrieved.",
  "data": {
    "organizationId": "680000000000000000000101",
    "tier": "PRO",
    "status": "ACTIVE",
    "cancelAtPeriodEnd": false
  }
}
```

🔸 Error Responses:
- `401` → unauthorized
- `403` → permission denied
- `500` → server error

🔸 Business Logic:
Finds one subscription row by organization.

🔸 Side Effects:
- None

🔸 Frontend Usage Notes:
Relies on org context that REST auth middleware does not currently provide.

--------------------------------------------
🔸 Endpoint Name: Create Checkout Session
🔸 Method: `POST`
🔸 URL: `<INSERT_BASE_URL>/api/v1/billing/checkout`

🔸 Description:
Creates Stripe Checkout session URL for subscription purchase or upgrade.

🔸 Access Level:
- Protected
- Roles Allowed: Admin, Manager with `MANAGE_WORKSPACE`

🔸 Headers:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

🔸 Request Parameters:

📍 Path Params:
- None

📍 Query Params:
- None

📍 Body:
```json
{
  "priceId": "string (required) -> Stripe recurring price id"
}
```

🔸 Sample Request:
```json
{
  "priceId": "price_1QExampleProMonthly"
}
```

🔸 Success Response:
```json
{
  "success": true,
  "message": "Checkout session created.",
  "data": {
    "url": "https://checkout.stripe.com/c/pay/cs_test_123"
  }
}
```

🔸 Error Responses:
- `401` → unauthorized
- `403` → permission denied
- `500` → Stripe or server error

🔸 Business Logic:
Finds or creates Stripe customer, then creates checkout session with organization metadata.

🔸 Side Effects:
- May create/update `Subscription`
- May create Stripe customer
- Creates Stripe checkout session

🔸 Frontend Usage Notes:
Two backend caveats currently affect this route:
- billing routes are mounted before `express.json`, so body parsing is unreliable
- controller reads `req.user.email`, but REST auth middleware only attaches `id` and `role`

--------------------------------------------
