"use client";

import Link from '@/lib/next-link';
import { useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
import { Activity, CalendarDays, Search } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useOrganizationMembersQuery } from '@/features/organization/hooks/use-organization-members';
import { useActivityLogsQuery } from '@/features/activity-logs/hooks/use-activity-logs';
import { ActivityLogEntry } from '@/features/activity-logs/types/activity-log.types';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;
const ACTION_OPTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'PROJECT_CREATED',
  'PROJECT_UPDATED',
  'PROJECT_DELETED',
  'PAGE_CREATED',
  'PAGE_UPDATED',
  'PAGE_DELETED',
  'TASK_CREATED',
  'TASK_UPDATED',
  'TASK_DELETED',
  'STATUS_CHANGE',
  'ASSIGN',
  'COMMENT',
  'MEMBER_INVITED',
  'MEMBER_ROLE_CHANGED',
  'MEMBER_PERMISSIONS_CHANGED',
  'MEMBER_REMOVED',
  'LOGIN_SUCCESS',
  'LOGIN_FAILURE',
  'REGISTER_SUCCESS',
  'OTP_VERIFIED',
  'USER_APPROVED',
  'USER_ADDED',
  'USER_REMOVED',
];

const ENTITY_OPTIONS = ['TASK', 'PROJECT', 'PAGE', 'TEAM', 'USER', 'WORKSPACE', 'COMMENT', 'ORGANIZATION'];
const ALL_USERS_VALUE = 'ALL_USERS';

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getActorName(log: ActivityLogEntry) {
  const firstName = log.user?.firstName || '';
  const lastName = log.user?.lastName || '';
  const name = `${firstName} ${lastName}`.trim();
  return name || log.user?.email || 'Someone';
}

function getTargetName(log: ActivityLogEntry) {
  const firstName = log.targetUser?.firstName || '';
  const lastName = log.targetUser?.lastName || '';
  const name = `${firstName} ${lastName}`.trim();
  if (name) return name;

  const metadataTargetName = getDisplayValue(log.metadata?.targetName || log.metadata?.memberName || log.metadata?.userName);
  if (metadataTargetName) return metadataTargetName;

  return log.targetUser?.email || '';
}

function getTargetDisplayName(log: ActivityLogEntry) {
  const name = getTargetName(log);
  const targetId = String(log.targetUserId || '');
  const actorId = String(log.userId || '');

  if (!name) {
    return log.targetUser?.email || '';
  }

  const actorName = getActorName(log);
  const sameDisplayName = name === actorName;
  const differentIdentity = targetId && actorId && targetId !== actorId;

  if (sameDisplayName && differentIdentity) {
    return log.targetUser?.email ? `${name} (${log.targetUser.email})` : name;
  }

  return name;
}

function getEntityLabel(log: ActivityLogEntry) {
  const type = String(log.entityType || '').toUpperCase();
  if (type === 'TASK') return 'task';
  if (type === 'PROJECT') return 'project';
  if (type === 'PAGE') return 'page';
  if (type === 'WORKSPACE') return 'workspace';
  if (type === 'COMMENT') return 'comment';
  if (type === 'USER' || type === 'TEAM' || type === 'ORGANIZATION') return 'member';
  return 'item';
}

function getDisplayValue(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    return toTitleCase(trimmed.replace(/_/g, ' '));
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(getDisplayValue).filter(Boolean).join(', ');
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, any>;
    return obj.name || obj.title || obj.label || obj.value || '';
  }

  return String(value);
}

function getReadableEntityName(log: ActivityLogEntry) {
  const candidates = [
    log.metadata?.title,
    log.metadata?.projectName,
    log.metadata?.name,
    log.targetUser?.firstName ? `${log.targetUser.firstName} ${log.targetUser.lastName || ''}`.trim() : '',
    log.entityName,
    log.message,
  ];

  for (const candidate of candidates) {
    const value = getDisplayValue(candidate);
    if (value && !['Task', 'Project', 'Page', 'User', 'Team', 'Organization', 'Comment', 'System'].includes(value)) {
      return value;
    }
  }

  return getDisplayValue(log.entityName) || '';
}

function formatFieldChange(field: string, oldValue: unknown, newValue: unknown) {
  const label = toTitleCase(field.replace(/_/g, ' '));
  const oldText = getDisplayValue(oldValue) || 'None';
  const newText = getDisplayValue(newValue) || 'None';
  return `${label}: ${oldText} → ${newText}`;
}

function formatActivityLog(log: ActivityLogEntry) {
  const action = String(log.action || '').toUpperCase();
  const actor = getActorName(log);
  const entityName = getReadableEntityName(log) ? `"${getReadableEntityName(log)}"` : '';
  const entityLabel = getEntityLabel(log);
  const targetName = getTargetDisplayName(log);
  const isSelfAction = String(log.targetUserId || '') !== '' && String(log.targetUserId) === String(log.userId || '');
  const targetPhrase = isSelfAction ? 'their own' : `${targetName || 'a member'}'s`;

  if (log.metadata?.fieldChanged) {
    const fieldSummary = formatFieldChange(
      String(log.metadata.fieldChanged),
      log.metadata.oldValue,
      log.metadata.newValue,
    );

    if (action.includes('MEMBER_ROLE_CHANGED')) {
      const newRole = getDisplayValue(log.metadata?.newRole || log.metadata?.changes?.after?.role);
      return `${actor} changed ${targetPhrase} role${newRole ? ` to ${newRole}` : ''}. ${fieldSummary}`;
    }

    if (action.includes('MEMBER_PERMISSIONS_CHANGED')) {
      return `${actor} updated ${targetPhrase} permissions. ${fieldSummary}`;
    }

    return `${actor} updated ${entityLabel} ${entityName || ''}. ${fieldSummary}`.trim();
  }

  if (action.includes('CREATE_PROJECT') || action.includes('PROJECT_CREATED') || action === 'CREATE') {
    return `${actor} created project ${entityName || ''}`.trim();
  }

  if (action.includes('UPDATE_PROJECT') || action.includes('PROJECT_UPDATED')) {
    return `${actor} updated project ${entityName || ''}`.trim();
  }

  if (action.includes('DELETE_PROJECT') || action.includes('PROJECT_DELETED')) {
    return `${actor} deleted project ${entityName || ''}`.trim();
  }

  if (action.includes('CREATE_PAGE') || action.includes('PAGE_CREATED')) {
    return `${actor} created page ${entityName || ''}`.trim();
  }

  if (action.includes('UPDATE_PAGE') || action.includes('PAGE_UPDATED')) {
    return `${actor} updated page ${entityName || ''}`.trim();
  }

  if (action.includes('DELETE_PAGE') || action.includes('PAGE_DELETED')) {
    return `${actor} deleted page ${entityName || ''}`.trim();
  }

  if (action.includes('TASK_CREATED')) {
    return `${actor} created task ${entityName || ''}`.trim();
  }

  if (action.includes('TASK_UPDATED') || action === 'UPDATE') {
    return `${actor} updated task ${entityName || ''}`.trim();
  }

  if (action.includes('TASK_DELETED')) {
    return `${actor} deleted task ${entityName || ''}`.trim();
  }

  if (action.includes('STATUS_CHANGE') || action.includes('TASK_STATUS_UPDATED')) {
    const oldValue = getDisplayValue(log.metadata?.oldValue);
    const newValue = getDisplayValue(log.metadata?.newValue);
    if (oldValue && newValue) {
      return `${actor} changed ${entityLabel} status from ${oldValue} to ${newValue}`;
    }
    return `${actor} changed ${entityLabel} status`;
  }

  if (action.includes('ASSIGN') || action.includes('TASK_ASSIGNED')) {
    return `${actor} updated ${entityLabel} assignment ${entityName || ''}`.trim();
  }

  if (action.includes('MEMBER_ROLE_CHANGED')) {
    const newRole = getDisplayValue(log.metadata?.newRole || log.metadata?.changes?.after?.role);
    return `${actor} changed ${targetPhrase} role${newRole ? ` to ${newRole}` : ''}`;
  }

  if (action.includes('MEMBER_PERMISSIONS_CHANGED')) {
    return `${actor} updated ${targetPhrase} permissions`;
  }

  if (action.includes('MEMBER_INVITED') || action.includes('USER_ADDED')) {
    return `${actor} added ${targetName || entityName || 'a member'} to the organization`;
  }

  if (action.includes('MEMBER_REMOVED') || action.includes('USER_REMOVED')) {
    return `${actor} removed ${isSelfAction ? 'themself' : (targetName || entityName || 'a member')} from the organization`;
  }

  if (action.includes('COMMENT')) {
    return `${actor} commented on ${entityLabel} ${entityName || ''}`.trim();
  }

  if (action.includes('USER_APPROVED')) {
    return `${actor} approved a user`;
  }

  if (log.message && log.source === 'legacy') {
    return log.message;
  }

  return `${actor} performed ${toTitleCase(action.replace(/_/g, ' ')).toLowerCase()} on ${entityLabel} ${entityName || ''}`.trim();
}

function getGroupLabel(dateString: string) {
  const date = parseISO(dateString);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return 'Older';
}

function groupLogsByDate(logs: ActivityLogEntry[]) {
  const groups = new Map<string, ActivityLogEntry[]>();

  for (const log of logs) {
    const label = getGroupLabel(log.createdAt);
    const current = groups.get(label) || [];
    current.push(log);
    groups.set(label, current);
  }

  return ['Today', 'Yesterday', 'Older']
    .map((label) => ({
      label,
      items: groups.get(label) || [],
    }))
    .filter((group) => group.items.length > 0);
}

function getEntityHref(log: ActivityLogEntry) {
  const entityType = String(log.entityType || '').toUpperCase();
  const entityId = log.entityId;

  if (!entityId) return null;

  if (entityType === 'TASK') return `/tasks/${entityId}`;
  if (entityType === 'PROJECT') return `/projects/${entityId}`;
  if (entityType === 'PAGE') return `/pages/${entityId}`;
  if (entityType === 'WORKSPACE') return `/settings`;
  if (entityType === 'TEAM' || entityType === 'USER') return `/team`;

  return null;
}

function ActivitySkeletonList() {
  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-0 h-full w-px bg-border/50" />
      <div className="space-y-6">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="relative">
            <div className="absolute -left-5.5 top-2 size-2 rounded-full bg-muted-foreground/30" />
            <div className="space-y-2 pb-4 border-b border-border/50 last:border-b-0">
              <Skeleton className="h-4 w-[55%]" />
              <Skeleton className="h-3 w-[38%]" />
              <Skeleton className="h-3 w-[30%]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatActivityDateTime(dateString: string) {
  return format(new Date(dateString), 'MMM d, yyyy HH:mm');
}

export default function ActivityLogsPage() {
  const { activeOrg, activeOrgId } = useAuth();
  const membersQuery = useOrganizationMembersQuery(activeOrgId || '');

  const members = useMemo(() => {
    return (membersQuery.data?.data.members ?? []).map((member) => ({
      id: String(member.id),
      name: `${member.firstName} ${member.lastName}`.trim() || member.email,
      email: member.email,
      avatarUrl: member.avatarUrl,
      role: member.role,
    }));
  }, [membersQuery.data?.data.members]);

  const [selectedUserId, setSelectedUserId] = useState(ALL_USERS_VALUE);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityTypeFilter, setEntityTypeFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const isAllUsersSelected = selectedUserId === ALL_USERS_VALUE;

  const canViewLogs =
    activeOrg?.role === 'ADMIN' ||
    activeOrg?.role === 'OWNER' ||
    activeOrg?.role === 'SUPER_ADMIN';

  const filters = useMemo(
    () => ({
      userId: isAllUsersSelected ? undefined : selectedUserId,
      query: debouncedSearch || undefined,
      action: actionFilter === 'ALL' ? undefined : actionFilter,
      entityType: entityTypeFilter === 'ALL' ? undefined : entityTypeFilter,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [selectedUserId, isAllUsersSelected, debouncedSearch, actionFilter, entityTypeFilter, startDate, endDate, page],
  );

  const logsQuery = useActivityLogsQuery(filters, canViewLogs);

  const logs = logsQuery.data?.items ?? [];
  const pagination = logsQuery.data?.pagination;
  const groupedLogs = useMemo(() => groupLogsByDate(logs), [logs]);

  useEffect(() => {
    setPage(1);
  }, [selectedUserId, debouncedSearch, actionFilter, entityTypeFilter, startDate, endDate]);

  if (!canViewLogs) {
    return (
      <div className="py-10">
        <EmptyState
          title="Access restricted"
          description="Only admins can access activity logs."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-4 px-4 py-5 md:px-6 overflow-hidden">
      {/* <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Activity Logs
        </h1>
        <p className="text-sm text-muted-foreground">
          Track user actions and changes across the organization.
        </p>
      </div> */}

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-2">
        <Select value={selectedUserId} onValueChange={(value) => setSelectedUserId(value)}>
          <SelectTrigger className="h-10 w-full text-sm sm:w-48">
            <SelectValue placeholder="Select user" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_USERS_VALUE}>All users</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search actions, entities, metadata"
            className="h-10 rounded-xl pl-9 text-sm"
          />
        </div>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="h-10 w-full text-sm sm:w-40">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All actions</SelectItem>
            {ACTION_OPTIONS.map((action) => (
              <SelectItem key={action} value={action}>
                {toTitleCase(action)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
          <SelectTrigger className="h-10 w-full text-sm sm:w-40">
            <SelectValue placeholder="Entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All entities</SelectItem>
            {ENTITY_OPTIONS.map((entity) => (
              <SelectItem key={entity} value={entity}>
                {toTitleCase(entity)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              className="h-10 w-36 pl-7 text-xs"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            className="h-10 w-36 text-xs"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl border border-border/70 bg-background/40 p-4 custom-scrollbar">
        <div className="mb-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>Organization-wide activity timeline filtered by your selected criteria.</p>
          <p>{pagination ? `${pagination.total} total events` : ''}</p>
        </div>

        {logsQuery.isLoading ? <ActivitySkeletonList /> : null}

        {!logsQuery.isLoading && logs.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="Activity will appear here when actions are performed"
            description="Try changing filters or selecting a different date range."
          />
        ) : null}

        {!logsQuery.isLoading && logs.length > 0 ? (
          <div className="relative pl-6">
            <div className="absolute left-2 top-0 h-full w-px bg-border/50" />
            <div className="space-y-6">
              {groupedLogs.map((group) => (
                <section key={group.label} className="space-y-3">
                  <div className="sticky top-2 z-10 inline-flex rounded-full border border-border/70 bg-background/90 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground backdrop-blur">
                    {group.label}
                  </div>
                  <div className="space-y-1">
                    {group.items.map((log) => {
                      const summary = formatActivityLog(log);
                      const entityHref = getEntityHref(log);
                      const relative = formatDistanceToNow(new Date(log.createdAt), {
                        addSuffix: true,
                      });

                      return (
                        <article
                          key={log._id}
                          className={cn(
                            'relative rounded-xl border border-transparent py-3 pr-2 transition-colors duration-200 hover:border-border/50 hover:bg-muted/15',
                            'px-2 -mx-2',
                          )}
                        >
                          <span className="absolute -left-5.5 top-6 size-2 rounded-full bg-muted-foreground/50" />

                          <div className="flex items-start gap-3">
                            <Avatar className="mt-0.5 h-8 w-8 ring-1 ring-border/70">
                              <AvatarImage src={log.user?.avatarUrl} alt={getActorName(log)} />
                              <AvatarFallback className="text-[10px] uppercase">
                                {getActorName(log).charAt(0)}
                              </AvatarFallback>
                            </Avatar>

                            <div className="min-w-0 flex-1 space-y-1.5">
                              <p className="text-sm leading-6 text-foreground/90">{summary}</p>

                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {log.entityName ? (
                                  entityHref ? (
                                    <Link className="text-foreground/80 underline-offset-2 hover:underline" to={entityHref}>
                                      {log.entityName}
                                    </Link>
                                  ) : (
                                    <span className="text-foreground/80">{log.entityName}</span>
                                  )
                                ) : null}

                                {log.targetUser ? (
                                  <>
                                    <span>•</span>
                                    <span>{log.targetUser.firstName} {log.targetUser.lastName}</span>
                                  </>
                                ) : null}

                                {log.projectName || log.metadata?.projectName ? (
                                  <>
                                    <span>•</span>
                                    <span>{String(log.projectName || log.metadata?.projectName)}</span>
                                  </>
                                ) : null}
                              </div>

                              {log.metadata?.fieldChanged ? (
                                <div className="rounded-lg border border-border/50 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                                  {formatFieldChange(
                                    String(log.metadata.fieldChanged),
                                    log.metadata.oldValue,
                                    log.metadata.newValue,
                                  )}
                                </div>
                              ) : null}

                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                <time dateTime={log.createdAt}>{formatActivityDateTime(log.createdAt)}</time>
                                <span>•</span>
                                <span>{relative}</span>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {pagination && pagination.pages > 1 ? (
        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/40 px-4 py-3 text-xs text-muted-foreground">
          <p>
            Page {pagination.page} of {pagination.pages} • {pagination.total} events
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={pagination.page <= 1 || logsQuery.isFetching}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={!pagination.hasNextPage || logsQuery.isFetching}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
