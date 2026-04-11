import Task from '../../models/Task.js';
import Project from '../../models/Project.js';
import Workspace from '../../models/Workspace.js';

/**
 * Perform a global search across tasks, projects and workspaces
 */
export const searchGlobal = async (query: any, organizationId: any) => {
  if (!query) return { tasks: [], projects: [], workspaces: [] };

  // Use MongoDB text search capability
  const [tasks, projects, workspaces] = await Promise.all([
    // Task Search
    Task.find({
      organizationId,
      $text: { $search: query },
      isActive: true
    })
    .limit(10)
    .populate('projectId', 'name')
    .select('title status priority createdAt')
    .lean(),

    // Project Search
    Project.find({
      organizationId,
      $text: { $search: query },
      isActive: true
    })
    .limit(10)
    .select('name status description createdAt')
    .lean(),

    // Workspace Search
    Workspace.find({
      organizationId,
      $text: { $search: query },
      isActive: true
    })
    .limit(10)
    .select('name description icon')
    .lean()
  ]);

  return { tasks, projects, workspaces };
};
