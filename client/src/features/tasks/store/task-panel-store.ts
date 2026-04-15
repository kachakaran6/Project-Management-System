import { create } from "zustand";

interface TaskPanelState {
  selectedTaskId: string | null;
  isOpen: boolean;

  openPanel: (taskId: string) => void;
  closePanel: () => void;
  setSelectedTaskId: (taskId: string | null) => void;
}

export const useTaskPanelStore = create<TaskPanelState>((set) => ({
  selectedTaskId: null,
  isOpen: false,

  openPanel: (taskId) => set({ selectedTaskId: taskId, isOpen: true }),
  closePanel: () => set({ selectedTaskId: null, isOpen: false }),
  setSelectedTaskId: (taskId) => set({ selectedTaskId: taskId }),
}));
