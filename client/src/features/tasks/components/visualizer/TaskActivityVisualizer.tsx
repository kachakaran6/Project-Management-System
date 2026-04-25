"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Node,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import "./visualizer.css";

import StageNode from "./StageNode";
import FlowEdge from "./FlowEdge";
import { TaskStatus, Task } from "@/types/task.types";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { fetchTasks } from "@/features/task/taskSlice";
import { fetchStatuses } from "@/features/status/statusSlice";
import { Loader2 } from "lucide-react";

const nodeTypes = {
  stage: StageNode,
};

const edgeTypes = {
  flow: FlowEdge,
};

const normalizeId = (id: any) => id?.toString();

export function TaskActivityVisualizer() {
  const dispatch = useAppDispatch();
  const [viewMode, setViewMode] = useState<"live" | "timeline">("live");

  // Direct Redux Connection (No Intermediate State)
  const tasks = useAppSelector((state) => state.task.tasks);
  const { statuses, loading: loadingStatuses } = useAppSelector((state) => state.status);

  // Force fetch on mount for real-time accuracy as requested
  useEffect(() => {
    dispatch(fetchTasks());
    dispatch(fetchStatuses());
  }, [dispatch]);

  // Mandatory debug logging
  useEffect(() => {
    console.log("FINAL STATS SYNC:", { tasks, statuses });
  }, [tasks, statuses]);

  // Derived STAGES from Redux statuses
  const STAGES = statuses.length > 0 
    ? [...statuses]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((s, index) => ({
          id: normalizeId(s.id || (s as any)._id) as TaskStatus,
          label: s.name,
          x: index * 300,
          color: s.color
        }))
    : [
        { id: "BACKLOG", label: "Backlog", x: 0, color: "#94a3b8" },
        { id: "TODO", label: "To Do", x: 300, color: "#3b82f6" },
        { id: "IN_PROGRESS", label: "In Progress", x: 600, color: "#f59e0b" },
        { id: "DONE", label: "Done", x: 900, color: "#22c55e" },
      ];

  // Dynamic Count Calculation (Pure Derived UI)
  const stageStats = STAGES.reduce((acc, stage) => {
    const stageId = normalizeId(stage.id);
    
    const stageTasks = tasks.filter((task) => {
      if (task.isDraft) return false;
      const taskStatusId = normalizeId((task.status as any)?._id || task.status);
      return taskStatusId === stageId;
    });

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = stageTasks.filter(t => new Date(t.updatedAt) > oneDayAgo).length;

    acc[stageId] = {
      count: stageTasks.length,
      recent: recent,
    };
    return acc;
  }, {} as Record<string, { count: number; recent: number }>);

  // Initial Nodes (Derived)
  const initialNodes: Node[] = STAGES.map((stage) => ({
    id: stage.id,
    type: "stage",
    position: { x: stage.x, y: 0 },
    data: {
      label: stage.label,
      status: stage.id,
      count: stageStats[stage.id]?.count || 0,
      recentActivity: stageStats[stage.id]?.recent || 0,
      color: stage.color,
    },
    draggable: false,
  }));

  // Initial Edges (Derived)
  const initialEdges: Edge[] = [];
  for (let i = 0; i < STAGES.length - 1; i++) {
    const source = STAGES[i].id;
    const target = STAGES[i + 1].id;
    const intensity = stageStats[target]?.recent || 0;

    initialEdges.push({
      id: `${source}-${target}`,
      source,
      target,
      type: "flow",
      animated: intensity > 0,
      data: {
        intensity,
        count: intensity,
      },
      style: {
        stroke: intensity > 0 ? "rgba(255, 255, 255, 0.4)" : "rgba(255, 255, 255, 0.1)",
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "rgba(255, 255, 255, 0.2)",
      },
    });
  }

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Force re-render on state change
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [tasks, statuses, setNodes, setEdges]);

  if (loadingStatuses && statuses.length === 0) {
    return (
      <div className="task-visualizer-container flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-10 animate-spin text-primary opacity-20" />
          <p className="text-sm text-muted-foreground animate-pulse font-bold uppercase tracking-[0.2em]">Synchronizing State...</p>
        </div>
      </div>
    );
  }

  const activeTasks = tasks.filter(t => !t.isDraft);
  if (activeTasks.length === 0 && !loadingStatuses) {
    return (
      <div className="task-visualizer-container flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 opacity-40">
          <div className="p-4 rounded-full border-2 border-dashed border-border/40">
            <Loader2 className="size-8 text-muted-foreground/20" />
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No Active Task Data in Redux</p>
        </div>
      </div>
    );
  }

  return (
    <div className="task-visualizer-container">
      <div className="visualizer-overlay" />
      
      <div className="visualizer-controls">
        <button 
          className={`control-btn ${viewMode === "live" ? "active" : ""}`}
          onClick={() => setViewMode("live")}
        >
          Live View
        </button>
        <button 
          className={`control-btn ${viewMode === "timeline" ? "active" : ""}`}
          onClick={() => setViewMode("timeline")}
        >
          Timeline View
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.5}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#111" gap={20} />
      </ReactFlow>
    </div>
  );
}
