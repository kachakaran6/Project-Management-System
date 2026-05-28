import { useEffect } from "react";
import { useSocket } from "@/providers/socket-provider";
import { useQueryClient } from "@tanstack/react-query";
import { projectsQueryKeys } from "./use-projects-query";
import { toast } from "sonner";
import { useAppSelector } from "@/hooks/useAppSelector";

export function useProjectAutoComplete() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const { activeOrgId } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!socket) return;

    const handleProjectStatusChanged = (data: { projectId: string; status: string }) => {
      // Invalidate project queries so UI updates instantly
      queryClient.invalidateQueries({ queryKey: projectsQueryKeys.all(activeOrgId) });
      queryClient.invalidateQueries({
        queryKey: projectsQueryKeys.detail(data.projectId, activeOrgId),
      });

      if (data.status === "completed") {
        toast.success("Project automatically marked as COMPLETED because all tasks are DONE.");
      } else if (data.status === "active") {
        toast.info("Project automatically reopened to ACTIVE because some tasks are not done.");
      }
    };

    socket.on("project:status_changed", handleProjectStatusChanged);

    return () => {
      socket.off("project:status_changed", handleProjectStatusChanged);
    };
  }, [socket, queryClient, activeOrgId]);
}
