"use client";

import Link from "@/lib/next-link";
import { useParams, useRouter } from "@/lib/next-navigation";
import { Mail, User, X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JsonViewer } from "@/features/admin/components/json-viewer";
import { TaskComments } from "@/features/comments/components/TaskComments";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useOrganizationMembersQuery } from "@/features/organization/hooks/use-organization-members";
import { useTaskQuery } from "@/features/tasks/hooks/use-tasks-query";
import type { Task } from "@/types/task.types";
import { Skeleton, SkeletonAvatar } from "@/components/ui/skeleton";
import type { OrganizationMemberRecord } from "@/features/organization/api/organization-members.api";

type CreatorInfo = {
  name: string;
  email?: string;
  avatarUrl?: string;
};

function getRecordId(value: unknown) {
  if (!value) return null;
  if (typeof value === "string") return value;

  if (typeof value === "object") {
    const record = value as { id?: unknown; _id?: unknown; userId?: unknown };
    if (typeof record.id === "string") return record.id;
    if (typeof record._id === "string") return record._id;
    if (typeof record.userId === "string") return record.userId;
  }

  return null;
}

function getCreatorFromObject(value: unknown): CreatorInfo | null {
  if (!value || typeof value !== "object") return null;

  const record = value as {
    name?: unknown;
    firstName?: unknown;
    lastName?: unknown;
    email?: unknown;
    avatarUrl?: unknown;
  };

  const fullName =
    typeof record.name === "string" && record.name.trim().length > 0
      ? record.name.trim()
      : [record.firstName, record.lastName]
          .filter((part): part is string => typeof part === "string")
          .join(" ")
          .trim();

  return {
    name: fullName || "Unknown creator",
    email: typeof record.email === "string" ? record.email : undefined,
    avatarUrl:
      typeof record.avatarUrl === "string" ? record.avatarUrl : undefined,
  };
}

function getTaskCreator(task: Task, members: OrganizationMemberRecord[]) {
  const creatorData =
    (task as Task & {
      createdBy?: unknown;
      created_by?: unknown;
    }).creator ??
    (task as Task & {
      createdBy?: unknown;
      created_by?: unknown;
    }).createdBy ??
    (task as Task & {
      createdBy?: unknown;
      created_by?: unknown;
    }).created_by ??
    task.creatorId;

  const creatorFromPayload = getCreatorFromObject(creatorData);
  if (creatorFromPayload) return creatorFromPayload;

  const creatorId = getRecordId(creatorData) ?? getRecordId(task.creatorId);
  if (!creatorId) return null;

  const member = members.find((m) => String(m.id) === String(creatorId));
  if (member) {
    return {
      name: `${member.firstName} ${member.lastName}`.trim() || "Unknown creator",
      email: member.email,
      avatarUrl: member.avatarUrl,
    };
  }

  return {
    name: `Creator ID: ${creatorId}`,
  };
}

export default function TaskDetailsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const params = useParams<{ id: string }>();
  const id = String(params.id);
  const taskQuery = useTaskQuery(id, Boolean(id));
  const { activeOrgId } = useAuth();
  const membersQuery = useOrganizationMembersQuery(activeOrgId || "");

  if (taskQuery.isLoading)
    return (
      <div className="mx-auto w-full max-w-5xl space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-2/3 rounded-xl" />
          <Skeleton className="h-4 w-1/3 rounded-md" />
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card className="border-border/40">
              <CardHeader>
                <Skeleton className="h-5 w-32 rounded-md" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-4/5 rounded-md" />
                <div className="pt-4 space-y-3">
                  <Skeleton className="h-3 w-1/4 rounded-md" />
                  <Skeleton className="h-3 w-1/4 rounded-md" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40">
              <CardHeader>
                <Skeleton className="h-5 w-24 rounded-md" />
              </CardHeader>
              <CardContent className="space-y-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-4">
                    <SkeletonAvatar className="size-10" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-10 w-full rounded-xl" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-border/40">
              <CardHeader>
                <Skeleton className="h-5 w-24 rounded-md" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl border border-border/20">
                  <SkeletonAvatar className="size-10" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4 rounded-md" />
                    <Skeleton className="h-3 w-1/2 rounded-md" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40">
              <CardHeader>
                <Skeleton className="h-5 w-32 rounded-md" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  if (taskQuery.error || !taskQuery.data?.data)
    return <p className="text-destructive">Task not found.</p>;

  const task = taskQuery.data.data;
  const creator = getTaskCreator(task, membersQuery.data?.data.members ?? []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">{task.title}</h1>
          <p className="text-muted-foreground mt-1">
            Full task details with activity and debug context.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Close task details"
            onClick={() => router.back()}
          >
            <X className="size-4" />
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/tasks/${task.id}/edit`}>Edit Task</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Task Creator</CardTitle>
        </CardHeader>
        <CardContent>
          {creator ? (
            <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/3 px-4 py-3">
              <Avatar className="h-11 w-11">
                <AvatarImage src={creator.avatarUrl} alt={creator.name} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {creator.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{creator.name}</p>
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Mail className="size-3.5" />
                  <span className="truncate">
                    {creator.email || "No email available"}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/3 px-4 py-3 text-sm text-muted-foreground">
              <User className="size-4" />
              Creator information is unavailable for this task.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Task Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Status:</span>{" "}
            <Badge variant="outline">
              {typeof task.status === 'object' ? (task.status as any).name : String(task.status).replace(/_/g, " ")}
            </Badge>
          </p>
          <p>
            <span className="text-muted-foreground">Priority:</span>{" "}
            <Badge variant="outline">
              {typeof task.priority === 'object' ? (task.priority as any).name || (task.priority as any).label : String(task.priority)}
            </Badge>
          </p>
          <div className="description-container">
            <span className="text-muted-foreground">
              Description:{" "}
              <span
                dangerouslySetInnerHTML={{
                  __html: task.description || "No description",
                }}
              />
            </span>
          </div>
          <p>
            <span className="text-muted-foreground">Due Date:</span>{" "}
            {task.dueDate
              ? new Date(task.dueDate).toLocaleDateString()
              : "Not set"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comments</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskComments taskId={id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Activity log integration placeholder.
          </p>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Raw JSON</CardTitle>
          </CardHeader>
          <CardContent>
            <JsonViewer data={task} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
