import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { 
  FileText, 
  Loader2, 
  Settings, 
  Layout, 
  Grid, 
  Info,
  Calendar,
  CheckCircle,
  Clock,
  ArrowRight
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useStatusesQuery } from "@/features/status/hooks/use-statuses";
import { taskApi } from "@/features/tasks/api/task.api";
import { generateTasksPDF, type PDFExportOptions } from "../utils/pdf-generator";
import type { Task, TaskFilters } from "@/types/task.types";

interface ExportTasksModalProps {
  trigger: React.ReactNode;
  selectedTaskIds: string[];
  currentTasks: Task[];
  filters: {
    status?: string;
    priority?: string;
    search?: string;
    assignee?: string;
    dueDate?: string;
  };
  projectId: string;
  projectName: string;
  boardName: string;
}

const DEFAULT_COLUMNS = [
  "taskId",
  "title",
  "status",
  "priority",
  "assignee",
  "dueDate",
  "labels"
];

const ALL_COLUMNS = [
  { key: "taskId", label: "Task ID" },
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "status", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "assignee", label: "Assignee" },
  { key: "reporter", label: "Reporter" },
  { key: "dueDate", label: "Due Date" },
  { key: "createdAt", label: "Created Date" },
  { key: "updatedAt", label: "Updated Date" },
  { key: "labels", label: "Labels" },
  { key: "sprint", label: "Sprint" },
  { key: "board", label: "Board" },
  { key: "project", label: "Project" },
  { key: "estimatedTime", label: "Estimated Time" },
  { key: "actualTime", label: "Actual Time" },
  { key: "storyPoints", label: "Story Points" },
  { key: "githubIssue", label: "GitHub Issue" },
  { key: "githubPR", label: "GitHub PR" },
  { key: "commentsCount", label: "Comments Count" },
  { key: "attachmentsCount", label: "Attachments Count" }
];

export function ExportTasksModal({
  trigger,
  selectedTaskIds,
  currentTasks,
  filters,
  projectId,
  projectName,
  boardName
}: ExportTasksModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { data: dynamicStatuses = [] } = useStatusesQuery();

  // Modal State
  const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [descriptionOption, setDescriptionOption] = useState<"none" | "150" | "300" | "full">("150");
  const [layoutDensity, setLayoutDensity] = useState<"compact" | "comfortable" | "detailed">("comfortable");
  const [paperSize, setPaperSize] = useState<"A4_portrait" | "A4_landscape" | "Letter">("A4_portrait");
  const [scope, setScope] = useState<"currentPage" | "selected" | "filtered" | "entire">("currentPage");
  const [sorting, setSorting] = useState<"current" | "custom">("current");
  const [includeSummaryPage, setIncludeSummaryPage] = useState(true);

  // Auto-recommend Landscape if > 5 columns are checked
  useEffect(() => {
    if (selectedColumns.length > 5) {
      setPaperSize("A4_landscape");
    } else {
      setPaperSize("A4_portrait");
    }
  }, [selectedColumns]);

  // Set default scope based on selection
  useEffect(() => {
    if (selectedTaskIds.length > 0) {
      setScope("selected");
    } else {
      setScope("currentPage");
    }
  }, [selectedTaskIds, open]);

  // Resolve user display name
  const userDisplayName = useMemo(() => {
    if (!user) return "System";
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    return name || user.name || user.email || "System";
  }, [user]);

  // Helper to retrieve all tasks sequentially for larger datasets
  const fetchTasksSequentially = async (entireProject: boolean) => {
    const limit = 150;
    let currentPage = 1;
    const allTasks: Task[] = [];

    const queryFilters: TaskFilters = entireProject
      ? { projectId: projectId !== "ALL" ? projectId : undefined }
      : {
          projectId: projectId !== "ALL" ? projectId : undefined,
          status: filters.status === "ALL" ? undefined : filters.status,
          priority: filters.priority === "ALL" ? undefined : filters.priority,
          search: filters.search || undefined,
          assigneeId: filters.assignee === "ALL" ? undefined : filters.assignee,
          dueDate: filters.dueDate || undefined,
        };

    while (true) {
      const response = await taskApi.getTasks({
        ...queryFilters,
        page: currentPage,
        limit,
      });

      const items = response.data.items ?? [];
      allTasks.push(...items);

      if (!response.data.meta?.hasNextPage || items.length === 0) break;
      currentPage += 1;
    }

    return allTasks;
  };

  const handleExport = async () => {
    setIsLoading(true);
    try {
      let tasksToExport: Task[] = [];

      if (scope === "currentPage") {
        tasksToExport = currentTasks;
      } else if (scope === "selected") {
        tasksToExport = currentTasks.filter(t => selectedTaskIds.includes(t.id || (t as any)._id));
        if (tasksToExport.length === 0 && selectedTaskIds.length > 0) {
          // If selected tasks aren't found in current page memory, fetch all and filter
          const allProjectTasks = await fetchTasksSequentially(true);
          tasksToExport = allProjectTasks.filter(t => selectedTaskIds.includes(t.id || (t as any)._id));
        }
      } else if (scope === "filtered") {
        tasksToExport = await fetchTasksSequentially(false);
      } else if (scope === "entire") {
        tasksToExport = await fetchTasksSequentially(true);
      }

      if (tasksToExport.length === 0) {
        toast.info("No tasks found to export in the selected scope.");
        setIsLoading(false);
        return;
      }

      // Handle custom sorting if selected (sort by due date, then priority, then title)
      if (sorting === "custom") {
        tasksToExport = [...tasksToExport].sort((a, b) => {
          if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          }
          if (a.dueDate) return -1;
          if (b.dueDate) return 1;
          
          const priorityWeight = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          const pA = priorityWeight[a.priority as keyof typeof priorityWeight] || 0;
          const pB = priorityWeight[b.priority as keyof typeof priorityWeight] || 0;
          if (pA !== pB) return pB - pA;

          return a.title.localeCompare(b.title);
        });
      }

      const activeFilters = {
        status: filters.status === "ALL" ? undefined : filters.status,
        priority: filters.priority === "ALL" ? undefined : filters.priority,
        search: filters.search || undefined
      };

      await generateTasksPDF(
        tasksToExport,
        {
          columns: selectedColumns,
          descriptionOption: descriptionOption,
          layoutDensity: layoutDensity,
          pageSize: paperSize === "Letter" ? "Letter" : "A4",
          orientation: paperSize === "A4_landscape" ? "landscape" : "portrait",
          scope: scope,
          sorting: sorting,
          includeSummaryPage: includeSummaryPage,
        },
        {
          projectName: projectName || "Current Project",
          boardName: boardName || "Main Kanban Board",
          exportedBy: userDisplayName,
          appliedFilters: activeFilters,
          statuses: dynamicStatuses,
        }
      );

      toast.success("PDF generated successfully!");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to export tasks. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleColumn = (key: string) => {
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto rounded-modal border-border/40 shadow-2xl p-6 bg-background/95 backdrop-blur-xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FileText className="size-5 text-primary" /> Export Tasks to PDF
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure settings to generate a professional, print-ready tasks report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* SECTION 1: Select Content */}
          <div className="border border-border/30 rounded-lg p-4 bg-muted/5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" /> 1. Select Content Columns
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ALL_COLUMNS.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-muted/30 cursor-pointer transition-all"
                >
                  <Checkbox
                    checked={selectedColumns.includes(col.key)}
                    onCheckedChange={() => toggleColumn(col.key)}
                  />
                  <span className="text-xs font-medium text-foreground">{col.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-3 flex justify-between items-center text-[10px] text-muted-foreground border-t border-border/10 pt-2.5">
              <span>{selectedColumns.length} of {ALL_COLUMNS.length} columns selected</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedColumns(ALL_COLUMNS.map((c) => c.key))}
                  className="hover:text-primary font-bold cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-border/40">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedColumns(["taskId", "title"])}
                  className="hover:text-primary font-bold cursor-pointer"
                >
                  Clear Optional
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SECTION 2: Description Options */}
            <div className="border border-border/30 rounded-lg p-4 bg-muted/5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" /> 2. Description Options
              </h3>
              <div className="space-y-2">
                {[
                  { value: "none", label: "Don't include descriptions" },
                  { value: "150", label: "Include first 150 characters (Truncated)" },
                  { value: "300", label: "Include first 300 characters (Standard)" },
                  { value: "full", label: "Include full description" }
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2.5 px-2 py-1 rounded hover:bg-muted/20 cursor-pointer text-xs font-medium transition-all"
                  >
                    <input
                      type="radio"
                      name="descriptionOption"
                      checked={descriptionOption === opt.value}
                      onChange={() => setDescriptionOption(opt.value as any)}
                      className="accent-primary"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* SECTION 3: Layout Spacing */}
            <div className="border border-border/30 rounded-lg p-4 bg-muted/5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" /> 3. Spacing & Density
              </h3>
              <div className="space-y-2">
                {[
                  { value: "compact", label: "Compact (Small font, tight tables)" },
                  { value: "comfortable", label: "Comfortable (Standard SaaS style)" },
                  { value: "detailed", label: "Detailed (Good for comments/printing)" }
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2.5 px-2 py-1 rounded hover:bg-muted/20 cursor-pointer text-xs font-medium transition-all"
                  >
                    <input
                      type="radio"
                      name="layoutDensity"
                      checked={layoutDensity === opt.value}
                      onChange={() => setLayoutDensity(opt.value as any)}
                      className="accent-primary"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SECTION 4: Paper Size */}
            <div className="border border-border/30 rounded-lg p-4 bg-muted/5 relative">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" /> 4. Page Layout
              </h3>
              <div className="space-y-2">
                {[
                  { value: "A4_portrait", label: "A4 Portrait" },
                  { value: "A4_landscape", label: "A4 Landscape (Recommended for >5 cols)" },
                  { value: "Letter", label: "US Letter" }
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2.5 px-2 py-1 rounded hover:bg-muted/20 cursor-pointer text-xs font-medium transition-all"
                  >
                    <input
                      type="radio"
                      name="paperSize"
                      checked={paperSize === opt.value}
                      onChange={() => setPaperSize(opt.value as any)}
                      className="accent-primary"
                    />
                    <span className="flex items-center gap-1.5">
                      {opt.label}
                      {opt.value === "A4_landscape" && selectedColumns.length > 5 && (
                        <span className="text-[9px] bg-indigo-500/10 text-indigo-600 px-1.5 py-0.5 rounded font-black uppercase">
                          Recommended
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* SECTION 5: Task Selection */}
            <div className="border border-border/30 rounded-lg p-4 bg-muted/5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" /> 5. Export Scope
              </h3>
              <div className="space-y-2">
                {[
                  { value: "currentPage", label: `Current Page (${currentTasks.length} tasks)` },
                  {
                    value: "selected",
                    label: `Selected Tasks (${selectedTaskIds.length} tasks)`,
                    disabled: selectedTaskIds.length === 0
                  },
                  { value: "filtered", label: "Filtered Tasks (All matching search/filters)" },
                  { value: "entire", label: "Entire Project (All tasks in workspace)" }
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2.5 px-2 py-1 rounded hover:bg-muted/20 text-xs font-medium transition-all ${
                      opt.disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : "cursor-pointer"
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      value={opt.value}
                      disabled={opt.disabled}
                      checked={scope === opt.value}
                      onChange={() => setScope(opt.value as any)}
                      className="accent-primary"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SECTION 6: Sorting */}
            <div className="border border-border/30 rounded-lg p-4 bg-muted/5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" /> 6. Export Sorting
              </h3>
              <div className="space-y-2">
                {[
                  { value: "current", label: "Use current dashboard sort configuration" },
                  { value: "custom", label: "Custom sort (Due Date descending, Priority descending)" }
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2.5 px-2 py-1 rounded hover:bg-muted/20 cursor-pointer text-xs font-medium transition-all"
                  >
                    <input
                      type="radio"
                      name="sorting"
                      checked={sorting === opt.value}
                      onChange={() => setSorting(opt.value as any)}
                      className="accent-primary"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* ADDITIONAL: Summary page toggle */}
            <div className="border border-border/30 rounded-lg p-4 bg-muted/5 flex flex-col justify-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" /> Report Summary Page
              </h3>
              <label className="flex items-start gap-2.5 p-2 rounded hover:bg-muted/20 cursor-pointer transition-all">
                <Checkbox
                  checked={includeSummaryPage}
                  onCheckedChange={(checked) => setIncludeSummaryPage(Boolean(checked))}
                  className="mt-0.5"
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-foreground">Include Metrics Dashboard Page</span>
                  <span className="text-[10px] text-muted-foreground">
                    Adds a beautiful summary page with KPI cards and breakdowns at the start.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 gap-2 sm:gap-0 border-t border-border/20 pt-4">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isLoading}
            className="rounded-button text-xs font-bold"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isLoading}
            className="rounded-button text-xs font-bold px-6 shadow-premium bg-primary text-primary-foreground hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Generating Export...
              </>
            ) : (
              <>
                Generate PDF <ArrowRight className="size-3.5" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
