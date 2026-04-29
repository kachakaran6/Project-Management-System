import mongoose from 'mongoose';
import githubActivitySchema from '../schemas/githubActivitySchema.js';

const GithubActivity = mongoose.model('GithubActivity', githubActivitySchema);

export default GithubActivity;
