"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, FolderOpen, Plus } from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/layout/app-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multiselect";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const teamOptions = [
  { label: "Design", value: "design" },
  { label: "Engineering", value: "engineering" },
  { label: "Product", value: "product" },
  { label: "Marketing", value: "marketing" },
];

const rows = [
  { name: "Replatform API", owner: "Nadia", status: "At risk", due: "Apr 16" },
  { name: "Mobile Sync V2", owner: "Liam", status: "On track", due: "Apr 21" },
  { name: "Dashboard Revamp", owner: "Mina", status: "On hold", due: "Apr 29" },
];

export function DashboardShowcase() {
  const [selectedTeams, setSelectedTeams] = React.useState<string[]>([
    "engineering",
  ]);
  const [loadingTable, setLoadingTable] = React.useState(false);

  return (
    <AppLayout title="Design System Showcase">
      <div className="grid gap-6">
        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Total Projects</CardDescription>
              <CardTitle>42</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Open Tasks</CardDescription>
              <CardTitle>183</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Sprint Velocity</CardDescription>
              <CardTitle>+12.7%</CardTitle>
            </CardHeader>
          </Card>
        </section>

        <Alert variant="warning">
          <AlertTitle>Plan Limit Nearing</AlertTitle>
          <AlertDescription>
            You are close to the storage quota. Upgrade before April 20 to avoid
            upload restrictions.
          </AlertDescription>
        </Alert>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Reusable Form System</CardTitle>
              <CardDescription>
                Labels, helper text, error handling, and typed controls.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                id="projectName"
                label="Project name"
                required
                helperText="Use a concise, searchable name."
              >
                <Input
                  id="projectName"
                  placeholder="e.g. Platform Reliability"
                />
              </FormField>

              <FormField
                id="ownerPassword"
                label="Owner password"
                helperText="Password field with built-in visibility toggle."
              >
                <PasswordInput
                  id="ownerPassword"
                  placeholder="Enter password"
                />
              </FormField>

              <FormField id="projectDescription" label="Description">
                <Textarea
                  id="projectDescription"
                  placeholder="Outline scope, goals, and risks"
                />
              </FormField>

              <FormField id="priority" label="Priority">
                <Select defaultValue="medium">
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                id="teams"
                label="Teams"
                helperText="Future-ready multi-select token input."
              >
                <MultiSelect
                  value={selectedTeams}
                  onChange={setSelectedTeams}
                  options={teamOptions}
                />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Overlays and Feedback</CardTitle>
              <CardDescription>
                Dialog, drawer, tooltip, badges, and toasts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>Default</Badge>
                <Badge variant="success">Healthy</Badge>
                <Badge variant="warning">Attention</Badge>
                <Badge variant="destructive">Blocked</Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="primary">Open Modal</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Workspace Template</DialogTitle>
                      <DialogDescription>
                        Save this structure to reuse onboarding defaults across
                        organizations.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline">Cancel</Button>
                      <Button onClick={() => toast.success("Template created")}>
                        Save Template
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Drawer>
                  <DrawerTrigger asChild>
                    <Button variant="secondary">Open Drawer</Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle>Activity Stream</DrawerTitle>
                      <DrawerDescription>
                        Latest tenant-wide events and automation logs.
                      </DrawerDescription>
                    </DrawerHeader>
                    <div className="mt-4 space-y-3">
                      <Alert variant="success">
                        <AlertTitle>Deployment complete</AlertTitle>
                        <AlertDescription>
                          Release v2.3.0 reached all regions.
                        </AlertDescription>
                      </Alert>
                      <Alert variant="destructive">
                        <AlertTitle>Integration failed</AlertTitle>
                        <AlertDescription>
                          Git webhook timed out in org: Apex Labs.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </DrawerContent>
                </Drawer>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="md">
                        <Plus className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add quick action</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setLoadingTable(true);
                  toast("Refreshing project dataset...");
                  setTimeout(() => setLoadingTable(false), 600);
                }}
              >
                Simulate Loading State
              </Button>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Reusable Table</CardTitle>
            <CardDescription>
              Scalable table primitive with composable slots.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTable ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : rows.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.owner}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1">
                          {row.status === "On track" ? (
                            <CheckCircle2 className="size-4 text-success" />
                          ) : (
                            <AlertCircle className="size-4 text-warning" />
                          )}
                          {row.status}
                        </span>
                      </TableCell>
                      <TableCell>{row.due}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={FolderOpen}
                title="No projects yet"
                description="Create your first project to start planning milestones and tracking tasks."
                actionLabel="Create Project"
                onAction={() =>
                  toast.success("Create Project action triggered")
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
