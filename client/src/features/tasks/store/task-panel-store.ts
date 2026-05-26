import { create } from "zustand";

import type { TaskPanelNavigationContext } from "@/features/tasks/utils/task-panel-navigation";

interface TaskPanelState {
  selectedTaskId: string | null;
  isOpen: boolean;
  navigationContext: TaskPanelNavigationContext | null;

  openPanel: (
    taskId: string,
    navigationContext?: TaskPanelNavigationContext | null,
  ) => void;
  closePanel: () => void;
  setSelectedTaskId: (taskId: string | null) => void;
  setNavigationContext: (
    navigationContext: TaskPanelNavigationContext | null,
  ) => void;
}

export const useTaskPanelStore = create<TaskPanelState>((set) => ({
  selectedTaskId: null,
  isOpen: false,
  navigationContext: null,

  openPanel: (taskId, navigationContext = null) =>
    set({ selectedTaskId: taskId, isOpen: true, navigationContext }),
  closePanel: () =>
    set({ selectedTaskId: null, isOpen: false, navigationContext: null }),
  setSelectedTaskId: (taskId) => set({ selectedTaskId: taskId }),
  setNavigationContext: (navigationContext) => set({ navigationContext }),
}));
