"use client";

import React, { memo } from "react";
import { Handle, Position } from "reactflow";
import { motion } from "framer-motion";
import { TrendingUp, Clock, Activity } from "lucide-react";

interface StageNodeProps {
  data: {
    label: string;
    count: number;
    subInfo?: string;
    status: string;
    recentActivity?: number;
    avgTime?: string;
  };
}

const StageNode = ({ data }: StageNodeProps) => {
  const statusLower = data.status.toLowerCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`stage-node node-${statusLower}`}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      
      <div className="stage-node-content">
        <div className="stage-header">
          <span className="stage-title">{data.label}</span>
          <Activity className="size-3 opacity-30" />
        </div>

        <div className="stage-count">{data.count}</div>

        <div className="stage-footer">
          <div className="stage-sub-info">
            <TrendingUp className="size-3 text-emerald-500" />
            <span>{data.recentActivity || 0} in last 24h</span>
          </div>
          {data.avgTime && (
            <div className="stage-sub-info">
              <Clock className="size-3 opacity-50" />
              <span>Avg. {data.avgTime}</span>
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </motion.div>
  );
};

export default memo(StageNode);
