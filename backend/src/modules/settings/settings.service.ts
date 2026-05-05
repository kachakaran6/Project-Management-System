import User from '../../models/User.js';
import { AppError } from '../../middlewares/errorHandler.js';
import mongoose from 'mongoose';

export const getDefaultAssignees = async (userId: string) => {
  const user = await User.findById(userId)
    .populate('settings.defaultAssignees', 'firstName lastName email avatarUrl')
    .select('settings.defaultAssignees')
    .lean();

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Normalize user objects for frontend
  const defaultAssignees = (user.settings?.defaultAssignees || []).map((u: any) => ({
    id: String(u._id || u.id),
    name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'Unknown User',
    email: u.email || '',
    avatarUrl: u.avatarUrl,
  }));

  return { defaultAssignees };
};

export const updateDefaultAssignees = async (userId: string, assigneeIds: string[]) => {
  // Ensure all userIds are valid and exist
  const validAssigneeIds = Array.from(new Set(assigneeIds.filter(id => mongoose.Types.ObjectId.isValid(id))));
  
  const existingUsers = await User.find({ _id: { $in: validAssigneeIds } }).select('_id');
  const foundIds = existingUsers.map(u => String(u._id));

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { 'settings.defaultAssignees': foundIds } },
    { new: true }
  ).populate('settings.defaultAssignees', 'firstName lastName email avatarUrl');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const defaultAssignees = (user.settings?.defaultAssignees || []).map((u: any) => ({
    id: String(u._id || u.id),
    name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'Unknown User',
    email: u.email || '',
    avatarUrl: u.avatarUrl,
  }));

  return { defaultAssignees };
};

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

