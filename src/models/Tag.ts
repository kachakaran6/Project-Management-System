import mongoose from 'mongoose';
import tagSchema from '../schemas/tagSchema.js';

const Tag = mongoose.model('Tag', tagSchema);

export default Tag;
