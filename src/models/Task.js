import mongoose from 'mongoose';
import taskSchema from '../schemas/taskSchema.js';

const Task = mongoose.model('Task', taskSchema);

export default Task;
