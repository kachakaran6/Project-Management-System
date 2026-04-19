import mongoose from 'mongoose';
import telegramOrgSettingsSchema from '../schemas/telegramOrgSettingsSchema.js';

const TelegramOrgSettings = mongoose.model('TelegramOrgSettings', telegramOrgSettingsSchema);

export default TelegramOrgSettings;
