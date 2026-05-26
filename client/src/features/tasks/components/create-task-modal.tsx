
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AxiosError } from "axios";
import { SquarePen } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useBlocker } from "react-router-dom";
import { taskApi } from "@/features/tasks/api/task.api";
import { TaskForm } from "@/features/tasks/components/task-form";
import { UnsavedChangesModal } from "@/features/tasks/components/unsaved-changes-modal";
import { TaskFormValues } from "@/features/tasks/schemas/task.schema";
import {
  useCreateTaskMutation,
  useDeleteTaskDraftMutation,
  usePublishTaskDraftMutation,
  useUpsertTaskDraftMutation,
} from "@/features/tasks/hooks/use-tasks-query";
import { useProjectsQuery } from "@/features/projects/hooks/use-projects-query";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  defaultAssigneeIds?: string[];
  onCreated?: () => void;
  initialValuesOverride?: Partial<TaskFormValues>;
}

type BlockerState = "unblocked" | "blocked" | "proceeding";

interface BlockerController {
  proceed: () => void;
  reset: () => void;
  state: BlockerState;
}

interface CreateTaskRouteBlockerProps {
  shouldBlock: boolean;
  onBlocked: () => void;
  onStateChange: (controller: BlockerController) => void;
}

function CreateTaskRouteBlocker({
  shouldBlock,
  onBlocked,
  onStateChange,
}: CreateTaskRouteBlockerProps) {
  const blocker = useBlocker(shouldBlock);

  useEffect(() => {
    onStateChange({
      proceed: blocker.proceed,
      reset: blocker.reset,
      state: blocker.state as BlockerState,
    });
  }, [blocker.proceed, blocker.reset, blocker.state, onStateChange]);

  useEffect(() => {
    if (blocker.state === "blocked") {
      onBlocked();
    }
  }, [blocker.state, onBlocked]);

  return null;
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

const normalizeComparableValues = (values: Partial<TaskFormValues>) => {
  const toSortedStringList = (items: unknown[]) =>
    items.map((item) => String(item)).sort();

  return {
    title: String(values.title || "").trim(),
    description: String(values.description || "").trim(),
    status: String(values.status || "TODO"),
    priority: String(values.priority || "MEDIUM"),
    visibility: String(values.visibility || "PUBLIC"),
    projectId: String(values.projectId || ""),
    assigneeIds: toSortedStringList(Array.isArray(values.assigneeIds) ? values.assigneeIds : []),
    dueDate: String(values.dueDate || ""),
    tags: toSortedStringList(Array.isArray(values.tags) ? values.tags : []),
    visibleToUsers: toSortedStringList(Array.isArray(values.visibleToUsers) ? values.visibleToUsers : []),
  };
};


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
  defaultAssigneeIds = [],
  onCreated,
  initialValuesOverride,
}: CreateTaskModalProps) {
  const [open, setOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const { activeOrgId, user } = useAppSelector((state) => state.auth);
  const queryClient = useQueryClient();
  const defaultStatus = user?.settings?.defaultTaskStatus?.toUpperCase();

  const [initialValues, setInitialValues] = useState<TaskFormValues>(() =>
    createBaseValues(defaultProjectId, defaultAssigneeIds, defaultStatus),
  );
  const [draftValues, setDraftValues] = useState<TaskFormValues>(() =>
    createBaseValues(defaultProjectId, defaultAssigneeIds, defaultStatus),
  );

  const [draftId, setDraftId] = useState<string | null>(null);
  const [isCheckingDraft, setIsCheckingDraft] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isLocalSubmitting, setIsLocalSubmitting] = useState(false);
  const [createMore, setCreateMore] = useState(false);
  const [wasRestored, setWasRestored] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [blockerState, setBlockerState] = useState<BlockerState>("unblocked");

  const draftStorageKeyRef = useRef<string | null>(null);
  const lastSavedFingerprintRef = useRef<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const blockerProceedRef = useRef<(() => void) | null>(null);
  const blockerResetRef = useRef<(() => void) | null>(null);

  const createTask = useCreateTaskMutation();
  const publishTaskDraft = usePublishTaskDraftMutation();
  const upsertTaskDraft = useUpsertTaskDraftMutation();
  const deleteTaskDraft = useDeleteTaskDraftMutation();
  const projectsQuery = useProjectsQuery({ page: 1, limit: 200 });

  const userId = user?.id || "";
  const draftingEnabled = !!user?.settings?.taskDraftEnabled;
  const isSubmitting = createTask.isPending || publishTaskDraft.isPending;

  const baseValues = useMemo(() => createBaseValues(defaultProjectId, defaultAssigneeIds), [defaultProjectId, defaultAssigneeIds]);
  
  // Debounce for LOCAL storage save
  const debouncedLocalDraftValues = useDebounce(draftValues, 400);

  const projects = (projectsQuery.data?.data.items ?? []).map((p: any) => ({
    id: p.id || p._id,
    name: p.name,
  }));

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(normalizeComparableValues(draftValues)) !== JSON.stringify(normalizeComparableValues(initialValues)),
    [draftValues, initialValues],
  );

  const shouldBlockNavigation = open && hasUnsavedChanges && !isLocalSubmitting && !isSubmitting;
  const handleBlockerStateChange = useCallback((controller: BlockerController) => {
    blockerProceedRef.current = controller.proceed;
    blockerResetRef.current = controller.reset;
    setBlockerState(controller.state);
  }, []);

  useEffect(() => {
    if (!open) {
      setShowConfirmModal(false);
      setBlockerState("unblocked");
      blockerProceedRef.current = null;
      blockerResetRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!shouldBlockNavigation) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [shouldBlockNavigation]);

  useEffect(() => {
    if (!open || !userId) return;

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key &&
        draftStorageKeyRef.current &&
        event.key === draftStorageKeyRef.current &&
        event.newValue !== event.oldValue
      ) {
        try {
          const parsed = JSON.parse(event.newValue || "");
          if (parsed && parsed.values) {
            setDraftValues((currentValues) => ({ ...currentValues, ...parsed.values }));
          }
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [open, userId]);

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


  const { data: statusPreferenceData } = useQuery({
    queryKey: ["settings", "default-status"],
    queryFn: () => settingsApi.getDefaultStatus(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (open) {
    }
  }, [open, statusPreferenceData, user]);

  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      hasInitializedRef.current = false;
      return;
    }
    
    if (!hasInitializedRef.current) {
      const resolvedDefaultStatus = statusPreferenceData?.data?.defaultTaskStatus?.toUpperCase() || defaultStatus || "TODO";
      
      const nextBaseValues = {
        ...createBaseValues(defaultProjectId, defaultAssigneeIds, resolvedDefaultStatus),
        ...initialValuesOverride,
      };

      let finalValues = nextBaseValues;
      let finalDraftId = null;
      let restored = false;

      if (userId && draftingEnabled) {
        const localDraft = getLatestStoredTaskDraft(userId, defaultProjectId);
        if (localDraft && localDraft.values && hasTaskDraftContent(localDraft.values as TaskFormValues)) {
          finalValues = { ...nextBaseValues, ...localDraft.values } as TaskFormValues;
          finalDraftId = localDraft.draftId || null;
          restored = true;
        }
      }

      setInitialValues(nextBaseValues); // Keep initial empty so we know it's dirty
      setDraftValues(finalValues);
      setDraftId(finalDraftId);
      setWasRestored(restored);
      
      if (restored) {
        // Reset the alert after 4 seconds
        setTimeout(() => setWasRestored(false), 4000);
      }
      
      draftStorageKeyRef.current = null;
      lastSavedFingerprintRef.current = "";
      setResetKey((current) => current + 1);
      setIsCheckingDraft(false);
      setCreateMore(false);
      
      hasInitializedRef.current = true;
    } 
  }, [defaultProjectId, defaultAssigneeIds, open, statusPreferenceData, defaultStatus, draftValues.title, draftValues.description, draftValues.status]);


  const syncDraftToServer = async (
    values: TaskFormValues,
    options?: { force?: boolean; showErrors?: boolean; silent?: boolean; skipContentCheck?: boolean },
  ) => {
    if (!userId || (!options?.force && !draftingEnabled) || (!options?.skipContentCheck && !hasTaskDraftContent(values))) {
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
      if (!options?.silent) {
        toast.loading("Saving draft...", { id: "draft-sync" });
      }
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const response = await upsertTaskDraft.mutateAsync({
        id: draftId,
        data: buildTaskDraftInput(values, draftId),
        config: { signal: abortControllerRef.current.signal }
      });
      const nextDraftId = response.data.id || (response.data as any)._id;
      setDraftId(nextDraftId);
      lastSavedFingerprintRef.current = fingerprint;
      
      // Update local storage too to keep in sync
      persistLocalDraft(values, nextDraftId);
      
      // Optimistically update React Query cache immediately
      queryClient.setQueryData(["tasks", activeOrgId, "infinite"], (old: any) => {
        if (!old?.pages) return old;
        const newDraft = { ...response.data, isDraft: true };
        // We only want to inject it if it doesn't already exist to prevent dupes
        const exists = old.pages.some((p: any) => p.data?.items?.some((t: any) => t.id === nextDraftId || t._id === nextDraftId));
        if (exists) return old;
        
        const newPages = [...old.pages];
        if (newPages.length > 0) {
          const newItems = [...(newPages[0].data?.items || [])];
          newItems.unshift(newDraft); // Put it at the top
          newPages[0] = { ...newPages[0], data: { ...newPages[0].data, items: newItems } };
        }
        return { ...old, pages: newPages };
      });
      
      if (!options?.silent) {
        toast.success("Draft saved.", { id: "draft-sync" });
      }
      return nextDraftId;
    } catch (error: any) {
      if (error?.name === "CanceledError" || error?.name === "AbortError") {
        return null;
      }
      if (!options?.silent) {
        toast.dismiss("draft-sync");
      }
      if (options?.showErrors) {
        const apiError = error as import("axios").AxiosError<{ message?: string; errors?: string[] }>;
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



  const handleValuesChange = (values: TaskFormValues) => {
    setDraftValues(values);
    // Instant clear if empty, but saving is debounced in useEffect
    if (!hasTaskDraftContent(values)) {
      clearLocalDraft(values.projectId);
    }
  };

  const handleDiscard = async () => {
    const currentProjectId = draftValues.projectId || defaultProjectId;

    setShowConfirmModal(false);

    try {
      if (draftId) {
        void deleteTaskDraft.mutateAsync(draftId).catch(() => undefined);
      }

      clearLocalDraft(currentProjectId, draftId);
      resetDraftState(createBaseValues(defaultProjectId, defaultAssigneeIds));
      setOpen(false);

      if (blockerState === "blocked") {
        blockerProceedRef.current?.();
      }
    } catch {
      toast.error("Failed to discard draft.");
    }
  };

  const handleAttemptClose = () => {
    if (isSubmitting || isLocalSubmitting) {
      return;
    }

    if (!hasUnsavedChanges) {
      setShowConfirmModal(false);
      if (blockerState === "blocked") {
        blockerResetRef.current?.();
      }
      setOpen(false);
      return;
    }

    setShowConfirmModal(true);
  };

  const finalizeClose = () => {
    setShowConfirmModal(false);
    setOpen(false);
  };

  const handleSaveDraft = (values: TaskFormValues) => {
    if (!hasTaskDraftContent(values)) {
      toast.info("Add something before saving a draft.");
      return;
    }

    // Background sync, no await, instant close
    syncDraftToServer(values, {
      force: true,
      showErrors: false, // Don't show blocking errors, just silent fail with local storage
      silent: false
    });

    if (blockerState === "blocked") {
      blockerProceedRef.current?.();
    }

    finalizeClose();
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


  const handleSubmit = (values: TaskFormValues, createMoreArg?: boolean) => {
    if (isLocalSubmitting) return;
    
    const publishPayload = buildPublishPayload(values);
    const currentDraftId = draftId;
    const taskTitle = values.title;

    // Trigger mutation with callbacks for background success/error handling
    const mutationCallbacks = {
      onSuccess: () => {
        clearLocalDraft(values.projectId, currentDraftId);
        setDraftId(null);
        lastSavedFingerprintRef.current = "";

        toast.success(`Task "${taskTitle}" created!`);
        onCreated?.();
        // Only close/reset AFTER confirmed success
        if (!createMoreArg) {
          setOpen(false);
        } else {
          resetDraftState(createBaseValues(values.projectId || defaultProjectId, defaultAssigneeIds, defaultStatus));
        }
      },
      onError: (error: any) => {
        const apiError = error as AxiosError<{ message?: string; errors?: string[] }>;
        const message =
          apiError.response?.data?.errors?.[0] ||
          apiError.response?.data?.message ||
          "Failed to create task. Please try again.";
        toast.error(message);
        // DO NOT close modal — user keeps their typed content
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
    <>
      {open ? (
        <CreateTaskRouteBlocker
          shouldBlock={shouldBlockNavigation}
          onBlocked={() => setShowConfirmModal(true)}
          onStateChange={handleBlockerStateChange}
        />
      ) : null}
      <Dialog open={open} onOpenChange={(val) => {
        if (val) {
          setOpen(true);
          return;
        }

        handleAttemptClose();
      }}>
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
        onPointerDownOutside={(e) => {
          e.preventDefault();
          handleAttemptClose();
        }}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleAttemptClose();
        }}
        className="max-w-160 w-[95vw] md:w-full h-fit max-h-[90vh] p-0 overflow-hidden border-border/10 bg-background backdrop-blur-xl shadow-2xl rounded-modal gap-0 flex flex-col"
      >
        {isCheckingDraft ? (
          <div className="flex min-h-80 items-center justify-center text-sm text-muted-foreground">
            Restoring draft...
          </div>
        ) : (
          <div className="relative flex flex-col h-full w-full">
            {wasRestored && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
                <div className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide flex items-center shadow-lg backdrop-blur-md">
                  Restored unsaved draft
                </div>
              </div>
            )}
            <TaskForm
              key={resetKey}
              resetKey={resetKey}
              projects={projects}
              initialValues={initialValues}
              onDiscard={handleDiscard}
              onSaveDraft={handleSaveDraft}
              onValuesChange={handleValuesChange}
              onCloseRequest={handleAttemptClose}
              onSubmit={(values, more) => handleSubmit(values, more)}
              isSubmitting={isSubmitting || isLocalSubmitting}
              isSavingDraft={isSavingDraft}
              submitLabel="Create Task"
              createMore={createMore}
              onCreateMoreChange={setCreateMore}
              defaultStatus={statusPreferenceData?.data?.defaultTaskStatus?.toUpperCase()}
            />
          </div>

        )}
      </DialogContent>
      </Dialog>
      <UnsavedChangesModal
        open={showConfirmModal}
        onOpenChange={(nextOpen) => {
          setShowConfirmModal(nextOpen);
          if (!nextOpen && blockerState === "blocked") {
            blockerResetRef.current?.();
          }
        }}
        onDiscard={handleDiscard}
        onSaveDraft={() => handleSaveDraft(draftValues)}
        isSaving={isSavingDraft}
      />
    </>
  );
}
