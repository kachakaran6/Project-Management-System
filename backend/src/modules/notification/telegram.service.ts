import TelegramConnection from '../../models/TelegramConnection.js';
import TelegramOrgSettings from '../../models/TelegramOrgSettings.js';
import User from '../../models/User.js';
import { AppError } from '../../middlewares/errorHandler.js';

const getBotToken = () => process.env.TELEGRAM_BOT_TOKEN;

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
  eventType: string;
  message: string;
  excludeUserId?: string;
  onlyToUserIds?: string[];
}) => {
  try {
    const orgSettings = await TelegramOrgSettings.findOne({ organizationId });
    if (!orgSettings || !orgSettings.isEnabled) return;

    // Check specific preference for the event
    const preferences = orgSettings.preferences as any;
    if (preferences?.notify_all_activity) {
      // Allow all
    } else {
      const prefKey = `notify_${eventType.toLowerCase()}`;
      if (!preferences || preferences[prefKey] === false) {
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
          .map(c => c.userId.toString());
      } else if (orgSettings.audience === 'ALL_MEMBERS') {
        targetUserIds = (connections as any[]).map(c => c.userId.toString());
      } else if (orgSettings.audience === 'CUSTOM') {
        const customIds = (orgSettings.customRecipientIds as any[]).map(id => id.toString());
        targetUserIds = (connections as any[])
          .filter(c => customIds.includes(c.userId.toString()))
          .map(c => c.userId.toString());
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

    // Send messages in parallel
    await Promise.all(chatIds.map((chatId: string) => 
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      })
    ));
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

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: connection.chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });
  } catch (error) {
    console.error('Telegram direct message failed:', error);
  }
};

/**
 * Formats a message for Telegram with Organization context
 */
export const formatTelegramMessage = (title: string, orgName: string, details: Record<string, any>) => {
  let message = `🔔 *${title}*\n`;
  message += `━━━━━━━━━━━━━━━\n`;
  message += `*Org:* ${orgName}\n`;
  
  for (const [key, value] of Object.entries(details)) {
    if (value) {
      message += `*${key}:* ${value}\n`;
    }
  }
  
  message += `*Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}\n`;
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
