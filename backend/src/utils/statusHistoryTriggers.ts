import TaskStatusHistory from '../models/TaskStatusHistory.js';
import User from '../models/User.js';
import Status from '../models/Status.js';
import mongoose from 'mongoose';

/**
 * Logs a status change for a task.
 */
export const logStatusChange = async ({
  taskId,
  userId,
  userName,
  fromStatus,
  toStatus,
  organizationId
}: {
  taskId: any;
  userId: any;
  userName?: string;
  fromStatus: any;
  toStatus: any;
  organizationId: any;
}) => {
  try {
    // Don't log if status hasn't actually changed
    if (String(fromStatus) === String(toStatus)) {
      return null;
    }

    let finalUserName = userName;
    if (!finalUserName) {
      const user = await User.findById(userId).select('firstName lastName email').lean();
      if (user) {
        finalUserName = `${user.firstName} ${user.lastName || ''}`.trim() || user.email;
      } else {
        finalUserName = 'Unknown User';
      }
    }

    // Resolve status names and colors
    const resolveStatus = async (statusId: any) => {
      if (!statusId) return null;
      
      // If it's a valid ObjectId, try to find the Status document
      if (mongoose.Types.ObjectId.isValid(statusId)) {
        const statusDoc = await Status.findById(statusId).lean();
        if (statusDoc) {
          return { name: statusDoc.name, color: statusDoc.color };
        }
      }
      
      // If it's a string (legacy) or Status doc not found, use string as name
      return { name: String(statusId), color: '#64748b' };
    };

    const [fromDetails, toDetails] = await Promise.all([
      resolveStatus(fromStatus),
      resolveStatus(toStatus)
    ]);

    const history = await TaskStatusHistory.create({
      taskId,
      changedBy: userId,
      changedByName: finalUserName,
      fromStatus,
      fromStatusName: fromDetails?.name,
      fromStatusColor: fromDetails?.color,
      toStatus,
      toStatusName: toDetails?.name || String(toStatus),
      toStatusColor: toDetails?.color || '#64748b',
      organizationId,
      changedAt: new Date()
    });

    return history;
  } catch (error) {
    return null;
  }
};

