import mongoose from 'mongoose';

const taskVisibilityUserSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Compound unique index to prevent duplicates
taskVisibilityUserSchema.index({ taskId: 1, userId: 1 }, { unique: true });

const TaskVisibilityUser = mongoose.model('TaskVisibilityUser', taskVisibilityUserSchema);

export default TaskVisibilityUser;
