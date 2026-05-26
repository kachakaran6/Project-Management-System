
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { differenceInDays } from "date-fns";
import {
  Folder,
  Layers,
  Calendar,
  Users,
  Lock,
  Globe,
  ArrowRight,
  Info,
  Shield
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import {
  ProjectFormValues,
  projectFormSchema,
} from "@/features/projects/schemas/project.schema";
import { TechStackSelector } from "./sections/tech-stack-selector";
import { MemberSelector } from "./sections/member-selector";
import { ResourceFieldArray } from "./sections/resource-field-array";
import { SingleUserSelect } from "@/features/team/components/single-user-select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ProjectFormProps {
  initialValues?: Partial<ProjectFormValues>;
  prefilledAssigneeUsers?: Array<{ id: string; name: string; avatarUrl?: string; email?: string }>;
  onSubmit: (values: ProjectFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function ProjectForm({
  initialValues,
  prefilledAssigneeUsers = [],
  onSubmit,
  isSubmitting = false,
  submitLabel = "Save Project",
}: ProjectFormProps) {
  const router = useRouter();
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      description: initialValues?.description ?? "",
      status: initialValues?.status?.toUpperCase() as any ?? "ACTIVE",
      visibility: initialValues?.visibility ?? "public",
      techStack: initialValues?.techStack ?? [],
      startDate: initialValues?.startDate ? new Date(initialValues.startDate) : null,
      endDate: initialValues?.endDate ? new Date(initialValues.endDate) : null,
      members: initialValues?.members ?? [],
      defaultAssigneeId: initialValues?.defaultAssigneeId ?? null,
      resources: initialValues?.resources ?? [],
      code: initialValues?.code ?? "",
    },
  });

  return (
    <Form {...form}>
      <form
        className="flex flex-col max-h-[75vh] md:max-h-[min(800px,70vh)]"
        onSubmit={form.handleSubmit(
          async (values) => {
            await onSubmit(values);
          },
          (errors) => {
            toast.error("Please check the form for errors.");
          }
        )}
      >
        {/* SCROLLABLE CONTENT AREA */}
        <div className="flex-1 overflow-y-auto pr-2 -mr-2 custom-scrollbar p-1">
          {/* GRID LAYOUT FOR TOP FIELDS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">

            {/* LEFT COLUMN: CORE INFO */}
            <div className="lg:col-span-7 space-y-6 md:space-y-8">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-primary/80 font-bold uppercase tracking-wider text-[10px] md:text-[11px]">
                  <Folder className="size-3 md:size-3.5" />
                  <span>Primary Details</span>
                </div>
                <div className="space-y-4 bg-muted/20 p-4 rounded-button border border-border/40 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-9">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold">Project Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. Phoenix Dashboard" className="h-9 rounded-button text-sm" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold">Key (ID)</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="e.g. PHX" 
                                className="h-9 rounded-button text-sm uppercase font-mono" 
                                maxLength={10}
                              />
                            </FormControl>
                            <FormDescription className="text-[9px] leading-tight">
                              Task IDs use this prefix (e.g. PHX-1)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="What's the goal of this project?"
                            className="rounded-button resize-none text-sm"
                            style={{ minHeight: "81px" }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-primary/80 font-bold uppercase tracking-wider text-[10px]">
                  <Layers className="size-3" />
                  <span>Resources & Tech</span>
                </div>
                <div className="bg-muted/20 p-4 rounded-button border border-border/40 shadow-sm">
                  <FormField
                    control={form.control}
                    name="techStack"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">Tech Stack</FormLabel>
                        <FormControl>
                          <TechStackSelector value={field.value} onChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <ResourceFieldArray />
              </div>
            </div>

            {/* RIGHT COLUMN: ACCESS & TIMELINE */}
            <div className="lg:col-span-5 space-y-6">
              {/* TIMELINE */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-primary/80 font-bold uppercase tracking-wider text-[10px]">
                  <Calendar className="size-3" />
                  <span>Timeline</span>
                </div>
                <div className="bg-muted/20 p-4 rounded-button border border-border/40 space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-3">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-[10px] md:text-[11px] font-bold opacity-60 uppercase tracking-tight">START</FormLabel>
                          <FormControl>
                            <DatePicker
                              value={field.value || undefined}
                              onChange={(d) => field.onChange(d ? new Date(d as string) : null)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="hidden sm:flex pt-6">
                      <ArrowRight className="size-3 opacity-20" />
                    </div>
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-[10px] md:text-[11px] font-bold opacity-60 uppercase tracking-tight">END</FormLabel>
                          <FormControl>
                            <DatePicker
                              value={field.value || undefined}
                              onChange={(d) => field.onChange(d ? new Date(d as string) : null)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* TEAM */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-primary/80 font-bold uppercase tracking-wider text-[10px]">
                  <Users className="size-3" />
                  <span>Access Control</span>
                </div>
                <div className="bg-muted/20 p-4 rounded-button border border-border/40 space-y-6 shadow-sm">
                  <FormField
                    control={form.control}
                    name="members"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">Team Members</FormLabel>
                        <FormControl>
                          <MemberSelector value={field.value} onChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="defaultAssigneeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">Default Task Assignee</FormLabel>
                        <FormControl>
                          <SingleUserSelect
                            value={field.value || null}
                            onChange={field.onChange}
                            placeholder="Choose default assignee for this project"
                            prefilledUsers={prefilledAssigneeUsers}
                          />
                        </FormControl>
                        <FormDescription className="text-[10px]">
                          New tasks created from this project will start with this assignee selected.
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="visibility"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-xs font-semibold">Visibility</FormLabel>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
                          <div
                            className={cn(
                              "flex-1 p-2 rounded-button border border-border/60 cursor-pointer transition-all hover:bg-muted/50 select-none",
                              field.value === 'public' && "border-primary bg-primary/5 ring-1 ring-primary"
                            )}
                            onClick={() => field.onChange('public')}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <Globe className={cn("size-3", field.value === 'public' ? "text-primary" : "text-muted-foreground")} />
                              <span className="text-[11px] font-bold">Public</span>
                            </div>
                          </div>
                          <div
                            className={cn(
                              "flex-1 p-2 rounded-button border border-border/60 cursor-pointer transition-all hover:bg-muted/50 select-none",
                              field.value === 'private' && "border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/50"
                            )}
                            onClick={() => field.onChange('private')}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <Lock className={cn("size-3", field.value === 'private' ? "text-amber-500" : "text-muted-foreground")} />
                              <span className="text-[11px] font-bold">Private</span>
                            </div>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COMPACT FOOTER - FIXED AT BOTTOM */}
        <div className="pt-6 mt-4 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-4 border-t border-border/40">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Info className="size-3 text-primary/60" />
            <span>Settings can be adjusted later in dashboard.</span>
          </div>
          <div className="flex flex-col-reverse sm:flex-row items-center gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto rounded-button text-xs h-9 px-6 font-medium"
              disabled={isSubmitting}
              onClick={() => router.push("/projects")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto rounded-button h-9 px-10 shadow-lg shadow-primary/10 font-bold text-xs tracking-wide"
            >
              {isSubmitting ? "Creating..." : submitLabel}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
