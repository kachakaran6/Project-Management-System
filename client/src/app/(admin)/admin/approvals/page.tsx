"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Loader2,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  AdminApprovalRequest,
  AdminApprovalStatus,
} from "@/features/admin/api/admin.api";
import {
  useAdminPendingRequestsQuery,
  useApproveAdminRequestMutation,
  useRejectAdminRequestMutation,
} from "@/features/admin/hooks/use-admin";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";

type ReviewStatus = AdminApprovalStatus;

interface ApprovalRecord extends AdminApprovalRequest {
  status: ReviewStatus;
  requestedAt: string;
  reviewedAt?: string;
  reviewReason?: string;
}

const REVIEW_STORAGE_KEY = "admin-approval-workflow-v1";

function loadReviewHistory(): ApprovalRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(REVIEW_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ApprovalRecord[]) : [];
  } catch {
    return [];
  }
}

function sameDay(left?: string, right = new Date().toISOString()) {
  if (!left) return false;
  const leftDate = new Date(left);
  const rightDate = new Date(right);
  return leftDate.toDateString() === rightDate.toDateString();
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function initials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.trim().toUpperCase() || "U";
}

function statusMeta(status: ReviewStatus) {
  switch (status) {
    case "APPROVED":
      return { label: "Approved", variant: "success" as const };
    case "REJECTED":
      return { label: "Rejected", variant: "destructive" as const };
    default:
      return { label: "Pending", variant: "warning" as const };
  }
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminApprovalsPage() {
  const { isSuperAdmin } = useAuth();

  const pendingQuery = useAdminPendingRequestsQuery();
  const approveRequest = useApproveAdminRequestMutation();
  const rejectRequest = useRejectAdminRequestMutation();

  const [history, setHistory] = useState<ApprovalRecord[]>(loadReviewHistory);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ReviewStatus>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [approveTarget, setApproveTarget] = useState<ApprovalRecord | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ApprovalRecord | null>(null);
  const [detailTarget, setDetailTarget] = useState<ApprovalRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    window.localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const mergedRequests = useMemo(() => {
    const reviewedById = new Map(history.map((item) => [item.id, item]));
    const pendingRequests = (pendingQuery.data ?? []).filter((request) => {
      const reviewed = reviewedById.get(request.id);
      if (!reviewed) return true;

      const requestedAt = +new Date(request.requestedAt);
      const reviewedAt = reviewed.reviewedAt ? +new Date(reviewed.reviewedAt) : 0;

      // If user submitted a new request after last review, show it again.
      return requestedAt > reviewedAt;
    });

    const livePending: ApprovalRecord[] = pendingRequests.map((request) => ({
      ...request,
      status: "PENDING",
      requestedAt: request.requestedAt,
    }));

    const historical = history.filter(
      (item) => !livePending.some((pending) => pending.id === item.id),
    );

    return [...historical, ...livePending].sort(
      (left, right) =>
        +new Date(right.requestedAt) - +new Date(left.requestedAt),
    );
  }, [history, pendingQuery.data]);

  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase();

    return mergedRequests.filter((request) => {
      if (statusFilter !== "ALL" && request.status !== statusFilter) {
        return false;
      }

      if (term) {
        const haystack = `${request.firstName} ${request.lastName} ${request.email}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      if (dateFrom && new Date(request.requestedAt) < new Date(dateFrom)) {
        return false;
      }

      if (dateTo) {
        const upperBound = new Date(dateTo);
        upperBound.setHours(23, 59, 59, 999);
        if (new Date(request.requestedAt) > upperBound) {
          return false;
        }
      }

      return true;
    });
  }, [dateFrom, dateTo, mergedRequests, search, statusFilter]);

  const pendingCount = mergedRequests.filter(
    (request) => request.status === "PENDING",
  ).length;
  const approvedToday = mergedRequests.filter(
    (request) => request.status === "APPROVED" && sameDay(request.reviewedAt),
  ).length;
  const rejectedToday = mergedRequests.filter(
    (request) => request.status === "REJECTED" && sameDay(request.reviewedAt),
  ).length;

  const handleApprove = async () => {
    if (!approveTarget) return;

    try {
      await approveRequest.mutateAsync(approveTarget.id);
      const reviewedAt = new Date().toISOString();

      setHistory((current) => [
        {
          ...approveTarget,
          status: "APPROVED",
          reviewedAt,
          reviewReason: undefined,
        },
        ...current.filter((item) => item.id !== approveTarget.id),
      ]);

      toast.success("Admin request approved.");
      setApproveTarget(null);
    } catch {
      toast.error("Failed to approve admin request.");
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;

    try {
      await rejectRequest.mutateAsync({
        userId: rejectTarget.id,
        reason: rejectReason.trim() || undefined,
      });

      const reviewedAt = new Date().toISOString();

      setHistory((current) => [
        {
          ...rejectTarget,
          status: "REJECTED",
          reviewedAt,
          reviewReason: rejectReason.trim() || undefined,
        },
        ...current.filter((item) => item.id !== rejectTarget.id),
      ]);

      toast.success("Admin request rejected.");
      setRejectTarget(null);
      setRejectReason("");
    } catch {
      toast.error("Failed to reject admin request.");
    }
  };

  if (!isSuperAdmin) {
    return (
      <Alert variant="warning">
        <AlertTriangle className="size-4" />
        <AlertTitle>Super Admin only</AlertTitle>
        <AlertDescription>
          This section is restricted to SUPER_ADMIN users.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Admin Approvals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review new admin registration requests and control access to the platform.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Pending Requests"
          value={pendingCount}
          description="Waiting for review"
          icon={Clock3}
        />
        <StatCard
          title="Approved Today"
          value={approvedToday}
          description="Requests approved in this session"
          icon={CheckCircle2}
        />
        <StatCard
          title="Rejected Today"
          value={rejectedToday}
          description="Requests removed from the queue"
          icon={UserX}
        />
      </div>

      <Card className="shadow-sm">
        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or email"
                className="pl-9"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as "ALL" | ReviewStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <DatePicker
              mode="range"
              value={{ from: dateFrom ? new Date(dateFrom) : undefined, to: dateTo ? new Date(dateTo) : undefined } as any}
              onChange={(val) => {
                if (typeof val === "object" && val !== null) {
                  setDateFrom(val.from);
                  setDateTo(val.to);
                } else {
                  setDateFrom("");
                  setDateTo("");
                }
              }}
              placeholder="Select registration date range"
              className="lg:col-span-2"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {pendingQuery.isFetching ? (
              <span className="text-xs text-muted-foreground">Refreshing requests…</span>
            ) : null}
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
              Live polling every 15s
            </Badge>
            {filteredRequests.length !== mergedRequests.length ? (
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                {filteredRequests.length} filtered of {mergedRequests.length}
              </Badge>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-2xl border border-border">
            {pendingQuery.isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`approval-skeleton-${index}`}
                    className="h-16 rounded-xl bg-muted/30"
                  />
                ))}
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ShieldCheck className="size-8" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">
                    No pending admin requests
                  </h2>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    New admin registrations will appear here automatically when they arrive.
                  </p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Requested Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => {
                    const meta = statusMeta(request.status);
                    const isPending = request.status === "PENDING";

                    return (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-10 border border-border/70">
                              <AvatarImage src={request.avatarUrl} alt={`${request.firstName} ${request.lastName}`} />
                              <AvatarFallback>{initials(request.firstName, request.lastName)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">
                                {`${request.firstName} ${request.lastName}`.trim()}
                              </p>
                              <p className="text-sm text-muted-foreground">{request.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-full px-2.5 py-0.5">
                            {request.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(request.requestedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "gap-1.5 border-success/30 bg-success/10 text-success hover:bg-success/15",
                                !isPending && "opacity-60",
                              )}
                              disabled={!isPending || approveRequest.isPending}
                              onClick={() => setApproveTarget(request)}
                            >
                              {approveRequest.isPending && approveTarget?.id === request.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <UserCheck className="size-3.5" />
                              )}
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "gap-1.5 border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15",
                                !isPending && "opacity-60",
                              )}
                              disabled={!isPending}
                              onClick={() => {
                                setRejectTarget(request);
                                setRejectReason("");
                              }}
                            >
                              <XCircle className="size-3.5" />
                              Reject
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => setDetailTarget(request)}
                            >
                              <Eye className="size-3.5" />
                              View Details
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(approveTarget)}
        onOpenChange={(open) => !open && setApproveTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve this admin request?</DialogTitle>
            <DialogDescription>
              {approveTarget
                ? `This will activate ${approveTarget.firstName} ${approveTarget.lastName} as an admin.`
                : "This will activate the selected admin account."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={approveRequest.isPending}>
              {approveRequest.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Approve Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => !open && setRejectTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this request?</DialogTitle>
            <DialogDescription>
              Optionally add a reason so your team has context for this decision.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Optional rejection reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectRequest.isPending}
            >
              {rejectRequest.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Drawer
        open={Boolean(detailTarget)}
        onOpenChange={(open) => !open && setDetailTarget(null)}
      >
        <DrawerContent side="right" className="max-w-md">
          <DrawerHeader>
            <DrawerTitle>Request Details</DrawerTitle>
            <DrawerDescription>
              Full information for the selected admin request.
            </DrawerDescription>
          </DrawerHeader>

          {detailTarget ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-12 border border-border/70">
                    <AvatarImage
                      src={detailTarget.avatarUrl}
                      alt={`${detailTarget.firstName} ${detailTarget.lastName}`}
                    />
                    <AvatarFallback>
                      {initials(detailTarget.firstName, detailTarget.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">
                      {`${detailTarget.firstName} ${detailTarget.lastName}`.trim()}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {detailTarget.email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Full Name
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {`${detailTarget.firstName} ${detailTarget.lastName}`.trim()}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Email
                  </p>
                  <p className="mt-1 text-sm font-medium">{detailTarget.email}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Registration Date
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {formatDate(detailTarget.requestedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Requested Role
                  </p>
                  <p className="mt-1 text-sm font-medium">{detailTarget.role}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Account Status
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant={statusMeta(detailTarget.status).variant}>
                      {statusMeta(detailTarget.status).label}
                    </Badge>
                    {detailTarget.reviewReason ? (
                      <span className="text-xs text-muted-foreground">
                        {detailTarget.reviewReason}
                      </span>
                    ) : null}
                  </div>
                </div>
                {detailTarget.reviewedAt ? (
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Reviewed At
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {formatDate(detailTarget.reviewedAt)}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>
    </div>
  );
}