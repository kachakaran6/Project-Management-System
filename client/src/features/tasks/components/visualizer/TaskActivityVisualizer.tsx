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

const STAGES: { id: TaskStatus; label: string; x: number }[] = [
  { id: "BACKLOG", label: "Backlog", x: 0 },
  { id: "TODO", label: "To Do", x: 300 },
  { id: "IN_PROGRESS", label: "In Progress", x: 600 },
  { id: "IN_REVIEW", label: "In Review", x: 900 },
  { id: "DONE", label: "Done", x: 1200 },
  { id: "ARCHIVED", label: "Archived", x: 1500 },
];

const nodeTypes = {
  stage: StageNode,
};

const edgeTypes = {
  flow: FlowEdge,
};

interface TaskActivityVisualizerProps {
  tasks: Task[];
}

export function TaskActivityVisualizer({ tasks }: TaskActivityVisualizerProps) {
  const [viewMode, setViewMode] = useState<"live" | "timeline">("live");

  // Calculate counts for each stage
  const stageStats = useMemo(() => {
    const stats = STAGES.reduce((acc, stage) => {
      acc[stage.id] = {
        count: 0,
        recent: 0,
        avgTime: "2.4d", // Mocked for now
      };
      return acc;
    }, {} as Record<string, any>);

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    tasks.forEach((task) => {
      if (stats[task.status]) {
        stats[task.status].count++;
        if (new Date(task.updatedAt) > oneDayAgo) {
          stats[task.status].recent++;
        }
      }
    });

    return stats;
  }, [tasks]);

  // Initial Nodes
  const initialNodes: Node[] = useMemo(() => {
    return STAGES.map((stage) => ({
      id: stage.id,
      type: "stage",
      position: { x: stage.x, y: 0 },
      data: {
        label: stage.label,
        status: stage.id,
        count: stageStats[stage.id].count,
        recentActivity: stageStats[stage.id].recent,
        avgTime: stageStats[stage.id].avgTime,
      },
      draggable: false,
    }));
  }, [stageStats]);

  // Initial Edges
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    for (let i = 0; i < STAGES.length - 1; i++) {
      const source = STAGES[i].id;
      const target = STAGES[i + 1].id;
      
      // Calculate flow intensity based on recent updates in target
      const intensity = stageStats[target].recent;

      edges.push({
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
    return edges;
  }, [stageStats]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes when stats change
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

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
