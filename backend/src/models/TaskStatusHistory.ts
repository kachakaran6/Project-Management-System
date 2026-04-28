import mongoose from 'mongoose';
import taskStatusHistorySchema from '../schemas/taskStatusHistorySchema.js';

const TaskStatusHistory = mongoose.model('TaskStatusHistory', taskStatusHistorySchema);

export default TaskStatusHistory;
