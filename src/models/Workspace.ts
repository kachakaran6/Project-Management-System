import mongoose from 'mongoose';
import workspaceSchema from '../schemas/workspaceSchema.js';

const Workspace = mongoose.model('Workspace', workspaceSchema);

export default Workspace;
