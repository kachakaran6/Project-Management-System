import TelegramConnection from '../../models/TelegramConnection.js';
import TelegramOrgSettings from '../../models/TelegramOrgSettings.js';
import User from '../../models/User.js';
import OrganizationMember from '../../models/OrganizationMember.js';
import { AppError } from '../../middlewares/errorHandler.js';

const TELEGRAM_DEBUG = false;

const getBotToken = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (TELEGRAM_DEBUG && !token) {
    console.error("[TELEGRAM DEBUG ERROR]", {
      step: "MISSING_BOT_TOKEN",
      timestamp: new Date().toISOString()
    });
  }
  return token;
};

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

export const shouldSendTelegram = (user: any, event: { type: 'TASK' | 'PROJECT'; action: string; assignedTo?: string; createdBy?: string }) => {
  // Use existing settings path
  const settings = user?.settings?.telegramSettings;
  
  // Default to true for existing users without these settings yet
  if (!settings) return true; 
  if (settings.enabled === false) return false;

  const userRole = (user.role || 'MEMBER').toUpperCase();
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'OWNER'].includes(userRole);

  // TASK EVENTS
  if (event.type === 'TASK') {
    if (isAdmin && settings.taskNotifications?.all) return true;

    const isAssigned = event.assignedTo && String(event.assignedTo) === String(user._id);
    const isCreator = event.createdBy && String(event.createdBy) === String(user._id);
    
    if (settings.taskNotifications?.assigned && isAssigned) return true;
    if (settings.taskNotifications?.created && isCreator) return true;
    
    return false;
  }

  // PROJECT EVENTS
  if (event.type === 'PROJECT') {
    if (isAdmin && settings.projectNotifications?.all) return true;

    const isCreator = event.createdBy && String(event.createdBy) === String(user._id);
    if (settings.projectNotifications?.created && isCreator) return true;
    
    return false;
  }

  // ACTIVITY EVENTS (Page Opened, Actions)
  if (event.type === 'ACTIVITY') {
    if (isAdmin && (settings.activityNotifications?.all ?? true)) return true;
    
    const isActor = event.createdBy && String(event.createdBy) === String(user._id);
    const pref = settings.activityNotifications?.own ?? true; // Default to true if field missing
    if (pref && isActor) return true;
    
    return false;
  }

  // LOGIN EVENTS
  if (event.type === 'LOGIN') {
    if (isAdmin && (settings.loginNotifications?.all ?? true)) return true;
    
    const isActor = event.createdBy && String(event.createdBy) === String(user._id);
    const pref = settings.loginNotifications?.own ?? true; // Default to true if field missing
    if (pref && isActor) return true;
    
    return false;
  }

  return false;
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
  action,
  message,
  excludeUserId,
  onlyToUserIds,
  eventContext
}: {
  organizationId: string;
  eventType: 'LOGINS' | 'TASKS' | 'COMMENTS' | 'ACTIVITY' | 'ALL';
  action?: string;
  message: string;
  excludeUserId?: string;
  onlyToUserIds?: string[];
  eventContext?: { type: 'TASK' | 'PROJECT'; assignedTo?: string; createdBy?: string }
}) => {
  try {
    const orgSettings = await TelegramOrgSettings.findOne({ organizationId }).lean();
    if (TELEGRAM_DEBUG) {
      console.log("[TELEGRAM DEBUG]", {
        step: "ORG_SETTINGS_CHECK",
        exists: !!orgSettings,
        isEnabled: orgSettings?.isEnabled,
        timestamp: new Date().toISOString()
      });
    }
    if (!orgSettings || !orgSettings.isEnabled) return;

    // Check specific preference for the event
    const preferences = orgSettings.preferences as any;
    if (preferences?.track_all) {
      // Allow all
    } else {
      // 1. Check granular action-based preference if action is provided
      if (action) {
        const actionPrefKey = `notify_${action.toLowerCase()}`;
        if (preferences[actionPrefKey] === false) {
          if (TELEGRAM_DEBUG) {
            console.log("[TELEGRAM DEBUG]", {
              step: "PREFERENCE_REJECTED",
              key: actionPrefKey,
              timestamp: new Date().toISOString()
            });
          }
          return;
        }
      }

      // 2. Fallback to broad eventType check
      const prefMap: Record<string, string> = {
        'LOGINS': 'track_logins',
        'TASKS': 'track_tasks',
        'COMMENTS': 'track_comments',
        'ACTIVITY': 'track_activity'
      };
      const prefKey = prefMap[eventType];
      if (prefKey && preferences[prefKey] === false) {
        if (TELEGRAM_DEBUG) {
          console.log("[TELEGRAM DEBUG]", {
            step: "PREFERENCE_REJECTED",
            key: prefKey,
            timestamp: new Date().toISOString()
          });
        }
        return;
      }
    }

    const token = getBotToken();
    if (!token) {
      if (TELEGRAM_DEBUG) {
        console.log("[TELEGRAM DEBUG]", {
          step: "MISSING_TOKEN",
          timestamp: new Date().toISOString()
        });
      }
      return;
    }

    const connections = await TelegramConnection.find({ 
      organizationId, 
      isConnected: true 
    }).select('userId role');

    if (TELEGRAM_DEBUG) {
      console.log("[TELEGRAM DEBUG]", {
        step: "CONNECTIONS_FOUND",
        count: connections.length,
        roles: connections.map(c => c.role),
        timestamp: new Date().toISOString()
      });
    }

    // Determine Recipients
    let targetUserIds: string[] = [];

    if (onlyToUserIds && onlyToUserIds.length > 0) {
      targetUserIds = onlyToUserIds;
    } else {
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

    if (TELEGRAM_DEBUG) {
      console.log("[TELEGRAM DEBUG]", {
        step: "TARGET_USERS",
        count: targetUserIds.length,
        audience: orgSettings.audience,
        timestamp: new Date().toISOString()
      });
    }

    // Filter excluded user (usually the actor)
    // IMPORTANT: We do NOT exclude ADMINS/OWNERS because they want to track every single event
    if (excludeUserId) {
      // Get the real role of the actor (Check both Global Role and Org Role)
      const [actorUser, actorMember] = await Promise.all([
        User.findById(excludeUserId).select('role').lean(),
        OrganizationMember.findOne({ organizationId, userId: excludeUserId }).select('role').lean()
      ]);

      const actorRole = (actorMember?.role || actorUser?.role || 'MEMBER').toUpperCase();
      const isExcludedAdmin = ['ADMIN', 'OWNER', 'SUPER_ADMIN'].includes(actorRole);

      if (TELEGRAM_DEBUG) {
        console.log("[TELEGRAM DEBUG]", {
          step: "EXCLUSION_CHECK",
          excludeUserId,
          actorUserRole: actorUser?.role,
          actorMemberRole: actorMember?.role,
          isExcludedAdmin,
          timestamp: new Date().toISOString()
        });
      }

      if (!isExcludedAdmin) {
        targetUserIds = targetUserIds.filter(id => id !== excludeUserId);
      }
    }

    if (TELEGRAM_DEBUG) {
      console.log("[TELEGRAM DEBUG]", {
        step: "FINAL_TARGET_USERS",
        count: targetUserIds.length,
        timestamp: new Date().toISOString()
      });
    }

    if (targetUserIds.length === 0) return;

    const finalConnections = await TelegramConnection.find({
      organizationId,
      userId: { $in: targetUserIds },
      isConnected: true
    }).populate('userId');

    if (TELEGRAM_DEBUG) {
      console.log("[TELEGRAM DEBUG]", {
        step: "FINAL_CONNECTIONS_COUNT",
        count: finalConnections.length,
        timestamp: new Date().toISOString()
      });
    }

    const chatIds: string[] = [];

    for (const conn of (finalConnections as any[])) {
      const user = conn.userId;
      if (!user) {
        if (TELEGRAM_DEBUG) console.log("[TELEGRAM DEBUG] SKIP: User not found for connection", conn._id);
        continue;
      }
      if (!conn.chatId) {
        if (TELEGRAM_DEBUG) console.log("[TELEGRAM DEBUG] SKIP: ChatId missing for user", user._id);
        continue;
      }

      if (eventContext) {
        const shouldSend = shouldSendTelegram(user, {
          ...eventContext,
          action: action || 'UPDATED'
        });

        if (TELEGRAM_DEBUG) {
          console.log("[TELEGRAM DEBUG]", {
            step: "NOTIFICATION_DECISION",
            userId: user._id,
            role: user.role,
            eventType: eventContext.type,
            decision: shouldSend,
            timestamp: new Date().toISOString()
          });
        }

        if (!shouldSend) continue;
      }

      if (conn.chatId) {
        chatIds.push(conn.chatId);
      }
    }

    // Send messages in parallel (Fire and forget)
    const uniqueChatIds = Array.from(new Set(chatIds));

    if (TELEGRAM_DEBUG) {
      console.log("[TELEGRAM DEBUG]", {
        step: "FINAL_SUMMARY_PRE_SEND",
        totalRecipients: uniqueChatIds.length,
        timestamp: new Date().toISOString()
      });
    }

    uniqueChatIds.forEach((chatId: string) => {
      if (TELEGRAM_DEBUG) {
        console.log("[TELEGRAM DEBUG]", {
          step: "API_REQUEST",
          url: `https://api.telegram.org/bot${token}/sendMessage`,
          payload: { chat_id: chatId, text: message.slice(0, 50) + "..." },
          timestamp: new Date().toISOString()
        });
      }

      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      })
      .then(async (res) => {
        if (TELEGRAM_DEBUG) {
          const data = await res.json();
          if (res.ok) {
            console.log("[TELEGRAM DEBUG]", {
              step: "MESSAGE_SENT_SUCCESS",
              telegramId: chatId,
              response: data,
              timestamp: new Date().toISOString()
            });
          } else {
            console.error("[TELEGRAM DEBUG ERROR]", {
              step: "MESSAGE_FAILED",
              telegramId: chatId,
              error: data.description || "Unknown Telegram API error",
              timestamp: new Date().toISOString()
            });
          }
        }
      })
      .catch(err => {
        if (TELEGRAM_DEBUG) {
          console.error("[TELEGRAM DEBUG ERROR]", {
            step: "API_TIMEOUT_OR_NETWORK_ERROR",
            telegramId: chatId,
            error: err.message,
            stack: err.stack,
            timestamp: new Date().toISOString()
          });
        }
        console.error(`Telegram message failed for chatId ${chatId}:`, err);
      });
    });
  } catch (error: any) {
    if (TELEGRAM_DEBUG) {
      console.error("[TELEGRAM DEBUG ERROR]", {
        step: "BROADCAST_PROCESS_FAILED",
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
};

/**
 * Sends a direct Telegram message to a specific user for a specific organization context
 */
export const sendDirectNotification = async (
  userId: string, 
  organizationId: string, 
  message: string,
  eventContext?: { type: 'TASK' | 'PROJECT'; assignedTo?: string; createdBy?: string; action?: string }
) => {
  try {
    const [connection, user] = await Promise.all([
      TelegramConnection.findOne({ userId, organizationId, isConnected: true }).lean(),
      User.findById(userId).lean()
    ]);

    if (!connection || !connection.chatId || !user) return;

    if (eventContext) {
      const shouldSend = shouldSendTelegram(user, {
        type: eventContext.type,
        action: eventContext.action || 'UPDATED',
        assignedTo: eventContext.assignedTo,
        createdBy: eventContext.createdBy
      });

      if (TELEGRAM_DEBUG) {
        console.log("[TELEGRAM DEBUG]", {
          step: "NOTIFICATION_DECISION",
          type: "DIRECT",
          userId,
          role: user.role,
          eventType: eventContext.type,
          decision: shouldSend,
          timestamp: new Date().toISOString()
        });
      }

      if (!shouldSend) return;
    }

    const token = getBotToken();
    if (!token) return;

    if (TELEGRAM_DEBUG) {
      console.log("[TELEGRAM DEBUG]", {
        step: "API_REQUEST",
        type: "DIRECT_NOTIFICATION",
        userId,
        telegramId: connection.chatId,
        messagePreview: message.slice(0, 50),
        timestamp: new Date().toISOString()
      });
    }

    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: connection.chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    })
    .then(async (res) => {
      if (TELEGRAM_DEBUG) {
        const data = await res.json();
        if (res.ok) {
          console.log("[TELEGRAM DEBUG]", {
            step: "MESSAGE_SENT_SUCCESS",
            userId,
            telegramId: connection.chatId,
            response: data,
            timestamp: new Date().toISOString()
          });
        } else {
          console.error("[TELEGRAM DEBUG ERROR]", {
            step: "MESSAGE_FAILED",
            userId,
            telegramId: connection.chatId,
            error: data.description || "Unknown Telegram API error",
            timestamp: new Date().toISOString()
          });
        }
      }
    })
    .catch(err => {
      if (TELEGRAM_DEBUG) {
        console.error("[TELEGRAM DEBUG ERROR]", {
          step: "API_TIMEOUT_OR_NETWORK_ERROR",
          userId,
          telegramId: connection.chatId,
          error: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString()
        });
      }
      console.error('Telegram direct message failed:', err);
    });
  } catch (error: any) {
    if (TELEGRAM_DEBUG) {
      console.error("[TELEGRAM DEBUG ERROR]", {
        step: "DIRECT_SEND_PROCESS_FAILED",
        userId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
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
      const from = matchingUpdate.message.from;
      connection.chatId = matchingUpdate.message.chat.id.toString();
      (connection as any).telegramId = from.id.toString();
      (connection as any).username = from.username;
      (connection as any).firstName = from.first_name;
      (connection as any).lastName = from.last_name;
      connection.isConnected = true;
      (connection as any).verificationToken = undefined;
      await (connection as any).save();

      // Send welcome message
      await sendDirectNotification(userId, organizationId, '✅ *Connection Successful!*\nYou are now linked to this organization. You will receive notifications based on admin settings.');
      
      return connection;
    }

    return null;
  } catch (error) {
    throw new AppError('Failed to sync with Telegram', 500);
  }
};

/**
 * Sends a quick confirmation message when a setting is toggled
 */
export const sendConfirmation = async (userId: string, organizationId: string, label: string, isEnabled: boolean) => {
  const status = isEnabled ? '✅ ENABLED' : '❌ DISABLED';
  const message = `⚙️ *Settings Updated*\n━━━━━━━━━━━━━━━\n*Feature:* ${label}\n*Status:* ${status}\n\n_The system will now reflect this change immediately._`;
  await sendDirectNotification(userId, organizationId, message);
};
