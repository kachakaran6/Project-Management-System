import mongoose from 'mongoose';
import rolePermissionSchema from '../schemas/rolePermissionSchema.js';

const RolePermission = mongoose.model('RolePermission', rolePermissionSchema);

export default RolePermission;
