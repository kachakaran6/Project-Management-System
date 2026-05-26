import User from '../../models/User.js';
import { AppError } from '../../middlewares/errorHandler.js';
import mongoose from 'mongoose';

export const getDefaultStatus = async (userId: string) => {
  const user = await User.findById(userId).select('settings.defaultTaskStatus').lean();

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return { defaultTaskStatus: user.settings?.defaultTaskStatus || null };
};

export const updateDefaultStatus = async (userId: string, defaultTaskStatus: string | null) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { 'settings.defaultTaskStatus': defaultTaskStatus } },
    { new: true }
  ).select('settings.defaultTaskStatus');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return { defaultTaskStatus: user.settings?.defaultTaskStatus || null };
};

export const getSuggestionSettings = async (userId: string) => {
  const user = await User.findById(userId).select('settings.taskSuggestionsEnabled').lean();
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return { taskSuggestionsEnabled: user.settings?.taskSuggestionsEnabled ?? false };
};

export const updateSuggestionSettings = async (userId: string, enabled: boolean) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { 'settings.taskSuggestionsEnabled': enabled } },
    { new: true }
  ).select('settings.taskSuggestionsEnabled');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return { taskSuggestionsEnabled: user.settings?.taskSuggestionsEnabled ?? false };
};

