import mongoose from 'mongoose';
import activitySchema from '../schemas/activitySchema.js';

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;
