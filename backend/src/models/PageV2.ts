import mongoose from 'mongoose';
import { pageSchemaV2 } from '../schemas/pageSchemaV2.js';

const PageV2 = (mongoose.models && (mongoose.models as any).PageV2) || mongoose.model('PageV2', pageSchemaV2);

export default PageV2;
