import mongoose from 'mongoose';
import userColumnOrderSchema from '../schemas/userColumnOrderSchema.js';

const UserColumnOrder = mongoose.model('UserColumnOrder', userColumnOrderSchema);

export default UserColumnOrder;
