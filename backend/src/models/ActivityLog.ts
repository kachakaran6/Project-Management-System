import mongoose from 'mongoose';
import activityLogSchema from '../schemas/activityLogSchema.js';

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export default ActivityLog;
