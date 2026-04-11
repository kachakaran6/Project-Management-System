import { z } from "zod";

export const inviteMemberSchema = z.object({
  email: z.string().email("Enter a valid email"),
  role: z.enum(["ADMIN", "MANAGER", "MEMBER"]),
});

export type InviteMemberValues = z.infer<typeof inviteMemberSchema>;
