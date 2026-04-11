"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InviteMemberValues,
  inviteMemberSchema,
} from "@/features/team/schemas/invite.schema";

interface InviteMemberFormProps {
  onSubmit: (values: InviteMemberValues) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function InviteMemberForm({
  onSubmit,
  isSubmitting = false,
}: InviteMemberFormProps) {
  const form = useForm<InviteMemberValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: "",
      role: "MEMBER",
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => onSubmit(values))}
    >
      <div className="space-y-2">
        <Label htmlFor="email">Member Email</Label>
        <Input
          id="email"
          type="email"
          {...form.register("email")}
          placeholder="engineer@company.com"
        />
        {form.formState.errors.email ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>Role</Label>
        <Select
          value={form.watch("role")}
          onValueChange={(value) =>
            form.setValue("role", value as InviteMemberValues["role"], {
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="MANAGER">Manager</SelectItem>
            <SelectItem value="MEMBER">Member</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        Send Invite
      </Button>
    </form>
  );
}
