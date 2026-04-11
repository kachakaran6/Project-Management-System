import mongoose from 'mongoose';
import commentSchema from '../schemas/commentSchema.js';

const Comment = mongoose.model('Comment', commentSchema);

export default Comment;
