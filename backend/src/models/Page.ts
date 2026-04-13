import mongoose from 'mongoose';
import pageSchema from '../schemas/pageSchema.js';

const Page = mongoose.model('Page', pageSchema);

export default Page;
