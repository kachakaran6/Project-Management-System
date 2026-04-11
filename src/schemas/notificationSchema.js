import mongoose from 'mongoose';
import { NOTIFICATION_TYPES } from '../constants/index.js';

const notificationSchema = new mongoose.Schema({
  recipientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { 
    type: String, 
    enum: Object.values(NOTIFICATION_TYPES), 
    required: true 
  },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String }, // Internal deep link
  isRead: { type: Boolean, default: false, index: true },
  readAt: { type: Date },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: true
});

// Index for fetching unread notifications quickly
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

export default notificationSchema;
