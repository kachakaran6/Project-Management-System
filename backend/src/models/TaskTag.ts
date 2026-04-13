import mongoose from 'mongoose';
import taskTagSchema from '../schemas/taskTagSchema.js';

const TaskTag = mongoose.model('TaskTag', taskTagSchema);

export default TaskTag;
