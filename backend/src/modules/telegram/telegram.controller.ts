import { Request, Response } from 'express';
import crypto from 'crypto';
import TelegramConnection from '../../models/TelegramConnection.js';
import TelegramOrgSettings from '../../models/TelegramOrgSettings.js';
import * as telegramService from '../notification/telegram.service.js';
import { AppError } from '../../middlewares/errorHandler.js';

export const getSettings = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const orgId = req.organizationId;

  if (!orgId) {
    throw new AppError('Organization context required', 400);
  }

  const [connection, orgSettings, activeConnections] = await Promise.all([
    TelegramConnection.findOne({ userId, organizationId: orgId }),
    TelegramOrgSettings.findOne({ organizationId: orgId }),
    TelegramConnection.find({ organizationId: orgId, isConnected: true })
      .populate('userId', 'firstName lastName')
  ]);

  res.json({
    success: true,
    data: {
      connection: connection || { isConnected: false, userId, organizationId: orgId },
      orgSettings: orgSettings || { 
        isEnabled: false, 
        preferences: {
          track_logins: true,
          track_tasks: true,
          track_comments: true,
          track_activity: true,
          track_all: false
        },
        audience: 'ONLY_ADMINS'
      },
      activeConnections: activeConnections.map((c: any) => ({
        name: `${c.userId?.firstName || 'Unknown'} ${c.userId?.lastName || ''}`,
        role: c.role,
        chatId: c.chatId
      })),
      role: req.role
    }
  });
};

export const initiateConnection = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const orgId = req.organizationId;

  if (!orgId) {
    throw new AppError('Organization context required', 400);
  }

  const token = crypto.randomBytes(8).toString('hex');
  const verificationToken = `${userId}_${token}`;
  
  await TelegramConnection.findOneAndUpdate(
    { userId, organizationId: orgId },
    { 
      verificationToken, 
      isConnected: false,
      role: req.role === 'ADMIN' ? 'ADMIN' : 'MEMBER'
    },
    { upsert: true, new: true }
  );

  const botName = process.env.TELEGRAM_BOT_NAME || 'YourBotName';
  const connectionLink = `https://t.me/${botName}?start=${verificationToken}`;

  res.json({
    success: true,
    data: {
      connectionLink,
      verificationToken
    }
  });
};

export const verifyConnection = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const orgId = req.organizationId;

  if (!orgId) {
    throw new AppError('Organization context required', 400);
  }

  const connection = await telegramService.syncTelegramConnection(userId, orgId);

  if (connection) {
    res.json({
      success: true,
      message: 'Connected successfully',
      data: connection
    });
  } else {
    res.json({
      success: false,
      message: 'Still waiting for connection. Please make sure you clicked /start in the bot.'
    });
  }
};

export const updateOrgSettings = async (req: Request, res: Response) => {
  const orgId = req.organizationId;
  const { isEnabled, preferences, audience, customRecipientIds } = req.body;

  if (req.role !== 'ADMIN' && req.role !== 'SUPER_ADMIN') {
    throw new AppError('Only organization admins can update these settings', 403);
  }

  const settings = await TelegramOrgSettings.findOneAndUpdate(
    { organizationId: orgId },
    { 
      $set: { 
        isEnabled, 
        preferences, 
        audience, 
        customRecipientIds 
      } 
    },
    { new: true, upsert: true }
  );

  res.json({
    success: true,
    data: settings
  });
};

export const disconnect = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const orgId = req.organizationId;

  await TelegramConnection.findOneAndDelete({ userId, organizationId: orgId });

  res.json({
    success: true,
    message: 'Disconnected successfully'
  });
};

export const trackActivity = async (req: Request, res: Response) => {
  const { action, metadata, resourceId, resourceType } = req.body;
  const userId = req.user.id;
  const orgId = req.organizationId;

  if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });

  const { logActivity } = await import('../../utils/systemTriggers.js');

  await logActivity({
    userId,
    organizationId: orgId,
    action: action || 'ACTION_PERFORMED',
    resourceType: resourceType || 'ACTIVITY',
    resourceId: resourceId || userId,
    message: metadata?.message,
    metadata: metadata || {}
  });

  res.json({ success: true });
};
