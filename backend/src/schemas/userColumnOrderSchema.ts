import mongoose from 'mongoose';

const userColumnOrderSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  projectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project',
    required: false,
    index: true 
  },
  statusId: { 
    type: String, 
    required: true,
    index: true 
  },
  taskIds: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Task' 
  }]
}, {
  timestamps: true,
});

// Compound index for fast lookup of a specific column's order for a user
userColumnOrderSchema.index({ userId: 1, projectId: 1, statusId: 1 }, { unique: true });

export default userColumnOrderSchema;
