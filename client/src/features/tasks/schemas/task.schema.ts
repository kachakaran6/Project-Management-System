import { z } from "zod";

export const taskFormSchema = z.object({
  title: z.string().min(2, "Task title is required").max(160),
  description: z.string().max(2500).optional().or(z.literal("")),
  status: z.enum([
    "BACKLOG",
    "TODO",
    "IN_PROGRESS",
    "IN_REVIEW",
    "DONE",
    "REJECTED",
    "ARCHIVED",
  ]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  projectId: z.string().min(1, "Project is required"),
  assigneeIds: z.array(z.string()).optional(),
  dueDate: z.string().optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;
