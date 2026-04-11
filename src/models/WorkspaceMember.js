import mongoose from 'mongoose';
import workspaceMemberSchema from '../schemas/workspaceMemberSchema.js';

const WorkspaceMember = mongoose.model('WorkspaceMember', workspaceMemberSchema);

export default WorkspaceMember;
