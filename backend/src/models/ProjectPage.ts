import mongoose from 'mongoose';
import projectPageSchema from '../schemas/projectPageSchema.js';

const ProjectPage = mongoose.models.ProjectPage || mongoose.model('ProjectPage', projectPageSchema);
export default ProjectPage;
