import Status from "../../models/Status.js";
import Task from "../../models/Task.js";

export const getStatuses = async (organizationId: string) => {
  let statuses: any[] = await Status.find({ organizationId }).sort({ order: 1 }).lean();
  
  // If no statuses exist for this org, create default ones
  if (statuses.length === 0) {
    statuses = await createDefaultStatuses(organizationId);
  } else {
    // Soft migration: ensure visibility flags are set for legacy statuses
    statuses = statuses.map(s => {
      const name = s.name.toLowerCase().replace(/[\s_-]/g, "");
      // Core flow stages that should ALWAYS be visible
      const isCoreVisible = ["backlog", "todo", "inprogress", "done"].includes(name);
      
      // If field is missing or it's a legacy status that SHOULD be hidden but is marked false
      const shouldBeHidden = ["inreview", "review", "archived", "rejected"].includes(name);
      
      let isHidden = s.isHiddenIfEmpty;
      
      // FORCE logic for legacy/mismatched data
      if (isHidden === undefined) {
        isHidden = !isCoreVisible;
      } else if (!isCoreVisible) {
        // If it's a known non-core status (In Review, Archived, etc.)
        // and it's NOT explicitly marked by the user (i.e. it's a legacy system status or similar)
        // OR if it's "in_review" specifically as requested
        if (shouldBeHidden) {
          isHidden = true;
        }
      }

      return {
        ...s,
        isHiddenIfEmpty: isHidden,
        id: s._id.toString()
      };
    });
  }
  
  return statuses;
};

export const createStatus = async (data: any) => {
  return await Status.create(data);
};

export const updateStatus = async (id: string, data: any) => {
  return await Status.findByIdAndUpdate(id, data, { new: true });
};

export const deleteStatus = async (id: string) => {
  const status = await Status.findById(id);
  if (!status) throw new Error("Status not found");
  
  if (status.isSystem) {
    throw new Error("Cannot delete a system status. These are required for the core workflow.");
  }

  // Check if any tasks are using this status
  const taskCount = await Task.countDocuments({ status: id });
  if (taskCount > 0) {
    throw new Error(`Cannot delete status: ${taskCount} tasks are currently using it. Please reassign them first.`);
  }
  return await Status.findByIdAndDelete(id);
};

export const reorderStatuses = async (reorderData: { id: string; order: number }[]) => {
  const bulkOps = reorderData.map((item) => ({
    updateOne: {
      filter: { _id: item.id },
      update: { $set: { order: item.order } },
    },
  }));
  return await Status.bulkWrite(bulkOps);
};

export const createDefaultStatuses = async (organizationId: string) => {
  const defaults = [
    { name: "Backlog", color: "#64748b", order: 0, organizationId, isDefault: true, isSystem: true, isHiddenIfEmpty: false },
    { name: "Todo", color: "#3b82f6", order: 1, organizationId, isDefault: true, isSystem: true, isHiddenIfEmpty: false },
    { name: "In Progress", color: "#f59e0b", order: 2, organizationId, isDefault: true, isSystem: true, isHiddenIfEmpty: false },
    { name: "In Review", color: "#8b5cf6", order: 3, organizationId, isDefault: true, isSystem: true, isHiddenIfEmpty: true },
    { name: "Done", color: "#10b981", order: 4, organizationId, isDefault: true, isSystem: true, isHiddenIfEmpty: false },
    { name: "Archived", color: "#94a3b8", order: 5, organizationId, isDefault: true, isSystem: true, isHiddenIfEmpty: true },
  ];
  
  return await Status.insertMany(defaults);
};
