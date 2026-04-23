"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AxiosError } from "axios";
import { SquarePen } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { taskApi } from "@/features/tasks/api/task.api";
import { TaskForm } from "@/features/tasks/components/task-form";
import { TaskFormValues } from "@/features/tasks/schemas/task.schema";
import {
  useCreateTaskMutation,
  useDeleteTaskDraftMutation,
  usePublishTaskDraftMutation,
  useUpsertTaskDraftMutation,
} from "@/features/tasks/hooks/use-tasks-query";
import { useProjectsQuery } from "@/features/projects/hooks/use-projects-query";
import { useAuthStore } from "@/store/auth-store";
import { CreateTaskInput, Task } from "@/types/task.types";
import {
  buildTaskDraftInput,
  createDraftSnapshot,
  getLatestStoredTaskDraft,
  hasTaskDraftContent,
  removeStoredTaskDraft,
  storeTaskDraftSnapshot,
  taskToDraftFormValues,
} from "@/features/tasks/utils/task-draft";

interface CreateTaskModalProps {
  trigger?: React.ReactNode;
  defaultProjectId?: string;
  onCreated?: () => void;
}

const createBaseValues = (defaultProjectId?: string): TaskFormValues => ({
  title: "",
  description: "",
  projectId: defaultProjectId ?? "",
  status: "TODO",
  priority: "MEDIUM",
  visibility: "PUBLIC",
  visibleToUsers: [],
  assigneeIds: [],
  dueDate: "",
  tags: [],
});

const pickLatestDraft = (
  localDraft: ReturnType<typeof getLatestStoredTaskDraft>,
  serverDraft: Task | null,
  baseValues: TaskFormValues,
) => {
  const localCandidate = localDraft
    ? {
        draftId: localDraft.draftId || null,
        updatedAt: localDraft.updatedAt,
        values: {
          ...baseValues,
          ...localDraft.values,
        } as TaskFormValues,
      }
    : null;

  const serverCandidate = serverDraft
    ? {
        draftId: serverDraft.id,
        updatedAt: serverDraft.updatedAt,
        values: {
          ...baseValues,
          ...taskToDraftFormValues(serverDraft),
        } as TaskFormValues,
      }
    : null;

  if (!localCandidate) return serverCandidate;
  if (!serverCandidate) return localCandidate;

  return Date.parse(localCandidate.updatedAt) >= Date.parse(serverCandidate.updatedAt)
    ? localCandidate
    : serverCandidate;
};

export function CreateTaskModal({
  trigger,
  defaultProjectId,
  onCreated,
}: CreateTaskModalProps) {
  const [open, setOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [initialValues, setInitialValues] = useState<TaskFormValues>(() =>
    createBaseValues(defaultProjectId),
  );
  const [draftValues, setDraftValues] = useState<TaskFormValues>(() =>
    createBaseValues(defaultProjectId),
  );
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isCheckingDraft, setIsCheckingDraft] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const draftStorageKeyRef = useRef<string | null>(null);
  const lastSavedFingerprintRef = useRef<string>("");

  const createTask = useCreateTaskMutation();
  const publishTaskDraft = usePublishTaskDraftMutation();
  const upsertTaskDraft = useUpsertTaskDraftMutation();
  const deleteTaskDraft = useDeleteTaskDraftMutation();
  const projectsQuery = useProjectsQuery({ page: 1, limit: 200 });
  const { activeOrgId, user } = useAuthStore();

  const userId = user?.id || "";
  const baseValues = useMemo(() => createBaseValues(defaultProjectId), [defaultProjectId]);
  const debouncedDraftValues = useDebounce(draftValues, 2500);

  const projects = (projectsQuery.data?.data.items ?? []).map((p: any) => ({
    id: p.id || p._id,
    name: p.name,
  }));

  const persistLocalDraft = (values: TaskFormValues, nextDraftId?: string | null) => {
    if (!userId || !hasTaskDraftContent(values)) return;

    const snapshot = createDraftSnapshot({
      draftId: nextDraftId ?? draftId,
      userId,
      values,
    });

    draftStorageKeyRef.current = storeTaskDraftSnapshot(
      snapshot,
      draftStorageKeyRef.current,
    );
  };

  const clearLocalDraft = (projectId?: string, nextDraftId?: string | null) => {
    if (!userId) return;

    removeStoredTaskDraft(userId, {
      draftId: nextDraftId ?? draftId,
      projectId,
    });

    if (draftStorageKeyRef.current && typeof window !== "undefined") {
      window.localStorage.removeItem(draftStorageKeyRef.current);
    }
    draftStorageKeyRef.current = null;
  };

  const resetDraftState = (nextValues = baseValues) => {
    setInitialValues(nextValues);
    setDraftValues(nextValues);
    setDraftId(null);
    draftStorageKeyRef.current = null;
    lastSavedFingerprintRef.current = "";
    setResetKey((current) => current + 1);
  };

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const initializeDraft = async () => {
      setIsCheckingDraft(true);

      const nextBaseValues = createBaseValues(defaultProjectId);
      let serverDraft: Task | null = null;
      const localDraft = userId ? getLatestStoredTaskDraft(userId, defaultProjectId) : null;

      if (userId) {
        try {
          const response = await taskApi.getDrafts({
            page: 1,
            limit: 1,
            projectId: defaultProjectId,
          });
          serverDraft = response.data.items?.[0] ?? null;
        } catch {
          serverDraft = null;
        }
      }

      if (cancelled) return;

      const candidate = pickLatestDraft(localDraft, serverDraft, nextBaseValues);

      if (candidate && window.confirm("You have an unsaved draft. Restore?")) {
        setInitialValues(candidate.values);
        setDraftValues(candidate.values);
        setDraftId(candidate.draftId || null);
        lastSavedFingerprintRef.current = JSON.stringify(
          buildTaskDraftInput(candidate.values),
        );
        persistLocalDraft(candidate.values, candidate.draftId || null);
      } else {
        setInitialValues(nextBaseValues);
        setDraftValues(nextBaseValues);
        setDraftId(null);
        draftStorageKeyRef.current = null;
        lastSavedFingerprintRef.current = "";
      }

      if (!cancelled) {
        setResetKey((current) => current + 1);
        setIsCheckingDraft(false);
      }
    };

    void initializeDraft();

    return () => {
      cancelled = true;
    };
  }, [defaultProjectId, open, userId]);

  const syncDraftToServer = async (
    values: TaskFormValues,
    options?: { force?: boolean; showErrors?: boolean },
  ) => {
    if (!userId || !hasTaskDraftContent(values)) {
      return null;
    }

    const fingerprint = JSON.stringify(buildTaskDraftInput(values));
    if (!options?.force && fingerprint === lastSavedFingerprintRef.current) {
      return draftId;
    }

    setIsSavingDraft(true);
    try {
      const response = await upsertTaskDraft.mutateAsync({
        id: draftId,
        data: buildTaskDraftInput(values, draftId),
      });
      const nextDraftId = response.data.id || (response.data as any)._id;
      setDraftId(nextDraftId);
      lastSavedFingerprintRef.current = fingerprint;
      persistLocalDraft(values, nextDraftId);
      return nextDraftId;
    } catch (error) {
      if (options?.showErrors) {
        const apiError = error as AxiosError<{ message?: string; errors?: string[] }>;
        const message =
          apiError.response?.data?.errors?.[0] ||
          apiError.response?.data?.message ||
          "Failed to save draft. Please try again.";
        toast.error(message);
      }
      return null;
    } finally {
      setIsSavingDraft(false);
    }
  };

  useEffect(() => {
    if (!open || isCheckingDraft || !hasTaskDraftContent(debouncedDraftValues)) {
      return;
    }

    void syncDraftToServer(debouncedDraftValues, { showErrors: false });
  }, [debouncedDraftValues, isCheckingDraft, open]);

  const handleValuesChange = (values: TaskFormValues) => {
    setDraftValues(values);

    if (hasTaskDraftContent(values)) {
      persistLocalDraft(values);
      return;
    }

    clearLocalDraft(values.projectId);
  };

  const handleDiscard = async () => {
    const currentProjectId = draftValues.projectId || defaultProjectId;

    try {
      if (draftId) {
        await deleteTaskDraft.mutateAsync(draftId);
      }

      clearLocalDraft(currentProjectId, draftId);
      resetDraftState(createBaseValues(defaultProjectId));
      setOpen(false);
      if (draftId || hasTaskDraftContent(draftValues)) {
        toast.success("Draft discarded.");
      }
    } catch {
      toast.error("Failed to discard draft.");
    }
  };

  const handleSaveDraft = async (values: TaskFormValues) => {
    if (!hasTaskDraftContent(values)) {
      toast.info("Add something before saving a draft.");
      return;
    }

    const savedDraftId = await syncDraftToServer(values, {
      force: true,
      showErrors: true,
    });

    if (!savedDraftId) return;

    toast.success("Draft saved.");
    setOpen(false);
  };

  const handleSilentSaveDraft = async (values: TaskFormValues) => {
    if (!hasTaskDraftContent(values)) {
      setOpen(false);
      return;
    }

    await syncDraftToServer(values, {
      force: true,
      showErrors: false,
    });

    setOpen(false);
  };

  const buildPublishPayload = (values: TaskFormValues): CreateTaskInput => {
    const assigneeIds = values.assigneeIds || [];
    const canSendAssignees = Boolean(activeOrgId);

    return {
      title: values.title.trim(),
      projectId: values.projectId,
      status: values.status,
      priority: values.priority,
      description: values.description || undefined,
      dueDate: values.dueDate || "",
      tags: values.tags || [],
      visibility: values.visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC",
      visibleToUsers:
        values.visibility === "PRIVATE" ? (values.visibleToUsers || []) : undefined,
      assignees: canSendAssignees ? assigneeIds : undefined,
      assigneeId: canSendAssignees ? assigneeIds[0] || undefined : undefined,
    };
  };

  const handleSubmit = async (values: TaskFormValues, createMore?: boolean) => {
    try {
      const publishPayload = buildPublishPayload(values);
      const savedDraftId = userId
        ? await syncDraftToServer(values, {
            force: true,
            showErrors: true,
          })
        : null;

      if (userId && !savedDraftId) {
        return;
      }

      if (savedDraftId) {
        await publishTaskDraft.mutateAsync({
          id: savedDraftId,
          data: publishPayload,
        });
      } else {
        await createTask.mutateAsync({
          ...publishPayload,
          dueDate: values.dueDate || undefined,
        });
      }

      clearLocalDraft(values.projectId, savedDraftId || draftId);
      setDraftId(null);
      lastSavedFingerprintRef.current = "";
      toast.success(`Task "${values.title}" created!`);
      onCreated?.();

      if (!createMore) {
        setOpen(false);
        return;
      }

      resetDraftState(createBaseValues(defaultProjectId));
    } catch (error) {
      const apiError = error as AxiosError<{ message?: string; errors?: string[] }>;
      const message =
        apiError.response?.data?.errors?.[0] ||
        apiError.response?.data?.message ||
        "Failed to create task. Please try again.";
      toast.error(message);
    }
  };

  const isSubmitting = createTask.isPending || publishTaskDraft.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <SquarePen className="mr-2 size-4" />
            Create Task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        hideClose
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-[640px] w-[95vw] md:w-full h-fit max-h-[90vh] p-0 overflow-hidden border-border/10 bg-background backdrop-blur-xl shadow-2xl rounded-2xl gap-0 flex flex-col"
      >
        {isCheckingDraft ? (
          <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
            Restoring draft...
          </div>
        ) : (
          <TaskForm
            key={resetKey}
            resetKey={resetKey}
            projects={projects}
            initialValues={initialValues}
            onDiscard={handleDiscard}
            onSaveDraft={handleSilentSaveDraft}
            onValuesChange={handleValuesChange}
            onSubmit={(values, createMore) => handleSubmit(values, createMore)}
            isSubmitting={isSubmitting}
            isSavingDraft={isSavingDraft}
            submitLabel="Create Task"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
