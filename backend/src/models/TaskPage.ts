import mongoose from 'mongoose';
import taskPageSchema from '../schemas/taskPageSchema.js';

const TaskPage = mongoose.models.TaskPage || mongoose.model('TaskPage', taskPageSchema);

export default TaskPage;
