import { z } from "zod";

export const projectFormSchema = z.object({
  name: z.string().min(2, "Project name is required").max(120),
  description: z.string().max(2000).optional().or(z.literal("")),
  status: z.enum(["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
