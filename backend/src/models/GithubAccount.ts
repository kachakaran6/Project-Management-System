import mongoose from 'mongoose';
import githubAccountSchema from '../schemas/githubAccountSchema.js';

const GithubAccount = mongoose.model('GithubAccount', githubAccountSchema);

export default GithubAccount;
