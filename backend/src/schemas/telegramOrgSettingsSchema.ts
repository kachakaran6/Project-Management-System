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
    // Legacy broad toggles (keeping for compatibility if needed, but we will prioritize specific ones)
    track_logins: { type: Boolean, default: true },
    track_tasks: { type: Boolean, default: true },
    track_comments: { type: Boolean, default: true },
    track_activity: { type: Boolean, default: true },
    track_all: { type: Boolean, default: false },

    // Granular toggles
    notify_task_created: { type: Boolean, default: true },
    notify_task_updated: { type: Boolean, default: true },
    notify_task_deleted: { type: Boolean, default: true },
    notify_task_status_updated: { type: Boolean, default: true },
    notify_task_assigned: { type: Boolean, default: true },
    
    notify_project_created: { type: Boolean, default: true },
    notify_project_updated: { type: Boolean, default: true },
    notify_project_deleted: { type: Boolean, default: true },

    notify_comment_created: { type: Boolean, default: true },
    notify_mentions: { type: Boolean, default: true },

    notify_user_login: { type: Boolean, default: true },
    notify_failed_login: { type: Boolean, default: true },

    notify_page_opened: { type: Boolean, default: true },
    notify_action_performed: { type: Boolean, default: true }
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
