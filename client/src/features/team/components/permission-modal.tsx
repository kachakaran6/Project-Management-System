"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { teamApi, type MemberPermissionsResponse, type TeamRole } from "@/features/team/api/team.api";
import { PERMISSIONS } from "@/lib/constants/permissions";

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
  memberRole: TeamRole;
  onPermissionsUpdated?: () => void;
}

// Group permissions by category for better UI organization
const PERMISSION_GROUPS = {
  "Projects": [
    PERMISSIONS.CREATE_PROJECT,
    PERMISSIONS.VIEW_PROJECT,
    PERMISSIONS.EDIT_PROJECT,
    PERMISSIONS.DELETE_PROJECT,
  ],
  "Tasks": [
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.VIEW_TASK,
    PERMISSIONS.EDIT_TASK,
    PERMISSIONS.DELETE_TASK,
    PERMISSIONS.MOVE_TASK,
  ],
  "Comments": [
    PERMISSIONS.CREATE_COMMENT,
    PERMISSIONS.EDIT_COMMENT,
    PERMISSIONS.DELETE_COMMENT,
  ],
  "Members": [
    PERMISSIONS.INVITE_USER,
    PERMISSIONS.MANAGE_MEMBERS,
    PERMISSIONS.REMOVE_MEMBER,
    PERMISSIONS.CHANGE_MEMBER_ROLE,
  ],
  "Pages": [
    PERMISSIONS.CREATE_PAGE,
    PERMISSIONS.VIEW_PAGE,
    PERMISSIONS.EDIT_PAGE,
    PERMISSIONS.DELETE_PAGE,
    PERMISSIONS.VIEW_PRIVATE_PAGE,
  ],
  "Organization": [
    PERMISSIONS.MANAGE_WORKSPACE,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.MANAGE_BILLING,
  ],
};

// Human-readable permission labels
const PERMISSION_LABELS: Record<string, string> = {
  [PERMISSIONS.CREATE_PROJECT]: "Create Projects",
  [PERMISSIONS.VIEW_PROJECT]: "View Projects",
  [PERMISSIONS.EDIT_PROJECT]: "Edit Projects",
  [PERMISSIONS.DELETE_PROJECT]: "Delete Projects",
  [PERMISSIONS.CREATE_TASK]: "Create Tasks",
  [PERMISSIONS.VIEW_TASK]: "View Tasks",
  [PERMISSIONS.EDIT_TASK]: "Edit Tasks",
  [PERMISSIONS.DELETE_TASK]: "Delete Tasks",
  [PERMISSIONS.MOVE_TASK]: "Move Tasks",
  [PERMISSIONS.CREATE_COMMENT]: "Create Comments",
  [PERMISSIONS.EDIT_COMMENT]: "Edit/Delete Own Comments",
  [PERMISSIONS.DELETE_COMMENT]: "Delete Any Comments",
  [PERMISSIONS.INVITE_USER]: "Invite Members",
  [PERMISSIONS.MANAGE_MEMBERS]: "Manage Members",
  [PERMISSIONS.REMOVE_MEMBER]: "Remove Members",
  [PERMISSIONS.CHANGE_MEMBER_ROLE]: "Change Member Roles",
  [PERMISSIONS.CREATE_PAGE]: "Create Pages",
  [PERMISSIONS.VIEW_PAGE]: "View Pages",
  [PERMISSIONS.EDIT_PAGE]: "Edit Pages",
  [PERMISSIONS.DELETE_PAGE]: "Delete Pages",
  [PERMISSIONS.VIEW_PRIVATE_PAGE]: "View Private Pages",
  [PERMISSIONS.MANAGE_WORKSPACE]: "Manage Workspace",
  [PERMISSIONS.MANAGE_SETTINGS]: "Manage Settings",
  [PERMISSIONS.VIEW_ANALYTICS]: "View Analytics",
  [PERMISSIONS.MANAGE_BILLING]: "Manage Billing",
};

/**
 * PermissionModal - Manage granular permissions for organization members
 * Shows role defaults and allows adding/removing custom permission overrides
 */
export function PermissionModal({
  isOpen,
  onClose,
  memberId,
  memberName,
  memberRole,
  onPermissionsUpdated
}: PermissionModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionData, setPermissionData] = useState<MemberPermissionsResponse | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [customPermissions, setCustomPermissions] = useState<Set<string>>(new Set());
  const [activeGroup, setActiveGroup] = useState("Projects");

  // Load member permissions on modal open
  useEffect(() => {
    if (isOpen && memberId) {
      loadPermissions();
    }
  }, [isOpen, memberId]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await teamApi.getMemberPermissions(memberId);
      setPermissionData(data);
      setSelectedPermissions(new Set(data.effectivePermissions));
      setCustomPermissions(new Set(data.customPermissions));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load permissions';
      setError(message);
      console.error('Failed to load permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (permission: string) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permission)) {
      newSelected.delete(permission);
    } else {
      newSelected.add(permission);
    }
    setSelectedPermissions(newSelected);
  };

  const handleSave = async () => {
    if (!permissionData) return;

    try {
      setSaving(true);
      setError(null);
      
      // Calculate which permissions to send as custom overrides
      // (permissions that are beyond the role defaults)
      const rolePerms = new Set(permissionData.rolePermissions);
      const overrides = Array.from(selectedPermissions).filter(
        p => !rolePerms.has(p)
      );

      await teamApi.updateMemberPermissions(memberId, overrides);
      
      onPermissionsUpdated?.();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save permissions';
      setError(message);
      console.error('Failed to save permissions:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToRoleDefaults = () => {
    if (permissionData) {
      setSelectedPermissions(new Set(permissionData.rolePermissions));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Permissions</DialogTitle>
          <DialogDescription>
            {memberName} • {memberRole}{" "}
            {customPermissions.size > 0 && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {customPermissions.size} custom override{customPermissions.size !== 1 ? 's' : ''}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="text-center text-gray-500">Loading permissions...</div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : permissionData ? (
          <div className="space-y-4">
            {/* Info section */}
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-900">
                <strong>Role defaults:</strong> {permissionData.rolePermissions.length} permissions
                <p className="text-xs mt-1 text-blue-800">
                  You can grant additional permissions beyond the {memberRole} role defaults.
                </p>
              </AlertDescription>
            </Alert>

            {/* Group tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {Object.keys(PERMISSION_GROUPS).map((group) => (
                <button
                  key={group}
                  onClick={() => setActiveGroup(group)}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    activeGroup === group
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>

            {/* Permission list for active group */}
            <div className="space-y-3 border rounded-lg p-4 bg-white">
              <h3 className="font-semibold text-sm">{activeGroup}</h3>
              {PERMISSION_GROUPS[activeGroup as keyof typeof PERMISSION_GROUPS]?.map((permission) => {
                const isRoleDefault = permissionData.rolePermissions.includes(permission);
                const isCustom = customPermissions.has(permission);
                const isSelected = selectedPermissions.has(permission);

                return (
                  <div
                    key={permission}
                    className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50"
                  >
                    <Checkbox
                      id={permission}
                      checked={isSelected}
                      onCheckedChange={() => handlePermissionToggle(permission)}
                      disabled={isRoleDefault && !isCustom}
                    />
                    <label
                      htmlFor={permission}
                      className="flex-1 cursor-pointer flex items-center justify-between text-sm"
                    >
                      <span>{PERMISSION_LABELS[permission]}</span>
                      {isRoleDefault && (
                        <span className="text-xs text-gray-500 ml-2">
                          {isCustom ? "(custom)" : "(default)"}
                        </span>
                      )}
                    </label>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-3 text-sm border border-gray-200">
              <p>
                <strong>Total permissions:</strong> {selectedPermissions.size}
              </p>
              {customPermissions.size > 0 && (
                <button
                  onClick={handleResetToRoleDefaults}
                  className="text-xs text-blue-600 hover:text-blue-800 underline mt-2"
                >
                  Reset to {memberRole} defaults
                </button>
              )}
            </div>
          </div>
        ) : null}

        {/* Action buttons */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving || loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

