import mongoose from 'mongoose';
import organizationMemberSchema from '../schemas/organizationMemberSchema.js';

const OrganizationMember = mongoose.model('OrganizationMember', organizationMemberSchema);

export default OrganizationMember;
