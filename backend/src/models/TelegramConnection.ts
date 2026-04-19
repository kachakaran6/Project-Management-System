import mongoose from 'mongoose';
import telegramConnectionSchema from '../schemas/telegramConnectionSchema.js';

const TelegramConnection = mongoose.model('TelegramConnection', telegramConnectionSchema);

export default TelegramConnection;
