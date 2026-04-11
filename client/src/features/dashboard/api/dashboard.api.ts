import { projectApi } from "@/features/projects/api/project.api";
import { taskApi } from "@/features/tasks/api/task.api";
import { userApi } from "@/features/users/api/user.api";
import { Project } from "@/types/project.types";
import { Task } from "@/types/task.types";

export interface DashboardStats {
  totalProjects: number;
  activeTasks: number;
  completedTasks: number;
  teamMembers: number | null;
  trends: {
    totalProjects: number;
    activeTasks: number;
    completedTasks: number;
    teamMembers: number;
  };
}

export interface TaskStatusDatum {
  name: "Todo" | "In Progress" | "Done";
  value: number;
}

export interface ActivityTrendDatum {
  date: string;
  createdTasks: number;
}

export interface ProductivityDatum {
  priority: string;
  count: number;
}

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  entity: string;
  createdAt: string;
  type: "task" | "project";
}

function isDoneStatus(status: Task["status"]) {
  return status === "DONE" || status === "ARCHIVED";
}

function isInProgressStatus(status: Task["status"]) {
  return status === "IN_PROGRESS" || status === "IN_REVIEW";
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function toStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function buildActivityFeed(projects: Project[], tasks: Task[]): ActivityItem[] {
  const projectItems: ActivityItem[] = projects.map((project) => ({
    id: `project-${project.id}`,
    actor: "Workspace",
    action: "created project",
    entity: project.name,
    createdAt: project.createdAt,
    type: "project",
  }));

  const taskItems: ActivityItem[] = tasks.map((task) => ({
    id: `task-${task.id}`,
    actor: "Workspace",
    action: "created task",
    entity: task.title,
    createdAt: task.createdAt,
    type: "task",
  }));

  return [...projectItems, ...taskItems]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 8);
}

export const dashboardApi = {
  async getDashboardStats(): Promise<DashboardStats> {
    const [projectResult, taskResult] = await Promise.all([
      projectApi.getProjects({ page: 1, limit: 200 }),
      taskApi.getTasks({ page: 1, limit: 300 }),
    ]);

    const projects = projectResult.data.items;
    const tasks = taskResult.data.items;

    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    const recentProjects = projects.filter(
      (project) => now - new Date(project.createdAt).getTime() <= sevenDays,
    ).length;

    const recentCompletedTasks = tasks.filter(
      (task) =>
        isDoneStatus(task.status) &&
        now - new Date(task.updatedAt).getTime() <= sevenDays,
    ).length;

    const activeTasks = tasks.filter(
      (task) => !isDoneStatus(task.status),
    ).length;
    const completedTasks = tasks.filter((task) =>
      isDoneStatus(task.status),
    ).length;

    let teamMembers: number | null = null;
    try {
      const usersResult = await userApi.listUsers();
      teamMembers = usersResult.data.length;
    } catch {
      teamMembers = null;
    }

    return {
      totalProjects: projects.length,
      activeTasks,
      completedTasks,
      teamMembers,
      trends: {
        totalProjects: recentProjects,
        activeTasks: tasks.filter(
          (task) => now - new Date(task.createdAt).getTime() <= sevenDays,
        ).length,
        completedTasks: recentCompletedTasks,
        teamMembers: 0,
      },
    };
  },

  async getTaskStats(): Promise<{
    status: TaskStatusDatum[];
    trend: ActivityTrendDatum[];
    productivity: ProductivityDatum[];
  }> {
    const taskResult = await taskApi.getTasks({ page: 1, limit: 400 });
    const tasks = taskResult.data.items;

    const status: TaskStatusDatum[] = [
      {
        name: "Todo",
        value: tasks.filter(
          (task) => task.status === "BACKLOG" || task.status === "TODO",
        ).length,
      },
      {
        name: "In Progress",
        value: tasks.filter((task) => isInProgressStatus(task.status)).length,
      },
      {
        name: "Done",
        value: tasks.filter((task) => isDoneStatus(task.status)).length,
      },
    ];

    const dayBuckets = new Map<string, number>();
    for (let i = 13; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dayBuckets.set(formatDateLabel(date), 0);
    }

    tasks.forEach((task) => {
      const createdAt = toStartOfDay(new Date(task.createdAt));
      const key = formatDateLabel(createdAt);
      if (dayBuckets.has(key)) {
        dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1);
      }
    });

    const trend: ActivityTrendDatum[] = Array.from(dayBuckets.entries()).map(
      ([date, createdTasks]) => ({
        date,
        createdTasks,
      }),
    );

    const productivity: ProductivityDatum[] = [
      {
        priority: "Low",
        count: tasks.filter((task) => task.priority === "LOW").length,
      },
      {
        priority: "Medium",
        count: tasks.filter((task) => task.priority === "MEDIUM").length,
      },
      {
        priority: "High",
        count: tasks.filter((task) => task.priority === "HIGH").length,
      },
      {
        priority: "Urgent",
        count: tasks.filter((task) => task.priority === "URGENT").length,
      },
    ];

    return { status, trend, productivity };
  },

  async getActivity(): Promise<ActivityItem[]> {
    const [projectResult, taskResult] = await Promise.all([
      projectApi.getProjects({ page: 1, limit: 50 }),
      taskApi.getTasks({ page: 1, limit: 80 }),
    ]);

    return buildActivityFeed(projectResult.data.items, taskResult.data.items);
  },
};
