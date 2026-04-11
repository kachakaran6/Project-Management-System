import mongoose from 'mongoose';
import attachmentSchema from '../schemas/attachmentSchema.js';

const Attachment = mongoose.model('Attachment', attachmentSchema);

export default Attachment;
