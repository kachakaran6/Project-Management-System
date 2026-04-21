import mongoose from 'mongoose';
import projectMemberSchema from '../schemas/projectMemberSchema.js';

const ProjectMember = mongoose.model('ProjectMember', projectMemberSchema);

export default ProjectMember;
