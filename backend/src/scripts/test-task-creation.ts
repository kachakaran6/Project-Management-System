import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import Project from '../models/Project.js';
import Task from '../models/Task.js';
import { createTask } from '../modules/task/task.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI;

async function test() {
  try {
    await mongoose.connect(MONGO_URI!);
    
    // Find a project to test with
    const project = await Project.findOne({ code: 'PMS' });
    if (!project) throw new Error('Project PMS not found');
    
    
    const taskData = {
      title: 'Test Task ' + Date.now(),
      description: 'Verifying structured ID generation',
      projectId: project._id,
      organizationId: project.organizationId,
      workspaceId: project.workspaceId,
      status: 'TODO' // Use a string that getTasks handles or find a real status ID
    };
    
    // Mock user ID
    const userId = (project as any).ownerId;

    const task = await createTask(taskData, userId);
    
    
    if (task.taskCode === `PMS-${project.taskSequence + 1}`) {
    } else {
    }

  } catch (error) {
  } finally {
    await mongoose.disconnect();
  }
}

test();
