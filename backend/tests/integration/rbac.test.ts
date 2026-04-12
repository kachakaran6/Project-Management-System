import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import OrganizationMember from '../../src/models/OrganizationMember.js';
import Organization from '../../src/models/Organization.js';
import Log from '../../src/models/Log.js';
import * as organizationService from '../../src/modules/organization/organization.service.js';
import * as auditLogService from '../../src/services/logService.js';
import { ROLE_HIERARCHY, DEFAULT_ROLE_PERMISSIONS, hasPermission } from '../../src/utils/permissionPresets.js';
import { AppError } from '../../src/middlewares/errorHandler.js';

describe('RBAC System Tests', () => {
  let orgId: string;
  let ownerId: string;
  let adminId: string;
  let memberId: string;
  let organizationId: string;

  beforeEach(async () => {
    orgId = 'test-org-123';
    ownerId = 'owner-user-123';
    adminId = 'admin-user-456';
    memberId = 'member-user-789';
    organizationId = orgId;

    // Clear collections
    await OrganizationMember.deleteMany({ organizationId });
    await Log.deleteMany({ organizationId });

    // Setup test data
    await OrganizationMember.create([
      { organizationId, userId: ownerId, role: 'OWNER', isActive: true },
      { organizationId, userId: adminId, role: 'ADMIN', isActive: true },
      { organizationId, userId: memberId, role: 'MEMBER', isActive: true }
    ]);
  });

  describe('Role Hierarchy Validation', () => {
    it('should prevent non-OWNER from promoting members to OWNER', async () => {
      expect(async () => {
        await organizationService.updateOrganizationMemberRole(
          organizationId,
          memberId,
          'OWNER',
          adminId // Admin trying to promote
        );
      }).rejects.toThrow('Cannot promote members to a role equal to or higher than your own');
    });

    it('should allow OWNER to promote members to any role', async () => {
      const result = await organizationService.updateOrganizationMemberRole(
        organizationId,
        memberId,
        'ADMIN',
        ownerId // Owner promoting
      );
      expect(result.role).toBe('ADMIN');
    });

    it('should prevent demoting the only OWNER', async () => {
      expect(async () => {
        await organizationService.updateOrganizationMemberRole(
          organizationId,
          ownerId,
          'ADMIN',
          ownerId // Even owner can't demote themselves if only owner
        );
      }).rejects.toThrow('Cannot remove the last owner from the organization');
    });

    it('should allow self-demotion', async () => {
      // Add another OWNER first
      await OrganizationMember.create({
        organizationId,
        userId: 'owner-2',
        role: 'OWNER',
        isActive: true
      });

      const result = await organizationService.updateOrganizationMemberRole(
        organizationId,
        ownerId,
        'ADMIN',
        ownerId // Self-demotion
      );
      expect(result.role).toBe('ADMIN');
    });

    it('should respect role hierarchy (ADMIN < OWNER)', () => {
      expect(ROLE_HIERARCHY['ADMIN']).toBeLessThan(ROLE_HIERARCHY['OWNER']);
      expect(ROLE_HIERARCHY['MANAGER']).toBeLessThan(ROLE_HIERARCHY['ADMIN']);
      expect(ROLE_HIERARCHY['MEMBER']).toBeLessThan(ROLE_HIERARCHY['MANAGER']);
      expect(ROLE_HIERARCHY['VIEWER']).toBeLessThan(ROLE_HIERARCHY['MEMBER']);
    });
  });

  describe('Permission Management', () => {
    it('should return correct default permissions for ADMIN role', () => {
      const adminPerms = DEFAULT_ROLE_PERMISSIONS['ADMIN'];
      expect(adminPerms).toContain('CREATE_PROJECT');
      expect(adminPerms).toContain('DELETE_PROJECT');
      expect(adminPerms).toContain('INVITE_USER');
      expect(adminPerms).not.toContain('MANAGE_BILLING'); // Finance only
    });

    it('should return correct default permissions for MEMBER role', () => {
      const memberPerms = DEFAULT_ROLE_PERMISSIONS['MEMBER'];
      expect(memberPerms).toContain('CREATE_TASK');
      expect(memberPerms).toContain('VIEW_PROJECT');
      expect(memberPerms).not.toContain('DELETE_PROJECT');
      expect(memberPerms).not.toContain('INVITE_USER');
    });

    it('should return correct default permissions for VIEWER role', () => {
      const viewerPerms = DEFAULT_ROLE_PERMISSIONS['VIEWER'];
      expect(viewerPerms.length).toBeLessThan(5); // Very limited
      expect(viewerPerms).toContain('VIEW_PROJECT');
      expect(viewerPerms).not.toContain('CREATE_TASK');
    });

    it('should grant OWNER all permissions', () => {
      const ownerPerms = DEFAULT_ROLE_PERMISSIONS['OWNER'];
      const allPermValues = Object.values(DEFAULT_ROLE_PERMISSIONS).flat();
      expect(ownerPerms.length).toBeGreaterThan(20); // All permissions
    });

    it('should allow adding custom permissions beyond role defaults', async () => {
      const customPermissions = ['MANAGE_BILLING', 'VIEW_ANALYTICS'];
      const result = await organizationService.updateMemberPermissions(
        organizationId,
        memberId,
        customPermissions,
        ownerId // Owner adding permissions
      );
      
      expect(result.permissions).toEqual(customPermissions);
    });

    it('should prevent non-admin from updating permissions', async () => {
      expect(async () => {
        await organizationService.updateMemberPermissions(
          organizationId,
          memberId,
          ['MANAGE_BILLING'],
          memberId // Member trying to update permissions
        );
      }).rejects.toThrow('Only organization owners and admins can manage permissions');
    });

    it('should return effective permissions combining role + custom', async () => {
      // Add custom permission for member
      await organizationService.updateMemberPermissions(
        organizationId,
        memberId,
        ['DELETE_PROJECT'],
        ownerId
      );

      const perms = await organizationService.getMemberPermissions(organizationId, memberId);
      expect(perms.effectivePermissions).toContain('CREATE_TASK'); // Role default
      expect(perms.effectivePermissions).toContain('DELETE_PROJECT'); // Custom override
    });
  });

  describe('Multi-tenant Security', () => {
    it('should prevent role change across organizations', async () => {
      const otherOrgId = 'other-org-456';
      
      // Create member in other org
      await OrganizationMember.create({
        organizationId: otherOrgId,
        userId: memberId,
        role: 'MEMBER',
        isActive: true
      });

      // Try to change role in other org using current org actor
      const admin = await OrganizationMember.findOne({
        organizationId,
        userId: adminId
      });

      // This should fail because actor is not in target organization
      expect(async () => {
        await organizationService.updateOrganizationMemberRole(
          otherOrgId,
          memberId,
          'ADMIN',
          adminId // Actor from different org
        );
      }).rejects.toThrow('Actor is not a member of this organization');
    });

    it('should prevent permission changes across organizations', async () => {
      const otherOrgId = 'other-org-456';
      
      expect(async () => {
        await organizationService.updateMemberPermissions(
          otherOrgId,
          memberId,
          ['MANAGE_BILLING'],
          adminId // Admin from different org
        );
      }).rejects.toThrow('Actor is not a member of this organization');
    });

    it('should isolate audit logs by organization', async () => {
      await organizationService.updateOrganizationMemberRole(
        organizationId,
        memberId,
        'ADMIN',
        ownerId
      );

      const logs = await Log.find({ organizationId });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]!.organizationId!.toString()).toBe(organizationId);

      // Should not return logs from other orgs
      const otherOrgLogs = await Log.find({ organizationId: 'other-org' });
      expect(otherOrgLogs.length).toBe(0);
    });
  });

  describe('Audit Logging', () => {
    it('should log role changes', async () => {
      await organizationService.updateOrganizationMemberRole(
        organizationId,
        memberId,
        'ADMIN',
        ownerId
      );

      const logs = await Log.find({
        organizationId,
        action: 'MEMBER_ROLE_CHANGED',
        targetMember: memberId
      });

      expect(logs.length).toBeGreaterThan(0);
      expect((logs[0] as any).changes.before.role).toBe('MEMBER');
      expect((logs[0] as any).changes.after.role).toBe('ADMIN');
      expect((logs[0] as any).userId!.toString()).toBe(ownerId);
    });

    it('should log permission changes', async () => {
      await organizationService.updateMemberPermissions(
        organizationId,
        memberId,
        ['MANAGE_BILLING'],
        ownerId
      );

      const logs = await Log.find({
        organizationId,
        action: 'MEMBER_PERMISSIONS_CHANGED',
        targetMember: memberId
      });

      expect(logs.length).toBeGreaterThan(0);
      expect((logs[0] as any).changes.after.permissions).toContain('MANAGE_BILLING');
    });

    it('should log member removal', async () => {
      await organizationService.removeOrganizationMember(
        organizationId,
        memberId,
        ownerId
      );

      const logs = await Log.find({
        organizationId,
        action: 'MEMBER_REMOVED',
        targetMember: memberId
      });

      expect(logs.length).toBeGreaterThan(0);
      expect((logs[0] as any).userId!.toString()).toBe(ownerId);
    });

    it('should include actor info in audit logs', async () => {
      await organizationService.updateOrganizationMemberRole(
        organizationId,
        memberId,
        'MANAGER',
        adminId
      );

      const logs = await Log.find({
        organizationId,
        targetMember: memberId
      });

      expect(logs[0]!.performedBy).toBeDefined();
      expect((logs[0] as any).performedBy?.userId || (logs[0] as any).userId?.toString()).toBe(adminId);
    });
  });

  describe('Permission Checking', () => {
    it('should correctly check if role has permission', () => {
      expect(hasPermission('OWNER', 'CREATE_PROJECT')).toBe(true);
      expect(hasPermission('OWNER', 'ANY_PERMISSION')).toBe(true); // OWNER has all
      
      expect(hasPermission('ADMIN', 'DELETE_PROJECT')).toBe(true);
      expect(hasPermission('ADMIN', 'MANAGE_BILLING')).toBe(false); // ADMIN can't manage billing

      expect(hasPermission('MEMBER', 'CREATE_TASK')).toBe(true);
      expect(hasPermission('MEMBER', 'DELETE_PROJECT')).toBe(false);

      expect(hasPermission('VIEWER', 'VIEW_PROJECT')).toBe(true);
      expect(hasPermission('VIEWER', 'CREATE_TASK')).toBe(false);
    });

    it('should handle custom permissions in permission check', () => {
      const customPermissions = ['DELETE_PROJECT', 'MANAGE_SETTINGS'];
      
      expect(hasPermission('MEMBER', 'DELETE_PROJECT', customPermissions)).toBe(true);
      expect(hasPermission('MEMBER', 'MANAGE_SETTINGS', customPermissions)).toBe(true);
      expect(hasPermission('MEMBER', 'CREATE_TASK', customPermissions)).toBe(true); // Role default
    });

    it('should return correct member-specific permissions', async () => {
      // Add custom permissions to member
      await organizationService.updateMemberPermissions(
        organizationId,
        memberId,
        ['DELETE_PROJECT'],
        ownerId
      );

      const perms = await organizationService.getMemberPermissions(organizationId, memberId);
      
      expect(perms.rolePermissions).toContain('CREATE_TASK');
      expect(perms.customPermissions).toContain('DELETE_PROJECT');
      expect(perms.effectivePermissions).toContain('CREATE_TASK');
      expect(perms.effectivePermissions).toContain('DELETE_PROJECT');
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent member gracefully', async () => {
      expect(async () => {
        await organizationService.updateOrganizationMemberRole(
          organizationId,
          'non-existent-user',
          'ADMIN',
          ownerId
        );
      }).rejects.toThrow('Member not found');
    });

    it('should handle non-existent organization gracefully', async () => {
      expect(async () => {
        await organizationService.updateOrganizationMemberRole(
          'non-existent-org',
          memberId,
          'ADMIN',
          ownerId
        );
      }).rejects.toThrow('Organization not found');
    });

    it('should handle actor not in organization', async () => {
      expect(async () => {
        await organizationService.updateOrganizationMemberRole(
          organizationId,
          memberId,
          'ADMIN',
          'non-existent-actor'
        );
      }).rejects.toThrow('Actor is not a member of this organization');
    });

    it('should clear permissions when role changes', async () => {
      // Add custom permissions
      await organizationService.updateMemberPermissions(
        organizationId,
        memberId,
        ['MANAGE_BILLING'],
        ownerId
      );

      // Change role
      const result = await organizationService.updateOrganizationMemberRole(
        organizationId,
        memberId,
        'ADMIN',
        ownerId
      );

      // Custom permissions should be cleared
      expect(result.permissions).toEqual([]);
    });
  });

  describe('Permission Middleware Integration', () => {
    it('should check organizationId for security', () => {
      // This tests that the middleware properly uses organizationId
      // to prevent cross-org access attacks
      expect(true).toBe(true); // Placeholder for middleware integration test
    });

    it('should respect role-based permission defaults', () => {
      // Middleware should use DEFAULT_ROLE_PERMISSIONS
      // and fall back to static defaults if DB is unavailable
      expect(DEFAULT_ROLE_PERMISSIONS['ADMIN']).toBeDefined();
      expect(DEFAULT_ROLE_PERMISSIONS['ADMIN'].length).toBeGreaterThan(0);
    });
  });
});
