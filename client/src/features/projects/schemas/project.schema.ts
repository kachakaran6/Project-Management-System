import { z } from "zod";

export const projectFormSchema = z.object({
  name: z.string().min(2, "Project name is required").max(120),
  description: z.string().max(2000).optional().or(z.literal("")),
  status: z.enum(["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]),
  visibility: z.enum(["public", "private"]).default("public"),
  techStack: z.array(z.string()).default([]),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
  members: z.array(z.string()).default([]),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
