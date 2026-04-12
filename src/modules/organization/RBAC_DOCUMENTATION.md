# Role-Based Access Control (RBAC) System Documentation

## Overview

This document describes the production-ready RBAC system implemented for the Project Management System. The system provides granular, multi-tenant access control with role hierarchy, custom permission overrides, and comprehensive audit logging.

## Architecture

### Core Components

#### 1. **Role Hierarchy**

Roles are organized in a strict hierarchy from highest to lowest privilege:
- **OWNER** (Level 100) - Complete control over the organization
- **ADMIN** (Level 90) - Nearly all permissions except finance/billing
- **MANAGER** (Level 70) - Project and task management control
- **MEMBER** (Level 50) - Task-level access and collaboration
- **VIEWER** (Level 10) - Read-only access

```typescript
const ROLE_HIERARCHY = {
  OWNER: 100,
  ADMIN: 90,
  MANAGER: 70,
  MEMBER: 50,
  VIEWER: 10,
};
```

#### 2. **Permission Model**

Permissions are granular and organized by category:

```
Projects: CREATE_PROJECT, VIEW_PROJECT, EDIT_PROJECT, DELETE_PROJECT
Tasks: CREATE_TASK, VIEW_TASK, EDIT_TASK, DELETE_TASK, MOVE_TASK
Comments: CREATE_COMMENT, EDIT_COMMENT, DELETE_COMMENT
Members: INVITE_USER, MANAGE_MEMBERS, REMOVE_MEMBER, CHANGE_MEMBER_ROLE
Pages: CREATE_PAGE, VIEW_PAGE, EDIT_PAGE, DELETE_PAGE, VIEW_PRIVATE_PAGE
Organization: MANAGE_WORKSPACE, MANAGE_SETTINGS, VIEW_ANALYTICS, MANAGE_BILLING
```

#### 3. **Permission Resolution**

The system determines effective permissions in this order:
1. **OWNER role** → All permissions granted
2. **Custom overrides** → Additional permissions beyond role defaults
3. **Role defaults** → Base permissions for the role
4. **Static fallback** → If database unavailable

```typescript
effectivePermissions = [
  ...rolePermissions,      // Base role permissions
  ...customPermissions     // Custom overrides
]
```

### Data Model

#### OrganizationMember Schema

```typescript
{
  organizationId: ObjectId,      // Multi-tenant isolation
  userId: ObjectId,              // User reference
  role: String,                  // OWNER, ADMIN, MANAGER, MEMBER, VIEWER
  permissions: [String],         // Custom permission overrides
  permissionsLastUpdated: Date,  // Audit trail
  permissionsUpdatedBy: ObjectId, // Who made the change
  joinedAt: Date,
  isActive: Boolean
}
```

#### AuditLog Schema

```typescript
{
  organizationId: ObjectId,
  performedBy: ObjectId,
  action: String,                // MEMBER_ROLE_CHANGED, MEMBER_PERMISSIONS_CHANGED, etc.
  targetMember: ObjectId,
  changes: {
    before: { role, permissions },
    after: { role, permissions }
  },
  reason: String,
  metadata: Mixed,
  createdAt: Date
}
```

## Multi-Tenant Security

### Critical Security Features

1. **Organization Isolation**
   - All operations validate `organizationId`
   - Users can only access members in their organization
   - Permissions are org-specific

2. **Role Hierarchy Enforcement**
   - Non-OWNER cannot promote members above their own level
   - Cannot demote sole OWNER
   - Self-demotion is allowed

3. **Permission Middleware**
   - Checks both role defaults and custom overrides
   - Falls back to static defaults if DB unavailable
   - Prevents unauthorized access at entry point

4. **Audit Trail**
   - All role changes logged
   - All permission updates logged
   - Track WHO changed WHAT and WHEN

## API Endpoints

### Get Organization Members
```
GET /api/v1/organizations/members
Response: { members: [], invites: [] }
```

### Change Member Role
```
PATCH /api/v1/organizations/:orgId/member/:userId
Body: { role: "ADMIN" }
```

### Get Member Permissions
```
GET /api/v1/organizations/:orgId/members/:userId/permissions
Response: {
  role: "ADMIN",
  rolePermissions: [...],      // Default for role
  customPermissions: [...],    // Overrides
  effectivePermissions: [...]  // Combined
}
```

### Update Member Permissions
```
PATCH /api/v1/organizations/:orgId/members/:userId/permissions
Body: { permissions: ["MANAGE_BILLING", "VIEW_ANALYTICS"] }
```

### Get Role Permissions
```
GET /api/v1/organizations/:orgId/roles/:role/permissions
Response: { role: "ADMIN", permissions: [...] }
```

### Remove Member
```
DELETE /api/v1/organizations/:orgId/member/:userId
```

## Permission Middleware

### Usage

```typescript
import { requirePermission } from '@/middlewares/permission.middleware';

router.delete('/projects/:id', 
  requirePermission(PERMISSIONS.DELETE_PROJECT),
  deleteProjectController
);
```

### How It Works

1. Extract user role and organizationId from request
2. Look up member in OrganizationMember collection
3. Combine role defaults + custom permissions
4. Check if required permission exists in effective set
5. Allow/deny based on result

## Frontend Integration

### Permission Modal Component

```typescript
<PermissionModal
  isOpen={isOpen}
  onClose={onClose}
  memberId={memberId}
  memberName="John Doe"
  memberRole="ADMIN"
  onPermissionsUpdated={onUpdate}
/>
```

### Team Page Integration

- Role dropdown for role changes
- "Manage Permissions" button opens permission modal
- Real-time updates via socket events

## Audit Logging

### Logged Events

- `MEMBER_ROLE_CHANGED` - Role assignment/change
- `MEMBER_PERMISSIONS_CHANGED` - Permission override modification
- `MEMBER_INVITED` - New member invited
- `MEMBER_REMOVED` - Member removed from org

### Retrieving Logs

```typescript
// Get org-wide audit logs
const logs = await getOrganizationAuditLogs(organizationId);

// Get member-specific logs
const memberLogs = await getMemberAuditLogs(organizationId, memberId);
```

## Real-time Updates

The system emits socket events for real-time permission updates:

```typescript
// Role change event
io.to(`org:${organizationId}`).emit('member_role_changed', {
  memberId,
  oldRole,
  newRole,
  changedBy: actorId,
  timestamp: ISO8601
});

// Permission update event
io.to(`org:${organizationId}`).emit('permissions_updated', {
  memberId,
  permissions: [],
  changedBy: actorId,
  timestamp: ISO8601
});

// Member removed event
io.to(`org:${organizationId}`).emit('member_removed', {
  memberId,
  removedBy: actorId,
  timestamp: ISO8601
});
```

## Best Practices

### For Developers

1. **Always check organizationId**
   ```typescript
   const member = await OrganizationMember.findOne({
     organizationId,  // CRITICAL: Include org check
     userId,
     isActive: true
   });
   ```

2. **Use permission middleware**
   ```typescript
   // Do this
   router.delete('/projects/:id', 
     requirePermission(PERMISSIONS.DELETE_PROJECT),
     handler
   );
   
   // Not this
   router.delete('/projects/:id', handler); // No permission check!
   ```

3. **Log sensitive operations**
   ```typescript
   await logAuditEvent({
     organizationId,
     performedBy: userId,
     action: 'MEMBER_ROLE_CHANGED',
     targetMember: targetUserId,
     changes: { before, after }
   });
   ```

### For Administrators

1. **Default Permissions**
   - OWNER: Full access
   - ADMIN: Everything except billing/analytics
   - MANAGER: Project and team management
   - MEMBER: Work with assigned tasks
   - VIEWER: Read-only

2. **Custom Overrides**
   - Rarely needed if roles fit use case
   - Use "Manage Permissions" UI to add
   - Document why custom permissions exist

3. **Audit Trail**
   - Review logs regularly
   - Audit logs are immutable
   - Contact support for log retention queries

## Testing

Run comprehensive RBAC tests:

```bash
npm test -- tests/integration/rbac.test.ts
```

Test coverage includes:
- Role hierarchy validation
- Permission resolution
- Multi-tenant security
- Audit logging
- Edge cases

## Migration from Old System

If upgrading from simple roles to this system:

1. **Map Old Roles to New**
   ```
   SUPER_ADMIN → OWNER/ADMIN
   ADMIN → ADMIN
   MANAGER → MANAGER
   MEMBER → MEMBER
   ```

2. **Run Migration Script**
   ```typescript
   // Update OrganizationMember documents
   db.organizationmembers.updateMany(
     { role: "SUPER_ADMIN" },
     { $set: { role: "ADMIN", permissions: [] } }
   );
   ```

3. **Test Thoroughly**
   - Run RBAC test suite
   - Check audit logs
   - Verify all endpoints work

## Troubleshooting

### User Can't Access Feature

1. Check Member Record
   ```typescript
   const member = await OrganizationMember.findOne({
     organizationId,
     userId,
     isActive: true
   });
   console.log('Role:', member.role);
   console.log('Custom Perms:', member.permissions);
   ```

2. Check Default Permissions
   ```typescript
   const perms = DEFAULT_ROLE_PERMISSIONS[member.role];
   console.log('Role Permissions:', perms);
   ```

3. Check Effective Permissions
   ```typescript
   const effective = [
     ...rolePerms,
     ...member.permissions
   ];
   console.log('Effective:', effective);
   ```

### Permission Denied Error

1. Verify organizationId matches
2. Check role has permission
3. Review audit logs for recent changes
4. Check for browser cache issues (hard refresh)

## Performance Considerations

- Permission checks are O(1) array lookups
- OrganizationMember queries indexed on (organizationId, userId)
- AuditLog queries indexed on organizationId + action
- Consider caching permission sets for frequently checked permissions

## Compliance & Security

- ✅ Multi-tenant data isolation
- ✅ Complete audit trail
- ✅ Role hierarchy enforcement
- ✅ Permission hierarchy modeling
- ✅ No cross-org access possible
- ✅ All changes audited

## Support & Questions

For questions or issues with RBAC:
1. Check this documentation
2. Review audit logs
3. Run test suite
4. Contact engineering team

---

**Version**: 1.0  
**Last Updated**: 2024  
**Status**: Production Ready
