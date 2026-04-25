import mongoose from 'mongoose';

const statusSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  color: { 
    type: String, 
    default: '#3b82f6' 
  },
  order: { 
    type: Number, 
    default: 0 
  },
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true,
    index: true 
  },
  isDefault: { 
    type: Boolean, 
    default: false 
  },
  isSystem: { 
    type: Boolean, 
    default: false 
  },
  isHiddenIfEmpty: { 
    type: Boolean, 
    default: true 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index for unique status names per organization
statusSchema.index({ organizationId: 1, name: 1 }, { unique: true });

statusSchema.virtual('id').get(function() {
  return this._id;
});

export default statusSchema;
