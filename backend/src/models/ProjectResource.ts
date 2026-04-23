import mongoose from 'mongoose';
import projectResourceSchema from '../schemas/projectResourceSchema.js';

const ProjectResource = mongoose.model('ProjectResource', projectResourceSchema);

export default ProjectResource;
