import TelegramConnection from '../../models/TelegramConnection.js';
import TelegramOrgSettings from '../../models/TelegramOrgSettings.js';
import User from '../../models/User.js';
import { AppError } from '../../middlewares/errorHandler.js';

const getBotToken = () => process.env.TELEGRAM_BOT_TOKEN;

type TelegramTaskEventType =
  | 'TASK_CREATED'
  | 'TASK_STATUS_UPDATED'
  | 'TASK_UPDATED'
  | 'TASK_ASSIGNED'
  | 'TASK_DELETED'
  | 'MENTION'
  | 'COMMENT_CREATED';

type TelegramMessagePayload = {
  taskId?: string;
  taskTitle?: string;
  projectName?: string;
  actorName?: string;
  oldStatus?: string;
  newStatus?: string;
  assignedTo?: string;
  assignedToId?: string;
  changedFields?: string[];
  comment?: string;
  timestamp?: string | Date;
};

type TelegramReceiver = {
  id?: string;
  name?: string;
};

const formatStatus = (status?: string) => {
  if (!status) return '-';
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const formatTime = (timestamp?: string | Date) => {
  const date = timestamp ? new Date(timestamp) : new Date();
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const withBase = (title: string, emoji: string, lines: string[]) => {
  return `${emoji} *${title}*\n━━━━━━━━━━━━━━━\n${lines.join('\n')}`;
};

export const buildTelegramMessage = (
  eventType: TelegramTaskEventType,
  payload: TelegramMessagePayload,
  receiver?: TelegramReceiver,
) => {
  const taskTitle = payload.taskTitle || 'Untitled Task';
  const projectName = payload.projectName || 'General';
  const actorName = payload.actorName || 'System';
  const time = formatTime(payload.timestamp);

  if (eventType === 'TASK_CREATED') {
    return withBase('Task Created', '🔔', [
      `*Task:* ${taskTitle}`,
      `*Project:* ${projectName}`,
      `*Created by:* ${actorName}`,
      `*Assigned to:* ${payload.assignedTo || '-'}`,
      `*Status:* ${formatStatus(payload.newStatus)}`,
      `*Time:* ${time}`,
    ]);
  }

  if (eventType === 'TASK_STATUS_UPDATED') {
    return withBase('Task Status Updated', '🔄', [
      `*Task:* ${taskTitle}`,
      `*Project:* ${projectName}`,
      `*Updated by:* ${actorName}`,
      `*Change:* ${formatStatus(payload.oldStatus)} → ${formatStatus(payload.newStatus)}`,
      `*Time:* ${time}`,
    ]);
  }

  if (eventType === 'TASK_UPDATED') {
    const changed = payload.changedFields?.length ? payload.changedFields.join(', ') : '-';
    return withBase('Task Updated', '✏️', [
      `*Task:* ${taskTitle}`,
      `*Project:* ${projectName}`,
      `*Updated by:* ${actorName}`,
      `*Fields changed:* ${changed}`,
      `*Time:* ${time}`,
    ]);
  }

  if (eventType === 'TASK_ASSIGNED') {
    const isReceiverAssignee =
      Boolean(receiver?.id) &&
      Boolean(payload.assignedToId) &&
      String(receiver?.id) === String(payload.assignedToId);
    return withBase('Task Assigned', '👤', [
      `*Task:* ${taskTitle}`,
      `*Project:* ${projectName}`,
      `*Assigned to:* ${isReceiverAssignee ? 'You' : payload.assignedTo || '-'}`,
      `*Assigned by:* ${actorName}`,
      `*Time:* ${time}`,
    ]);
  }

  if (eventType === 'TASK_DELETED') {
    return withBase('Task Deleted', '🗑️', [
      `*Task:* ${taskTitle}`,
      `*Project:* ${projectName}`,
      `*Deleted by:* ${actorName}`,
      `*Time:* ${time}`,
    ]);
  }

  if (eventType === 'COMMENT_CREATED') {
    // Trim comment to 120-150 chars with ellipsis if needed
    let displayComment = payload.comment || '-';
    if (displayComment.length > 150) {
      displayComment = displayComment.substring(0, 147) + '...';
    }
    return withBase('New Comment Added', '💬', [
      `*Task:* ${taskTitle}`,
      `*Project:* ${projectName}`,
      `*Comment by:* ${actorName}`,
      `*Comment:* "${displayComment}"`,
      `*Time:* ${time}`,
    ]);
  }

  // Default: You were mentioned (for MENTION type)
  return withBase('You were mentioned', '💬', [
    `*Task:* ${taskTitle}`,
    `*Project:* ${projectName}`,
    `*By:* ${actorName}`,
    `*Comment:* "${payload.comment || '-'}"`,
    `*Time:* ${time}`,
  ]);
};

/**
 * Broadcasts a Telegram notification to relevant members of an organization
 */
export const broadcastToOrg = async ({
  organizationId,
  eventType,
  message,
  excludeUserId,
  onlyToUserIds
}: {
  organizationId: string;
  eventType: 'LOGINS' | 'TASKS' | 'COMMENTS' | 'ACTIVITY' | 'ALL';
  message: string;
  excludeUserId?: string;
  onlyToUserIds?: string[];
}) => {
  try {
    const orgSettings = await TelegramOrgSettings.findOne({ organizationId });
    if (!orgSettings || !orgSettings.isEnabled) return;

    // Check specific preference for the event
    const preferences = orgSettings.preferences as any;
    if (preferences?.track_all) {
      // Allow all
    } else {
      const prefMap: Record<string, string> = {
        'LOGINS': 'track_logins',
        'TASKS': 'track_tasks',
        'COMMENTS': 'track_comments',
        'ACTIVITY': 'track_activity'
      };
      const prefKey = prefMap[eventType];
      if (!prefKey || preferences[prefKey] === false) {
        return;
      }
    }

    const token = getBotToken();
    if (!token) return;

    // Determine Recipients
    let targetUserIds: string[] = [];

    if (onlyToUserIds && onlyToUserIds.length > 0) {
      targetUserIds = onlyToUserIds;
    } else {
      const connections = await TelegramConnection.find({ 
        organizationId, 
        isConnected: true 
      }).select('userId role');

      if (orgSettings.audience === 'ONLY_ADMINS') {
        targetUserIds = (connections as any[])
          .filter(c => c.role === 'ADMIN')
          .map(c => c.userId?.toString())
          .filter(Boolean);
      } else if (orgSettings.audience === 'ALL_MEMBERS') {
        targetUserIds = (connections as any[])
          .map(c => c.userId?.toString())
          .filter(Boolean);
      } else if (orgSettings.audience === 'CUSTOM') {
        const customIds = (orgSettings.customRecipientIds as any[]).map(id => id.toString());
        targetUserIds = (connections as any[])
          .filter(c => customIds.includes(c.userId?.toString()))
          .map(c => c.userId?.toString())
          .filter(Boolean);
      }
    }

    // Filter excluded user (usually the actor)
    if (excludeUserId) {
      targetUserIds = targetUserIds.filter(id => id !== excludeUserId);
    }

    if (targetUserIds.length === 0) return;

    // Get Chat IDs
    const finalConnections = await TelegramConnection.find({
      organizationId,
      userId: { $in: targetUserIds },
      isConnected: true
    }).select('chatId');

    const chatIds = (finalConnections as any[]).map(c => c.chatId).filter(Boolean);

    // Send messages in parallel (Fire and forget)
    chatIds.forEach((chatId: string) => 
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      }).catch(err => console.error(`Telegram message failed for chatId ${chatId}:`, err))
    );
  } catch (error) {
    console.error('Telegram broadcast failed:', error);
  }
};

/**
 * Sends a direct Telegram message to a specific user for a specific organization context
 */
export const sendDirectNotification = async (userId: string, organizationId: string, message: string) => {
  try {
    const connection = await TelegramConnection.findOne({ userId, organizationId, isConnected: true });
    if (!connection || !connection.chatId) return;

    const token = getBotToken();
    if (!token) return;

    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: connection.chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    }).catch(err => console.error('Telegram direct message failed:', err));
  } catch (error) {
    console.error('Telegram direct message failed:', error);
  }
};

/**
 * Formats a message for Telegram with Organization context
 */
export const formatTelegramMessage = (title: string, orgName: string, details: Record<string, any>, emoji: string = '🔔') => {
  let message = `${emoji} *${title}*\n`;
  message += `━━━━━━━━━━━━━━━\n`;
  
  for (const [key, value] of Object.entries(details)) {
    if (value !== undefined && value !== null) {
      message += `*${key}:* ${value}\n`;
    }
  }

  message += `*Org:* ${orgName}\n`;
  message += `*Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}\n`;
  
  return message;
};

/**
 * Polls Telegram updates to connect user to an organization
 */
export const syncTelegramConnection = async (userId: string, organizationId: string) => {
  const token = getBotToken();
  if (!token) throw new AppError('Telegram Bot Token not configured', 500);

  const connection = await TelegramConnection.findOne({ userId, organizationId }).select('+verificationToken');
  if (!connection || !connection.verificationToken) {
    throw new AppError('Connection not initiated', 400);
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
    const data: any = await response.json();
    const updates = data.result || [];

    // Search for a message that contains our verificationToken
    const matchingUpdate = updates.find((update: any) => {
      const text = update.message?.text || '';
      return text.includes(connection.verificationToken);
    });

    if (matchingUpdate) {
      connection.chatId = matchingUpdate.message.chat.id.toString();
      connection.isConnected = true;
      (connection as any).verificationToken = undefined;
      await (connection as any).save();

      // Send welcome message
      await sendDirectNotification(userId, organizationId, '✅ *Connection Successful!*\nYou are now linked to this organization. You will receive notifications based on admin settings.');
      
      return connection;
    }

    return null;
  } catch (error) {
    console.error('Telegram sync failed:', error);
    throw new AppError('Failed to sync with Telegram', 500);
  }
};
