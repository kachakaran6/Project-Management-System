
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
import { useAppSelector } from "@/hooks/useAppSelector";
import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/features/auth/api/settings.api";
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
  initialValuesOverride?: Partial<TaskFormValues>;
}

const createBaseValues = (defaultProjectId?: string, defaultAssigneeIds: string[] = [], defaultStatus?: string): TaskFormValues => ({
  title: "",
  description: "",
  projectId: defaultProjectId ?? "",
  status: defaultStatus || "TODO",
  priority: "MEDIUM",
  visibility: "PUBLIC",
  visibleToUsers: [],
  assigneeIds: defaultAssigneeIds,
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
  initialValuesOverride,
}: CreateTaskModalProps) {
  const [open, setOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const { activeOrgId, user } = useAppSelector((state) => state.auth);
  const defaultStatus = user?.settings?.defaultTaskStatus?.toUpperCase();

  const [initialValues, setInitialValues] = useState<TaskFormValues>(() =>
    createBaseValues(defaultProjectId, [], defaultStatus),
  );
  const [draftValues, setDraftValues] = useState<TaskFormValues>(() =>
    createBaseValues(defaultProjectId, [], defaultStatus),
  );

  const [draftId, setDraftId] = useState<string | null>(null);
  const [isCheckingDraft, setIsCheckingDraft] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isLocalSubmitting, setIsLocalSubmitting] = useState(false);
  const [createMore, setCreateMore] = useState(false);

  const draftStorageKeyRef = useRef<string | null>(null);
  const lastSavedFingerprintRef = useRef<string>("");

  const createTask = useCreateTaskMutation();
  const publishTaskDraft = usePublishTaskDraftMutation();
  const upsertTaskDraft = useUpsertTaskDraftMutation();
  const deleteTaskDraft = useDeleteTaskDraftMutation();
  const projectsQuery = useProjectsQuery({ page: 1, limit: 200 });

  const userId = user?.id || "";
  const draftingEnabled = !!user?.settings?.taskDraftEnabled;

  const baseValues = useMemo(() => createBaseValues(defaultProjectId), [defaultProjectId]);
  
  // Debounce for LOCAL storage save (Phase 3)
  const debouncedLocalDraftValues = useDebounce(draftValues, 800);
  
  // Debounce for SERVER sync (Phase 4) - only when idle
  const debouncedServerDraftValues = useDebounce(draftValues, 3000);

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

  const { data: settingsData } = useQuery({
    queryKey: ["settings", "default-assignees"],
    queryFn: () => settingsApi.getDefaultAssignees(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const { data: statusPreferenceData } = useQuery({
    queryKey: ["settings", "default-status"],
    queryFn: () => settingsApi.getDefaultStatus(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (open) {
    }
  }, [open, settingsData, statusPreferenceData, user]);

  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      hasInitializedRef.current = false;
      return;
    }
    
    if (!hasInitializedRef.current) {
      const defaultAssigneeIds = settingsData?.data?.defaultAssignees?.map((u: any) => u.id) || [];
      const resolvedDefaultStatus = statusPreferenceData?.data?.defaultTaskStatus?.toUpperCase() || defaultStatus || "TODO";
      
      const nextBaseValues = {
        ...createBaseValues(defaultProjectId, defaultAssigneeIds, resolvedDefaultStatus),
        ...initialValuesOverride,
      };

      setInitialValues(nextBaseValues);
      setDraftValues(nextBaseValues);
      setDraftId(null);
      draftStorageKeyRef.current = null;
      lastSavedFingerprintRef.current = "";
      setResetKey((current) => current + 1);
      setIsCheckingDraft(false);
      setCreateMore(false);
      
      hasInitializedRef.current = true;
    } 
    else if (!draftValues.title && !draftValues.description) {
      const defaultAssigneeIds = settingsData?.data?.defaultAssignees?.map((u: any) => u.id) || [];
      const resolvedDefaultStatus = statusPreferenceData?.data?.defaultTaskStatus?.toUpperCase() || defaultStatus || "TODO";
      
      const newAssigneeIds = draftValues.assigneeIds.length === 0 ? defaultAssigneeIds : draftValues.assigneeIds;
      const newStatus = (draftValues.status === "TODO" || !draftValues.status) ? resolvedDefaultStatus : draftValues.status;

      const needsAssigneeUpdate = draftValues.assigneeIds.length === 0 && defaultAssigneeIds.length > 0;
      const needsStatusUpdate = (draftValues.status === "TODO" || !draftValues.status) && newStatus !== draftValues.status;

      if (needsAssigneeUpdate || needsStatusUpdate) {
        const updatedValues = {
          ...draftValues,
          assigneeIds: newAssigneeIds,
          status: newStatus,
        };
        
        setInitialValues(updatedValues);
        setDraftValues(updatedValues);
      }
    }
  }, [defaultProjectId, open, settingsData, statusPreferenceData, defaultStatus, draftValues.title, draftValues.description, draftValues.assigneeIds, draftValues.status]);


  const syncDraftToServer = async (
    values: TaskFormValues,
    options?: { force?: boolean; showErrors?: boolean; silent?: boolean },
  ) => {
    if (!userId || !draftingEnabled || !hasTaskDraftContent(values)) {
      return null;
    }

    const fingerprint = JSON.stringify(buildTaskDraftInput(values));
    if (!options?.force && fingerprint === lastSavedFingerprintRef.current) {
      return draftId;
    }

    // Phase 4: Non-blocking background sync
    if (!options?.force) {
      setIsSavingDraft(true);
    }
    
    try {
      const response = await upsertTaskDraft.mutateAsync({
        id: draftId,
        data: buildTaskDraftInput(values, draftId),
      });
      const nextDraftId = response.data.id || (response.data as any)._id;
      setDraftId(nextDraftId);
      lastSavedFingerprintRef.current = fingerprint;
      
      // Update local storage too to keep in sync
      persistLocalDraft(values, nextDraftId);
      
      return nextDraftId;
    } catch (error) {
      if (options?.showErrors) {
        const apiError = error as AxiosError<{ message?: string; errors?: string[] }>;
        const message =
          apiError.response?.data?.errors?.[0] ||
          apiError.response?.data?.message ||
          "Failed to save draft.";
        toast.error(message);
      }
      return null;
    } finally {
      setIsSavingDraft(false);
    }
  };

  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (!open) {
      isSubmittingRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (!open || !draftingEnabled || !hasTaskDraftContent(debouncedLocalDraftValues)) {
      return;
    }
    persistLocalDraft(debouncedLocalDraftValues);
  }, [debouncedLocalDraftValues, open, draftingEnabled]);

  useEffect(() => {
    if (
      !open || 
      !draftingEnabled ||
      isCheckingDraft || 
      isSubmittingRef.current ||
      !hasTaskDraftContent(debouncedServerDraftValues)
    ) {
      return;
    }

    // Background sync to server
    void syncDraftToServer(debouncedServerDraftValues, { showErrors: false });
  }, [debouncedServerDraftValues, isCheckingDraft, open, draftingEnabled]);

  const handleValuesChange = (values: TaskFormValues) => {
    setDraftValues(values);
    // Instant clear if empty, but saving is debounced in useEffect
    if (!hasTaskDraftContent(values)) {
      clearLocalDraft(values.projectId);
    }
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
    if (!draftingEnabled || !hasTaskDraftContent(values)) {
      setOpen(false);
      return;
    }

    // Fire and forget sync on close
    syncDraftToServer(values, {
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

  const isSubmitting = createTask.isPending || publishTaskDraft.isPending;

  const handleSubmit = (values: TaskFormValues, createMoreArg?: boolean) => {
    if (isLocalSubmitting) return;
    
    const publishPayload = buildPublishPayload(values);
    const currentDraftId = draftId;
    const taskTitle = values.title;
    
    // Cleanup local state immediately for instant feedback
    clearLocalDraft(values.projectId, currentDraftId);
    setDraftId(null);
    lastSavedFingerprintRef.current = "";

    if (!createMoreArg) {
      setOpen(false);
    } else {
      // If create more is checked, reset the form immediately so they can start typing the next one
      const defaultAssigneeIds = settingsData?.data?.defaultAssignees?.map((u: any) => u.id) || [];
      resetDraftState(createBaseValues(values.projectId || defaultProjectId, defaultAssigneeIds, defaultStatus));
    }

    // Trigger mutation with callbacks for background success/error handling
    const mutationCallbacks = {
      onSuccess: () => {
        toast.success(`Task "${taskTitle}" created!`);
        onCreated?.();
      },
      onError: (error: any) => {
        const apiError = error as AxiosError<{ message?: string; errors?: string[] }>;
        const message =
          apiError.response?.data?.errors?.[0] ||
          apiError.response?.data?.message ||
          "Failed to create task. Please try again.";
        toast.error(message);
      }
    };

    if (userId && currentDraftId) {
      publishTaskDraft.mutate({
        id: currentDraftId,
        data: publishPayload,
      }, mutationCallbacks);
    } else {
      createTask.mutate({
        ...publishPayload,
        dueDate: values.dueDate || undefined,
      }, mutationCallbacks);
    }
  };

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
        className="max-w-[640px] w-[95vw] md:w-full h-fit max-h-[90vh] p-0 overflow-hidden border-border/10 bg-background backdrop-blur-xl shadow-2xl rounded-modal gap-0 flex flex-col"
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
            onSubmit={(values, more) => handleSubmit(values, more)}
            isSubmitting={isSubmitting || isLocalSubmitting}
            isSavingDraft={isSavingDraft}
            submitLabel="Create Task"
            createMore={createMore}
            onCreateMoreChange={setCreateMore}
            defaultStatus={statusPreferenceData?.data?.defaultTaskStatus?.toUpperCase()}
          />

        )}
      </DialogContent>
    </Dialog>
  );
}
