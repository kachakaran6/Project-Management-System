import mongoose from 'mongoose';
import taskAssigneeSchema from '../schemas/taskAssigneeSchema.js';

const TaskAssignee = mongoose.model('TaskAssignee', taskAssigneeSchema);

export default TaskAssignee;
