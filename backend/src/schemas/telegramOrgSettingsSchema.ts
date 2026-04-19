import mongoose from 'mongoose';

const telegramOrgSettingsSchema = new mongoose.Schema({
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true,
    unique: true,
    index: true
  },
  isEnabled: { type: Boolean, default: false },
  preferences: {
    notify_admin_logins: { type: Boolean, default: true },
    notify_task_created: { type: Boolean, default: true },
    notify_task_updated: { type: Boolean, default: true },
    notify_task_deleted: { type: Boolean, default: true },
    notify_mentions: { type: Boolean, default: true },
    notify_all_activity: { type: Boolean, default: false }
  },
  audience: {
    type: String,
    enum: ['ONLY_ADMINS', 'ALL_MEMBERS', 'CUSTOM'],
    default: 'ONLY_ADMINS'
  },
  customRecipientIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

export default telegramOrgSettingsSchema;
