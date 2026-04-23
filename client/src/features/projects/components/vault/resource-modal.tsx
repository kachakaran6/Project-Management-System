"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  useCreateResourceMutation, 
  useUpdateResourceMutation 
} from "../../hooks/use-project-resources";
import { ProjectResource, ResourceType } from "../../api/project-resources.api";
import { Globe, Lock, FileText, Loader2 } from "lucide-react";

const resourceSchema = z.object({
  title: z.string().min(2, "Title is required"),
  type: z.enum(["link", "credential", "note"]),
  url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  username: z.string().optional(),
  password: z.string().optional(),
  description: z.string().optional(),
  tags: z.string().optional(), // We'll split this into an array
});

type ResourceFormValues = z.infer<typeof resourceSchema>;

interface ResourceModalProps {
  projectId: string;
  resource?: ProjectResource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResourceModal({
  projectId,
  resource,
  open,
  onOpenChange,
}: ResourceModalProps) {
  const createMutation = useCreateResourceMutation(projectId);
  const updateMutation = useUpdateResourceMutation(projectId, resource?.id || "");

  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      title: "",
      type: "link",
      url: "",
      username: "",
      password: "",
      description: "",
      tags: "",
    },
  });

  useEffect(() => {
    if (resource) {
      form.reset({
        title: resource.title,
        type: resource.type,
        url: resource.url || "",
        username: resource.username || "",
        password: resource.password || "", // This will be '********' if from list, or real if from detail
        description: resource.description || "",
        tags: resource.tags?.join(", ") || "",
      });
    } else {
      form.reset({
        title: "",
        type: "link",
        url: "",
        username: "",
        password: "",
        description: "",
        tags: "",
      });
    }
  }, [resource, form, open]);

  const onSubmit = async (values: ResourceFormValues) => {
    const payload = {
      ...values,
      tags: values.tags ? values.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    };

    if (resource) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const resourceType = form.watch("type");
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            {resource ? "Edit Resource" : "Add New Resource"}
          </DialogTitle>
          <DialogDescription>
            {resource ? "Update your project resource details." : "Add a link, credential, or note to your project vault."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resource Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl h-11 bg-muted/20 border-border/40">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="link">
                        <div className="flex items-center gap-2">
                          <Globe className="size-4 text-blue-500" />
                          <span>Web Link</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="credential">
                        <div className="flex items-center gap-2">
                          <Lock className="size-4 text-amber-500" />
                          <span>Credential</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="note">
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 text-emerald-500" />
                          <span>Note / Documentation</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. AWS Console, Staging DB, API Docs" 
                      className="rounded-xl h-11 bg-muted/20 border-border/40" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(resourceType === "link" || resourceType === "credential") && (
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://..." 
                        className="rounded-xl h-11 bg-muted/20 border-border/40" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {resourceType === "credential" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username / Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Username" 
                          className="rounded-xl h-11 bg-muted/20 border-border/40" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder={resource ? "Leave blank to keep current" : "Password"} 
                          className="rounded-xl h-11 bg-muted/20 border-border/40" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description / Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional details about this resource..." 
                      className="rounded-xl min-h-[100px] bg-muted/20 border-border/40 resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (Comma separated)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="dev, production, database" 
                      className="rounded-xl h-11 bg-muted/20 border-border/40" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => onOpenChange(false)}
                className="rounded-xl h-11"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isPending}
                className="rounded-xl h-11 px-8 shadow-lg shadow-primary/20"
              >
                {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {resource ? "Save Changes" : "Create Resource"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
