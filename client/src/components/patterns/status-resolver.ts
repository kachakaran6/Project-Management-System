import { 
  Circle, 
  CircleDot, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Archive,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  AlertTriangle,
  LucideIcon
} from "lucide-react";

export type SemanticTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface StatusAppearance {
  label: string;
  tone: SemanticTone;
  icon: LucideIcon;
}

export interface PriorityAppearance {
  label: string;
  tone: SemanticTone;
  icon: LucideIcon;
}

/**
 * Maps raw task/project status strings to structured semantic appearances
 */
export function getStatusAppearance(status: string = ""): StatusAppearance {
  const normalized = status.toLowerCase().replace(/[\s-]/g, "_");

  switch (normalized) {
    case "completed":
    case "done":
      return { label: "Completed", tone: "success", icon: CheckCircle2 };

    case "in_progress":
    case "in-progress":
    case "doing":
    case "active":
      return { label: "In Progress", tone: "info", icon: CircleDot };

    case "in_review":
    case "review":
    case "testing":
      return { label: "In Review", tone: "info", icon: Clock };

    case "planning":
    case "backlog":
    case "draft":
    case "todo":
    case "to_do":
      return { label: status ? status.replace(/_/g, " ") : "To Do", tone: "neutral", icon: Circle };

    case "on_hold":
    case "paused":
      return { label: "On Hold", tone: "warning", icon: AlertCircle };

    case "blocked":
    case "cancelled":
    case "failed":
      return { label: status ? status.replace(/_/g, " ") : "Blocked", tone: "danger", icon: XCircle };

    case "archived":
      return { label: "Archived", tone: "neutral", icon: Archive };

    default:
      return {
        label: status ? status.replace(/_/g, " ") : "Unknown",
        tone: "neutral",
        icon: Circle,
      };
  }
}

/**
 * Maps task priority levels to structured semantic appearances
 */
export function getPriorityAppearance(priority: string = ""): PriorityAppearance {
  const normalized = priority.toLowerCase();

  switch (normalized) {
    case "urgent":
    case "critical":
      return { label: "Urgent", tone: "danger", icon: AlertTriangle };

    case "high":
      return { label: "High", tone: "warning", icon: ArrowUp };

    case "medium":
    case "normal":
      return { label: "Medium", tone: "info", icon: ArrowRight };

    case "low":
    case "trivial":
      return { label: "Low", tone: "neutral", icon: ArrowDown };

    default:
      return { label: priority || "None", tone: "neutral", icon: ArrowRight };
  }
}
