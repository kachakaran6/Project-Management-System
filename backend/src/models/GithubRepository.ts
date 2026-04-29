import mongoose from 'mongoose';
import githubRepositorySchema from '../schemas/githubRepositorySchema.js';

const GithubRepository = mongoose.model('GithubRepository', githubRepositorySchema);

export default GithubRepository;
