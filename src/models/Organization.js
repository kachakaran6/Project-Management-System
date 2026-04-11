import mongoose from 'mongoose';
import organizationSchema from '../schemas/organizationSchema.js';

const Organization = mongoose.model('Organization', organizationSchema);

export default Organization;
