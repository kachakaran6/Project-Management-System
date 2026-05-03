import { Request, Response } from 'express';
import TelegramConnection from '../../models/TelegramConnection.js';
import GithubAccount from '../../models/GithubAccount.js';

export const getIntegrations = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const orgId = req.organizationId;

  const [telegramConn, githubAcc] = await Promise.all([
    TelegramConnection.findOne({ userId, organizationId: orgId }),
    GithubAccount.findOne({ userId })
  ]);

  res.json({
    success: true,
    data: {
      telegram: {
        connected: !!telegramConn?.isConnected,
        username: telegramConn?.username || null,
        firstName: telegramConn?.firstName || null,
        lastName: telegramConn?.lastName || null,
        telegramId: telegramConn?.telegramId || null,
        chatId: telegramConn?.chatId || null
      },
      github: {
        connected: !!githubAcc,
        username: githubAcc?.username || null,
        avatarUrl: githubAcc?.avatarUrl || null
      }
    }
  });
};
