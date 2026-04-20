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
    track_logins: { type: Boolean, default: true },
    track_tasks: { type: Boolean, default: true },
    track_comments: { type: Boolean, default: true },
    track_activity: { type: Boolean, default: true },
    track_all: { type: Boolean, default: false }
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
