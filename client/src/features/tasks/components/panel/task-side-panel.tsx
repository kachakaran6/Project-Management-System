import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { History, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/hooks/use-media-query";
import { usePathname, useRouter, useSearchParams } from "@/lib/next-navigation";
import { useAppSelector } from "@/hooks/useAppSelector";
import { taskApi } from "@/features/tasks/api/task.api";
import {
  tasksQueryKeys,
  useTaskQuery,
} from "@/features/tasks/hooks/use-tasks-query";
import { useTaskPanelStore } from "@/features/tasks/store/task-panel-store";
import { TaskStatusHistory } from "../task-status-history";
import { GithubLinkingGuidance } from "./github-linking-guidance";
import { TaskComments } from "./task-comments";
import { TaskDescription } from "./task-description";
import { TaskGithubActivity } from "./task-github-activity";
import { TaskHeader } from "./task-header";
import { TaskLinkedPages } from "./task-linked-pages";
import { TaskMobileNavigation } from "./task-mobile-navigation";
import { TaskProperties } from "./task-properties";

function getResponseTaskIds(response: any) {
  return (response?.data?.items ?? [])
    .map((task: any) => String(task?.id || task?._id || ""))
    .filter(Boolean);
}

function isInteractiveGestureTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      "button, a, input, textarea, select, [contenteditable='true'], .ProseMirror, [data-swipe-ignore='true']",
    ),
  );
}

export function TaskSidePanel() {
  const {
    isOpen,
    closePanel,
    openPanel,
    selectedTaskId,
    setSelectedTaskId,
    navigationContext,
    setNavigationContext,
  } = useTaskPanelStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const activeOrgId = useAppSelector((state) => state.auth.activeOrgId);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const urlTaskId = searchParams.get("taskId");
  const [navigationDirection, setNavigationDirection] = useState<-1 | 0 | 1>(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionsRef = useRef<Record<string, number>>({});
  const previousTaskIdRef = useRef<string | null>(null);
  const touchStateRef = useRef({
    tracking: false,
    startX: 0,
    startY: 0,
    deltaX: 0,
    deltaY: 0,
  });
  const latestPanelStateRef = useRef({
    isOpen,
    selectedTaskId,
    navigationContext,
  });

  useEffect(() => {
    latestPanelStateRef.current = {
      isOpen,
      selectedTaskId,
      navigationContext,
    };
  }, [isOpen, navigationContext, selectedTaskId]);

  useEffect(() => {
    const currentState = latestPanelStateRef.current;

    if (!urlTaskId) {
      if (currentState.isOpen || currentState.selectedTaskId) {
        closePanel();
      }
      return;
    }

    if (!currentState.isOpen) {
      openPanel(
        urlTaskId,
        currentState.selectedTaskId === urlTaskId
          ? currentState.navigationContext
          : null,
      );
      return;
    }

    if (currentState.selectedTaskId === urlTaskId) {
      return;
    }

    const isTaskInCurrentContext = Boolean(
      currentState.navigationContext?.taskIds.includes(urlTaskId),
    );

    if (isTaskInCurrentContext) {
      setSelectedTaskId(urlTaskId);
    } else {
      openPanel(urlTaskId, null);
    }
  }, [closePanel, openPanel, setSelectedTaskId, urlTaskId]);

  useEffect(() => {
    if (!isOpen || !selectedTaskId) return;

    const params = new URLSearchParams(searchParams.toString());
    if (params.get("taskId") === selectedTaskId) return;
    params.set("taskId", selectedTaskId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [isOpen, pathname, router, searchParams, selectedTaskId]);

  const handleOpenChange = (open: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (open) {
      if (selectedTaskId) {
        params.set("taskId", selectedTaskId);
      }
    } else {
      params.delete("taskId");
      closePanel();
    }

    const nextQuery = params.toString();
    const nextHref = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    const currentHref = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    if (nextHref !== currentHref) {
      router.replace(nextHref, { scroll: false });
    }
  };

  const { data, isLoading, error } = useTaskQuery(selectedTaskId || "", isOpen);
  const task = data?.data;
  const taskIds = navigationContext?.taskIds ?? [];
  const currentIndex = selectedTaskId ? taskIds.indexOf(selectedTaskId) : -1;

  const canGoPrevious = Boolean(
    selectedTaskId &&
      navigationContext &&
      (currentIndex > 0 ||
        (navigationContext.mode === "paginated-list" &&
          (navigationContext.page ?? 1) > 1)),
  );
  const canGoNext = Boolean(
    selectedTaskId &&
      navigationContext &&
      (currentIndex >= 0 && currentIndex < taskIds.length - 1
        ? true
        : navigationContext.mode === "paginated-list" &&
          (navigationContext.page ?? 1) < (navigationContext.totalPages ?? 1)),
  );

  const navigationEnabled = Boolean(
    isMobile &&
      navigationContext &&
      (taskIds.length > 1 ||
        (navigationContext.mode === "paginated-list" &&
          (navigationContext.totalPages ?? 1) > 1)),
  );

  const previousTaskId =
    currentIndex > 0 ? taskIds[currentIndex - 1] : null;
  const nextTaskId =
    currentIndex >= 0 && currentIndex < taskIds.length - 1
      ? taskIds[currentIndex + 1]
      : null;

  const positionLabel = useMemo(() => {
    if (!navigationContext) return "";
    if (currentIndex === -1) return "Task is outside the current filtered view";

    if (navigationContext.mode === "paginated-list") {
      return `Task ${currentIndex + 1} of ${taskIds.length} on page ${navigationContext.page ?? 1} of ${navigationContext.totalPages ?? 1}`;
    }

    return `Task ${currentIndex + 1} of ${taskIds.length}`;
  }, [currentIndex, navigationContext, taskIds.length]);

  const fetchContextPage = useCallback(
    async (pageNumber: number) => {
      if (
        !navigationContext ||
        navigationContext.mode !== "paginated-list" ||
        !activeOrgId
      ) {
        return [];
      }

      const filters = {
        ...navigationContext.filters,
        page: pageNumber,
        limit: navigationContext.limit,
      };

      const response = await queryClient.fetchQuery({
        queryKey: tasksQueryKeys.list(filters, activeOrgId),
        queryFn: () => taskApi.getTasks(filters),
        staleTime: 10_000,
      });

      return getResponseTaskIds(response);
    },
    [activeOrgId, navigationContext, queryClient],
  );

  useEffect(() => {
    if (!isOpen || !activeOrgId) return;

    [previousTaskId, nextTaskId].filter(Boolean).forEach((taskId) => {
      queryClient.prefetchQuery({
        queryKey: tasksQueryKeys.detail(taskId as string, activeOrgId),
        queryFn: () => taskApi.getTask(taskId as string),
        staleTime: 10_000,
      });
    });
  }, [activeOrgId, isOpen, nextTaskId, previousTaskId, queryClient]);

  useEffect(() => {
    if (
      !navigationContext ||
      navigationContext.mode !== "paginated-list" ||
      !activeOrgId ||
      currentIndex === -1
    ) {
      return;
    }

    const currentPage = navigationContext.page ?? 1;
    const totalPages = navigationContext.totalPages ?? 1;

    if (currentIndex <= 1 && currentPage > 1) {
      const previousPageFilters = {
        ...navigationContext.filters,
        page: currentPage - 1,
        limit: navigationContext.limit,
      };

      queryClient.prefetchQuery({
        queryKey: tasksQueryKeys.list(previousPageFilters, activeOrgId),
        queryFn: () => taskApi.getTasks(previousPageFilters),
        staleTime: 10_000,
      });
    }

    if (currentIndex >= taskIds.length - 2 && currentPage < totalPages) {
      const nextPageFilters = {
        ...navigationContext.filters,
        page: currentPage + 1,
        limit: navigationContext.limit,
      };

      queryClient.prefetchQuery({
        queryKey: tasksQueryKeys.list(nextPageFilters, activeOrgId),
        queryFn: () => taskApi.getTasks(nextPageFilters),
        staleTime: 10_000,
      });
    }
  }, [activeOrgId, currentIndex, navigationContext, queryClient, taskIds.length]);

  const navigateTask = useCallback(
    async (direction: -1 | 1) => {
      if (!selectedTaskId || !navigationContext || isNavigating) return;

      let nextContext = navigationContext;
      let targetId =
        currentIndex >= 0 ? taskIds[currentIndex + direction] : undefined;

      if (
        !targetId &&
        navigationContext.mode === "paginated-list" &&
        navigationContext.page &&
        navigationContext.totalPages
      ) {
        const candidatePage = navigationContext.page + direction;
        const withinPageRange =
          candidatePage >= 1 && candidatePage <= navigationContext.totalPages;

        if (withinPageRange) {
          const pageTaskIds = await fetchContextPage(candidatePage);
          if (pageTaskIds.length > 0) {
            nextContext = {
              ...navigationContext,
              page: candidatePage,
              taskIds: pageTaskIds,
            };
            targetId =
              direction === 1
                ? pageTaskIds[0]
                : pageTaskIds[pageTaskIds.length - 1];
          }
        }
      }

      if (!targetId) {
        toast(
          direction === 1
            ? "You're at the last task in this view"
            : "You're at the first task in this view",
        );
        return;
      }

      setIsNavigating(true);

      try {
        if (activeOrgId) {
          await queryClient.fetchQuery({
            queryKey: tasksQueryKeys.detail(targetId, activeOrgId),
            queryFn: () => taskApi.getTask(targetId as string),
            staleTime: 10_000,
          });
        }

        setNavigationDirection(direction);
        if (nextContext !== navigationContext) {
          setNavigationContext(nextContext);
        }
        setSelectedTaskId(targetId);
      } catch {
        if (nextContext === navigationContext) {
          setNavigationContext({
            ...navigationContext,
            taskIds: navigationContext.taskIds.filter((id) => id !== targetId),
          });
        }
        toast.error("That task is no longer available");
      } finally {
        setIsNavigating(false);
      }
    },
    [
      activeOrgId,
      currentIndex,
      fetchContextPage,
      isNavigating,
      navigationContext,
      queryClient,
      selectedTaskId,
      setNavigationContext,
      setSelectedTaskId,
      taskIds,
    ],
  );

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (!selectedTaskId) return;
      scrollPositionsRef.current[selectedTaskId] = event.currentTarget.scrollTop;
    },
    [selectedTaskId],
  );

  useEffect(() => {
    const previousTaskId = previousTaskIdRef.current;
    if (previousTaskId && scrollContainerRef.current) {
      scrollPositionsRef.current[previousTaskId] =
        scrollContainerRef.current.scrollTop;
    }

    previousTaskIdRef.current = selectedTaskId;
  }, [selectedTaskId]);

  useEffect(() => {
    if (!selectedTaskId || !task || !scrollContainerRef.current) return;

    const nextScrollTop = scrollPositionsRef.current[selectedTaskId] ?? 0;
    requestAnimationFrame(() => {
      scrollContainerRef.current?.scrollTo({ top: nextScrollTop, behavior: "auto" });
    });
  }, [selectedTaskId, task]);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!navigationEnabled || isInteractiveGestureTarget(event.target)) {
      touchStateRef.current.tracking = false;
      return;
    }

    const touch = event.changedTouches[0];
    touchStateRef.current = {
      tracking: true,
      startX: touch.clientX,
      startY: touch.clientY,
      deltaX: 0,
      deltaY: 0,
    };
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStateRef.current.tracking) return;

    const touch = event.changedTouches[0];
    touchStateRef.current.deltaX = touch.clientX - touchStateRef.current.startX;
    touchStateRef.current.deltaY = touch.clientY - touchStateRef.current.startY;
  };

  const handleTouchEnd = () => {
    const { tracking, deltaX, deltaY } = touchStateRef.current;
    touchStateRef.current.tracking = false;

    if (!tracking) return;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    if (absX < 72 || absX < absY * 1.35) return;

    void navigateTask(deltaX < 0 ? 1 : -1);
  };

  const taskDetailId = task?.id || (task as any)?._id || selectedTaskId || "";

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        hideClose={true}
        className="size-full border-l bg-background p-0 shadow-2xl focus:outline-none sm:max-w-[50vw] xl:max-w-[40vw]"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Task Side Panel</SheetTitle>
          <SheetDescription>
            View and navigate task details without leaving the current task list.
          </SheetDescription>
        </SheetHeader>

        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b bg-muted/5 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <Badge
                variant="outline"
                className="rounded-xs bg-background px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
              >
                Task Details
              </Badge>
              {navigationEnabled && navigationContext ? (
                <span className="truncate text-[11px] font-medium text-muted-foreground">
                  {navigationContext.sourceLabel}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="rounded-button p-2 text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
              aria-label="Close task details"
            >
              <X className="size-4.5 transition-transform duration-300 hover:rotate-90" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="space-y-6 p-4 sm:p-8">
                <Skeleton className="h-10 w-3/4" />
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <div className="space-y-4 pt-8">
                  <Skeleton className="h-8 w-1/4" />
                  <div className="flex gap-4">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 flex-1" />
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="space-y-4 p-6 text-center sm:p-12">
                <div className="inline-flex size-12 items-center justify-center rounded-button bg-red-100 text-red-600">
                  <X className="size-6" />
                </div>
                <h3 className="text-lg font-semibold">Failed to load task</h3>
                <p className="text-sm text-muted-foreground">
                  This task might have been deleted or you no longer have access
                  to it.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenChange(false)}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Close details
                </button>
              </div>
            ) : task ? (
              <div
                ref={scrollContainerRef}
                className="h-full overflow-y-auto px-4 pt-6 pb-8 sm:px-8 custom-scrollbar"
                onScroll={handleScroll}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div className="max-w-3xl mx-auto pb-28 sm:pb-4">
                  <AnimatePresence initial={false} custom={navigationDirection} mode="wait">
                    <motion.div
                      key={selectedTaskId}
                      custom={navigationDirection}
                      initial={{
                        opacity: 0,
                        x: navigationDirection === 0 ? 0 : navigationDirection * 24,
                      }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{
                        opacity: 0,
                        x: navigationDirection === 0 ? 0 : navigationDirection * -24,
                      }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="space-y-2"
                    >
                      <TaskHeader task={task} />
                      <TaskProperties task={task} />
                      <GithubLinkingGuidance
                        taskCode={task.taskCode}
                        projectId={
                          typeof task.projectId === "string"
                            ? task.projectId
                            : (task.projectId as any)?.id ||
                              (task.projectId as any)?._id
                        }
                        isProjectConnected={
                          !!(task.projectId as any)?.githubSettings?.repoUrl ||
                          !!(task as any).project?.githubSettings?.repoUrl
                        }
                      />
                      <TaskDescription task={task} />

                      <TaskLinkedPages taskId={taskDetailId} />

                      <TaskGithubActivity links={task.githubLinks || []} />

                      <div className="pb-4 pt-8">
                        <div className="mb-4 flex items-center gap-2">
                          <div className="flex size-8 items-center justify-center rounded-button bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20">
                            <History className="size-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-foreground/90">
                              Status Timeline
                            </h3>
                            <p className="text-[10px] font-medium text-muted-foreground">
                              Full audit trail of status changes
                            </p>
                          </div>
                        </div>
                        <TaskStatusHistory taskId={taskDetailId} />
                      </div>

                      <div className="border-t pt-2" />
                      <TaskComments taskId={taskDetailId} />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            ) : null}
          </div>

          {navigationEnabled && navigationContext ? (
            <>
              <div className="sr-only" aria-live="polite">
                {navigationContext.sourceLabel}. {positionLabel}
              </div>
              <TaskMobileNavigation
                sourceLabel={navigationContext.sourceLabel}
                positionLabel={positionLabel}
                canGoPrevious={canGoPrevious}
                canGoNext={canGoNext}
                isNavigating={isNavigating}
                onPrevious={() => void navigateTask(-1)}
                onNext={() => void navigateTask(1)}
              />
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
