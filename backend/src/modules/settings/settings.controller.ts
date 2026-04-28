import { Request, Response, NextFunction } from 'express';
import * as settingsService from './settings.service.js';

export const getDefaultAssignees = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const result = await settingsService.getDefaultAssignees(userId);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDefaultAssignees = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { defaultAssignees } = req.body;

    if (!Array.isArray(defaultAssignees)) {
      return res.status(400).json({
        success: false,
        message: 'defaultAssignees must be an array',
      });
    }

    const result = await settingsService.updateDefaultAssignees(userId, defaultAssignees);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getDefaultStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const result = await settingsService.getDefaultStatus(userId);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDefaultStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { defaultTaskStatus } = req.body;

    const result = await settingsService.updateDefaultStatus(userId, defaultTaskStatus);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

