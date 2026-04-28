"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { 
  History, 
  Search, 
  Filter, 
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock3,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { taskApi } from "@/features/tasks/api/task.api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: "all",
    userId: "all",
    search: ""
  });

  const { data, isLoading } = useQuery({
    queryKey: ["audit-log", page, filters],
    queryFn: () => taskApi.getGlobalStatusHistory({
      page,
      limit: 15,
      status: filters.status === "all" ? undefined : filters.status,
      userId: filters.userId === "all" ? undefined : filters.userId,
      search: filters.search
    }),
  });

  const history = data?.data?.items || [];
  const totalPages = data?.data?.totalPages || 1;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
              <History className="size-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Audit Log
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Track status transitions and data integrity across all tasks.
          </p>
        </div>

        <div className="flex items-center gap-2">
           <Badge variant="outline" className="px-3 py-1 bg-background/50 backdrop-blur-sm border-border/40 text-muted-foreground font-bold">
             {data?.data?.totalItems || 0} Total Events
           </Badge>
        </div>
      </div>

      {/* Filters Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
          <Input 
            placeholder="Search by task title or code..." 
            className="pl-10 bg-card/40 backdrop-blur-md border-border/40 h-10 rounded-xl focus-visible:ring-primary/20"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>

        <Select value={filters.status} onValueChange={(val) => setFilters({ ...filters, status: val })}>
          <SelectTrigger className="h-10 rounded-xl bg-card/40 backdrop-blur-md border-border/40 focus:ring-primary/20 text-sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="bg-card backdrop-blur-xl border-border/40">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="TODO">To Do</SelectItem>
            <SelectItem value="IN PROGRESS">In Progress</SelectItem>
            <SelectItem value="DONE">Done</SelectItem>
            <SelectItem value="BLOCKED">Blocked</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="secondary" className="h-10 rounded-xl font-bold text-xs uppercase tracking-wider gap-2 bg-primary/10 hover:bg-primary/20 text-primary border-primary/10 shadow-sm">
          <Filter className="size-3.5" />
          Apply Filters
        </Button>
      </div>

      {/* Table Container */}
      <Card className="border-border/40 overflow-hidden bg-card/40 backdrop-blur-md shadow-2xl shadow-black/5">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/20">
                  <TableHead className="font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground h-12 py-0">Task Details</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground h-12 py-0">Status Transition</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground h-12 py-0">Updated By</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground h-12 py-0">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [1, 2, 3, 4, 5, 6].map((i) => (
                    <TableRow key={i} className="border-border/20">
                      <TableCell className="py-4 px-6"><Skeleton className="h-5 w-32 rounded-md" /></TableCell>
                      <TableCell className="py-4 px-6"><Skeleton className="h-5 w-48 rounded-md" /></TableCell>
                      <TableCell className="py-4 px-6"><Skeleton className="h-8 w-32 rounded-full" /></TableCell>
                      <TableCell className="py-4 px-6"><Skeleton className="h-5 w-24 rounded-md" /></TableCell>
                    </TableRow>
                  ))
                ) : history.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="py-20 text-center">
                       <div className="flex flex-col items-center justify-center gap-3 opacity-40">
                         <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                            <AlertCircle className="size-6" />
                         </div>
                         <p className="font-bold uppercase tracking-widest text-xs">No records found matching your filters</p>
                       </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((item) => (
                    <TableRow key={item.id} className="group border-border/20 hover:bg-muted/30 transition-colors">
                      <TableCell className="py-3 px-6">
                        <div className="flex flex-col min-w-[200px]">
                          <span className="text-[10px] font-black text-primary/80 mb-0.5 tracking-tight uppercase">{(item as any).taskCode}</span>
                          <span className="text-sm font-bold text-foreground/90 group-hover:text-foreground line-clamp-1">{(item as any).taskTitle}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-6">
                        <div className="flex items-center gap-2">
                          {item.fromStatus ? (
                            <Badge 
                              variant="secondary" 
                              style={{ backgroundColor: `${item.fromStatus.color}15`, color: item.fromStatus.color }}
                              className="text-[9px] px-2 py-0 font-bold border-none"
                            >
                              {item.fromStatus.name}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] px-2 py-0 font-bold opacity-40">INIT</Badge>
                          )}
                          <ArrowRight className="size-3 text-muted-foreground/30 shrink-0" />
                          <Badge 
                            style={{ backgroundColor: item.toStatus.color, color: 'white' }}
                            className="text-[9px] px-2 py-0 border-none shadow-sm font-bold"
                          >
                            {item.toStatus.name}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-6">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-7 border border-border/40 shadow-sm ring-1 ring-background">
                            <AvatarImage src={item.changedByAvatar} />
                            <AvatarFallback className="text-[9px] font-black bg-muted uppercase">
                               {item.changedByName.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-bold text-foreground/70">{item.changedByName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-foreground/80">{formatDistanceToNow(new Date(item.changedAt), { addSuffix: true })}</span>
                          <span className="text-[10px] text-muted-foreground font-medium opacity-60">{format(new Date(item.changedAt), "MMM d, h:mm a")}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Table Footer / Pagination */}
          <div className="p-4 bg-muted/20 border-t border-border/20 flex items-center justify-between">
             <div className="flex items-center gap-1">
               <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Page</span>
               <Badge variant="secondary" className="px-1.5 py-0 h-4 min-w-[20px] justify-center text-[10px] font-black">{page}</Badge>
               <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">of {totalPages}</span>
             </div>
             <div className="flex items-center gap-2">
               <Button 
                 variant="outline" 
                 size="sm" 
                 disabled={page === 1} 
                 onClick={() => setPage(page - 1)}
                 className="size-8 p-0 rounded-lg bg-background/50 border-border/40 hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-30"
               >
                 <ChevronLeft className="size-4" />
               </Button>
               <Button 
                 variant="outline" 
                 size="sm" 
                 disabled={page === totalPages} 
                 onClick={() => setPage(page + 1)}
                 className="size-8 p-0 rounded-lg bg-background/50 border-border/40 hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-30"
               >
                 <ChevronRight className="size-4" />
               </Button>
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
