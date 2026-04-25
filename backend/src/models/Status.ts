import mongoose from 'mongoose';
import statusSchema from '../schemas/statusSchema.js';

const Status = mongoose.model('Status', statusSchema);

export default Status;
