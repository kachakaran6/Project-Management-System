"use client";

import React from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from "reactflow";

const FlowEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: "rgba(255, 255, 255, 0.1)",
          strokeWidth: data?.intensity > 0 ? 2 + data.intensity : 2,
          filter: data?.intensity > 5 ? "drop-shadow(0 0 8px rgba(255,255,255,0.4))" : "none",
        }}
      />
      {data?.count > 0 && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="edge-label-container"
          >
            {data.count} tasks
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default FlowEdge;
