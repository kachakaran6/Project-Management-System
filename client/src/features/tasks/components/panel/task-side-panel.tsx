import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
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
import { cn } from "@/lib/utils";
import type { TaskPanelNavigationContext } from "@/features/tasks/utils/task-panel-navigation";
import type { Task } from "@/types/task.types";

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

const TASK_SWIPE_TRIGGER = 84;
const TASK_SWIPE_MAX = 280;
const TASK_SWIPE_AXIS_THRESHOLD = 10;

type SwipeDirection = -1 | 1;

type PendingNavigation = {
  direction: SwipeDirection;
  targetTaskId: string;
  nextContext: TaskPanelNavigationContext;
};

interface TaskDetailBodyProps {
  task: Task;
  taskDetailId: string;
}

interface TaskDetailLayerProps {
  task: Task;
  taskDetailId: string;
  isActive: boolean;
  scrollPosition: number;
  onScrollPositionChange: (taskId: string, scrollTop: number) => void;
}

const TaskDetailBody = memo(function TaskDetailBody({
  task,
  taskDetailId,
}: TaskDetailBodyProps) {
  return (
    <div className="max-w-3xl mx-auto pb-28 sm:pb-4">
      <div className="space-y-2 will-change-transform">
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
      </div>
    </div>
  );
});

const TaskDetailLayer = memo(function TaskDetailLayer({
  task,
  taskDetailId,
  isActive,
  scrollPosition,
  onScrollPositionChange,
}: TaskDetailLayerProps) {
  const layerScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = layerScrollRef.current;
    if (!container) return;
    container.scrollTo({ top: scrollPosition, behavior: "auto" });
  }, [scrollPosition, taskDetailId]);

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      onScrollPositionChange(taskDetailId, event.currentTarget.scrollTop);
    },
    [onScrollPositionChange, taskDetailId],
  );

  return (
    <div
      className={cn(
        "h-full w-full shrink-0 overflow-hidden bg-background",
        !isActive && "pointer-events-none",
      )}
      aria-hidden={!isActive}
    >
      <div
        ref={layerScrollRef}
        className={cn(
          "h-full overflow-y-auto px-4 pt-6 pb-8 sm:px-8 custom-scrollbar",
          !isActive && "select-none",
        )}
        style={{ overscrollBehavior: "contain" }}
        onScroll={handleScroll}
        tabIndex={isActive ? 0 : -1}
        role="region"
        aria-label="Task details"
      >
        <TaskDetailBody task={task} taskDetailId={taskDetailId} />
      </div>
    </div>
  );
});

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
  const prefersReducedMotion = useReducedMotion();
  const urlTaskId = searchParams.get("taskId");
  const [isNavigating, setIsNavigating] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionsRef = useRef<Record<string, number>>({});
  const previousTaskIdRef = useRef<string | null>(null);
  const gestureModeRef = useRef<"idle" | "horizontal" | "vertical">("idle");
  const swipeX = useMotionValue(0);
  const [panelWidth, setPanelWidth] = useState(0);
  const panelTransitionWidth = panelWidth || 800; // Fallback width

  // Current Layer (z-10)
  // When swiping left (next): Moves to -width*0.25, scales to 0.96, dims to 0.4.
  // When swiping right (prev): Moves to width, stays scale 1, no dimming.
  const currentX = useTransform(swipeX, [-panelTransitionWidth, 0, panelTransitionWidth], [-panelTransitionWidth * 0.25, 0, panelTransitionWidth]);
  const currentScale = useTransform(swipeX, [-panelTransitionWidth, 0, panelTransitionWidth], [0.96, 1, 1]);
  const currentDimming = useTransform(swipeX, [-panelTransitionWidth, 0, panelTransitionWidth], [0.4, 0, 0]);

  // Previous Layer (z-0)
  // Only matters when swiping right (prev). Comes from -width*0.25, scales 0.96->1, dimming 0.4->0.
  const previousX = useTransform(swipeX, [0, panelTransitionWidth], [-panelTransitionWidth * 0.25, 0]);
  const previousScale = useTransform(swipeX, [0, panelTransitionWidth], [0.96, 1]);
  const previousDimming = useTransform(swipeX, [0, panelTransitionWidth], [0.4, 0]);

  // Next Layer (z-20)
  // Only matters when swiping left (next). Comes from width->0, scales 0.985->1, content opacity 0.92->1.
  const nextX = useTransform(swipeX, [-panelTransitionWidth, 0], [0, panelTransitionWidth]);
  const nextScale = useTransform(swipeX, [-panelTransitionWidth, 0], [1, 0.985]);
  const nextContentOpacity = useTransform(swipeX, [-panelTransitionWidth, 0], [1, 0.92]);

  const [gesturePreviewDirection, setGesturePreviewDirection] = useState<SwipeDirection | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null);
  const swipeGestureRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastTime: 0,
    axis: "idle" as "idle" | "horizontal" | "vertical",
    direction: 0 as SwipeDirection | 0,
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

  const navigationPreviewTaskId = useMemo(() => {
    if (gesturePreviewDirection === 1) return nextTaskId;
    if (gesturePreviewDirection === -1) return previousTaskId;
    return null;
  }, [gesturePreviewDirection, nextTaskId, previousTaskId]);

  const pendingTaskQuery = useTaskQuery(
    pendingNavigation?.targetTaskId || "",
    isOpen && !!pendingNavigation?.targetTaskId
  );
  const previousTaskQuery = useTaskQuery(
    previousTaskId || "",
    isOpen && !!previousTaskId
  );
  const nextTaskQuery = useTaskQuery(
    nextTaskId || "",
    isOpen && !!nextTaskId
  );

  const pendingTask = pendingTaskQuery.data?.data;
  const previousTask = previousTaskQuery.data?.data || (pendingNavigation?.direction === -1 ? pendingTask : null);
  const nextTask = nextTaskQuery.data?.data || (pendingNavigation?.direction === 1 ? pendingTask : null);

  const activePreviousId = pendingNavigation?.direction === -1 ? pendingNavigation.targetTaskId : previousTaskId;
  const activeNextId = pendingNavigation?.direction === 1 ? pendingNavigation.targetTaskId : nextTaskId;

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

  // Prefetch a window of tasks around the currently selected task to ensure
  // buttery swipe transitions. Fetch up to `prefetchRadius` tasks before and
  // after the current index in the navigation context.
  useEffect(() => {
    if (!isOpen || !activeOrgId || !navigationContext || currentIndex === -1) return;

    const prefetchRadius = 5;
    const start = Math.max(0, currentIndex - prefetchRadius);
    const end = Math.min(taskIds.length - 1, currentIndex + prefetchRadius);

    for (let i = start; i <= end; i++) {
      const id = taskIds[i];
      if (!id || id === selectedTaskId) continue;

      // Fire-and-forget prefetch to populate the cache; errors are non-fatal.
      void queryClient.prefetchQuery({
        queryKey: tasksQueryKeys.detail(id, activeOrgId),
        queryFn: () => taskApi.getTask(id),
        staleTime: 10_000,
      }).catch(() => {
        /* ignore individual prefetch failures */
      });
    }
  }, [activeOrgId, isOpen, navigationContext, currentIndex, queryClient, selectedTaskId, taskIds]);

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

  useEffect(() => {
    const previousTaskId = previousTaskIdRef.current;
    if (previousTaskId && viewportRef.current) {
      scrollPositionsRef.current[previousTaskId] = viewportRef.current.scrollTop;
    }

    previousTaskIdRef.current = selectedTaskId;
  }, [selectedTaskId]);

  useEffect(() => {
    if (!selectedTaskId || !task || !viewportRef.current) return;

    const nextScrollTop = scrollPositionsRef.current[selectedTaskId] ?? 0;
    requestAnimationFrame(() => {
      viewportRef.current?.scrollTo({ top: nextScrollTop, behavior: "auto" });
    });
  }, [selectedTaskId, task]);

  useEffect(() => {
    const container = viewportRef.current;
    if (!container) return;

    container.style.touchAction = "pan-y";
  }, []);

  useEffect(() => {
    const container = viewportRef.current;
    if (!container) return;

    const updateWidth = () => setPanelWidth(container.clientWidth);
    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  const clearGesturePreview = useCallback(() => {
    setGesturePreviewDirection(null);
    if (viewportRef.current) {
      viewportRef.current.style.touchAction = "pan-y";
      viewportRef.current.classList.remove("select-none");
    }
    gestureModeRef.current = "idle";
  }, []);

  const setGestureMode = useCallback((mode: "idle" | "horizontal" | "vertical") => {
    gestureModeRef.current = mode;
    const container = viewportRef.current;
    if (!container) return;

    if (mode === "horizontal") {
      container.style.touchAction = "none";
      container.classList.add("select-none");
    } else {
      container.style.touchAction = "pan-y";
      container.classList.remove("select-none");
    }
  }, []);

  const completeTaskTransition = useCallback((completedNavigation: PendingNavigation) => {
    swipeX.set(0);
    setSelectedTaskId(completedNavigation.targetTaskId);
    setNavigationContext(completedNavigation.nextContext);
    setPendingNavigation(null);
    setIsNavigating(false);
    clearGesturePreview();
  }, [clearGesturePreview, setNavigationContext, setSelectedTaskId, swipeX]);

  const animateSwipeMotion = useCallback(
    (targetX: number, onComplete?: () => void) => {
      animate(swipeX, targetX, {
        type: "spring",
        stiffness: 360,
        damping: 34,
        mass: 0.82,
        onComplete,
      });
    },
    [swipeX],
  );

  const resetSwipeMotion = useCallback(() => {
    animateSwipeMotion(0, () => {
      setPendingNavigation(null);
      setIsNavigating(false);
      clearGesturePreview();
    });
  }, [animateSwipeMotion, clearGesturePreview]);

  const prefetchAdjacentTasks = useCallback(() => {
    if (!isOpen || !activeOrgId) return;

    [previousTaskId, nextTaskId].filter(Boolean).forEach((taskId) => {
      queryClient.prefetchQuery({
        queryKey: tasksQueryKeys.detail(taskId as string, activeOrgId),
        queryFn: () => taskApi.getTask(taskId as string),
        staleTime: 10_000,
      });
    });
  }, [activeOrgId, isOpen, nextTaskId, previousTaskId, queryClient]);

  const startTaskTransition = useCallback(
    async (direction: SwipeDirection, immediateSnap = false) => {
      if (!selectedTaskId || !navigationContext || isNavigating || pendingNavigation) return;

      let nextContext = navigationContext;
      let targetId = currentIndex >= 0 ? taskIds[currentIndex + direction] : undefined;
      const isImmediateSwitch = Boolean(targetId);

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
      const targetX = direction === 1 ? -panelTransitionWidth : panelTransitionWidth;

      if (immediateSnap) {
        if (nextContext !== navigationContext) {
          setNavigationContext(nextContext);
        }

        const newPending: PendingNavigation = {
          direction,
          targetTaskId: targetId,
          nextContext,
        };
        setPendingNavigation(newPending);
        setGesturePreviewDirection(direction);
        animateSwipeMotion(targetX, () => completeTaskTransition(newPending));

        // Fire-and-forget fetch since the user already committed to the gesture
        if (activeOrgId) {
          queryClient.fetchQuery({
            queryKey: tasksQueryKeys.detail(targetId, activeOrgId),
            queryFn: () => taskApi.getTask(targetId as string),
            staleTime: 10_000,
          }).catch(() => {});
        }
      } else {
        try {
          if (nextContext !== navigationContext) {
            setNavigationContext(nextContext);
          }

          if (activeOrgId) {
            await queryClient.fetchQuery({
              queryKey: tasksQueryKeys.detail(targetId, activeOrgId),
              queryFn: () => taskApi.getTask(targetId as string),
              staleTime: 10_000,
            });
          }

          const newPending: PendingNavigation = {
            direction,
            targetTaskId: targetId,
            nextContext,
          };
          setPendingNavigation(newPending);
          setGesturePreviewDirection(direction);

          animateSwipeMotion(targetX, () => completeTaskTransition(newPending));
        } catch {
          if (nextContext === navigationContext) {
            setNavigationContext({
              ...navigationContext,
              taskIds: navigationContext.taskIds.filter((id) => id !== targetId),
            });
          }
          if (isImmediateSwitch) {
            toast.error("That task is no longer available");
          }
          setIsNavigating(false);
          setPendingNavigation(null);
          clearGesturePreview();
          animateSwipeMotion(0);
        }
      }
    },
    [
      activeOrgId,
      animateSwipeMotion,
      completeTaskTransition,
      currentIndex,
      fetchContextPage,
      isNavigating,
      navigationContext,
      panelTransitionWidth,
      pendingNavigation,
      queryClient,
      selectedTaskId,
      setNavigationContext,
      taskIds,
      clearGesturePreview,
    ],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      !navigationEnabled ||
      prefersReducedMotion ||
      isInteractiveGestureTarget(event.target) ||
      event.pointerType === "mouse"
    ) {
      return;
    }

    swipeGestureRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastTime: performance.now(),
      axis: "idle",
      direction: 0,
    };

    setGestureMode("idle");
    prefetchAdjacentTasks();

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Best-effort only. Pointer capture is not available in every environment.
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = swipeGestureRef.current;
    if (!gesture.active || gesture.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (gesture.axis === "idle") {
      if (absX < TASK_SWIPE_AXIS_THRESHOLD && absY < TASK_SWIPE_AXIS_THRESHOLD) {
        return;
      }

      if (absY > absX * 1.15) {
        gesture.axis = "vertical";
        setGestureMode("vertical");
        return;
      }

      gesture.axis = "horizontal";
      setGestureMode("horizontal");
      const nextDirection: SwipeDirection = deltaX < 0 ? 1 : -1;
      gesture.direction = nextDirection;
      if (nextDirection === 1 ? nextTaskId : previousTaskId) {
        setGesturePreviewDirection(nextDirection);
      }
    }

    if (gesture.axis !== "horizontal") return;

    event.preventDefault();

    const nextDirection: SwipeDirection = deltaX < 0 ? 1 : -1;
    if (gesture.direction !== nextDirection) {
      gesture.direction = nextDirection;
      if ((nextDirection === 1 && nextTaskId) || (nextDirection === -1 && previousTaskId)) {
        setGesturePreviewDirection(nextDirection);
      }
    }

    const isAtLeftEdge = !canGoPrevious || !previousTask;
    const isAtRightEdge = !canGoNext || (!nextTask && !pendingNavigation);
    const isAtEdge = deltaX > 0 ? isAtLeftEdge : isAtRightEdge;
    const resistance = isAtEdge ? 0.15 : 1;
    const boundedDelta = Math.max(-panelTransitionWidth, Math.min(panelTransitionWidth, deltaX));
    swipeX.set(boundedDelta * resistance);

    gesture.lastX = event.clientX;
    gesture.lastTime = performance.now();
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = swipeGestureRef.current;
    if (!gesture.active || gesture.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    const now = performance.now();
    const elapsed = Math.max(16, now - gesture.lastTime);
    const velocityX = (event.clientX - gesture.lastX) / elapsed;
    const projectedDeltaX = deltaX + velocityX * 220;
    const wasHorizontal = gesture.axis === "horizontal";

    gesture.active = false;
    gesture.pointerId = -1;
    gesture.axis = "idle";
    gesture.direction = 0;
    setGestureMode("idle");

    const absX = Math.abs(projectedDeltaX);
    const absY = Math.abs(deltaY);

    const isAtLeftEdge = !canGoPrevious || !previousTask;
    const isAtRightEdge = !canGoNext || (!nextTask && !pendingNavigation);

    const shouldNavigate =
      wasHorizontal &&
      absX >= TASK_SWIPE_TRIGGER &&
      absX > absY * 1.05 &&
      ((projectedDeltaX < 0 && !isAtRightEdge) || (projectedDeltaX > 0 && !isAtLeftEdge));

    if (shouldNavigate) {
      const direction: SwipeDirection = projectedDeltaX < 0 ? 1 : -1;
      void startTaskTransition(direction, true); // True for immediate snap
      return;
    }

    resetSwipeMotion();
  };

  const handlePointerCancel = () => {
    const gesture = swipeGestureRef.current;
    gesture.active = false;
    gesture.pointerId = -1;
    gesture.axis = "idle";
    gesture.direction = 0;
    setGestureMode("idle");
    resetSwipeMotion();
  };

  const handleKeyboardNavigation = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || isInteractiveGestureTarget(event.target)) return;

    if (event.key === "ArrowLeft" && canGoPrevious && !isNavigating) {
      event.preventDefault();
      void startTaskTransition(-1);
    }

    if (event.key === "ArrowRight" && canGoNext && !isNavigating) {
      event.preventDefault();
      void startTaskTransition(1);
    }
  };

  const taskDetailId = task?.id || (task as any)?._id || selectedTaskId || "";
  const isTaskContentLoading = isLoading && !task;
  const isTransitionActive = Boolean(pendingNavigation);

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

          <div
            ref={viewportRef}
            className="relative flex-1 overflow-hidden"
          >
            {isTaskContentLoading ? (
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
                className="relative h-full w-full overflow-hidden bg-black" // Solid black background for physical depth recess
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerCancel}
                onKeyDownCapture={handleKeyboardNavigation}
                tabIndex={0}
                role="region"
                aria-label="Task details swipe container"
                style={{ touchAction: "none" }}
              >
                {/* PREVIOUS TASK */}
                {previousTask && activePreviousId && (
                  <motion.div
                    className="absolute inset-0 z-0 bg-background"
                    style={{
                      x: previousX,
                      scale: previousScale,
                      pointerEvents: swipeX.get() > 0 ? "auto" : "none",
                    }}
                  >
                    <TaskDetailLayer
                      task={previousTask}
                      taskDetailId={activePreviousId}
                      isActive={false}
                      scrollPosition={scrollPositionsRef.current[activePreviousId] ?? 0}
                      onScrollPositionChange={(taskId, scrollTop) => {
                        scrollPositionsRef.current[taskId] = scrollTop;
                      }}
                    />
                    <motion.div 
                      className="absolute inset-0 bg-black pointer-events-none" 
                      style={{ opacity: previousDimming }} 
                    />
                  </motion.div>
                )}

                {/* CURRENT TASK */}
                <motion.div
                  className="absolute inset-0 z-10 bg-background shadow-[0_0_40px_rgba(0,0,0,0.2)]"
                  style={{
                    x: currentX,
                    scale: currentScale,
                  }}
                >
                  <TaskDetailLayer
                    task={task}
                    taskDetailId={taskDetailId}
                    isActive={!isTransitionActive}
                    scrollPosition={scrollPositionsRef.current[selectedTaskId || taskDetailId] ?? 0}
                    onScrollPositionChange={(taskId, scrollTop) => {
                      scrollPositionsRef.current[taskId] = scrollTop;
                    }}
                  />
                  <motion.div 
                    className="absolute inset-0 bg-black pointer-events-none" 
                    style={{ opacity: currentDimming }} 
                  />
                </motion.div>

                {/* NEXT TASK */}
                {nextTask && activeNextId && (
                  <motion.div
                    className="absolute inset-0 z-20 bg-background shadow-[-20px_0_40px_rgba(0,0,0,0.2)]"
                    style={{
                      x: nextX,
                      scale: nextScale,
                      pointerEvents: swipeX.get() < 0 ? "auto" : "none",
                    }}
                  >
                    <motion.div className="h-full w-full" style={{ opacity: nextContentOpacity }}>
                      <TaskDetailLayer
                        task={nextTask}
                        taskDetailId={activeNextId}
                        isActive={false}
                        scrollPosition={scrollPositionsRef.current[activeNextId] ?? 0}
                        onScrollPositionChange={(taskId, scrollTop) => {
                          scrollPositionsRef.current[taskId] = scrollTop;
                        }}
                      />
                    </motion.div>
                  </motion.div>
                )}
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
                onPrevious={() => void startTaskTransition(-1)}
                onNext={() => void startTaskTransition(1)}
              />
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
