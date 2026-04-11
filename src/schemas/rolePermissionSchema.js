import mongoose from 'mongoose';
import { ROLES } from '../constants/index.js';

const rolePermissionSchema = new mongoose.Schema({
  role: { 
    type: String, 
    enum: Object.values(ROLES), 
    required: true,
    index: true 
  },
  permission: { 
    type: String, 
    required: true,
    index: true 
  }, // e.g., 'task:create', 'project:delete'
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization',
    index: true 
  }, // Null for system-wide defaults, defined for custom overrides
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Ensure unique logic for role + permission per organization
rolePermissionSchema.index({ role: 1, permission: 1, organizationId: 1 }, { unique: true });

export default rolePermissionSchema;
