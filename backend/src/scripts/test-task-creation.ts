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
  console.log('🧪 Testing Task Creation with Structured IDs...');
  try {
    await mongoose.connect(MONGO_URI!);
    
    // Find a project to test with
    const project = await Project.findOne({ code: 'PMS' });
    if (!project) throw new Error('Project PMS not found');
    
    console.log(`📂 Testing with Project: ${project.name} (${project.code}), Current Sequence: ${project.taskSequence}`);
    
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

    console.log('🏗️ Creating task...');
    const task = await createTask(taskData, userId);
    
    console.log(`✅ Task Created!`);
    console.log(`🆔 ID: ${task.id}`);
    console.log(`🔢 Task Code: ${task.taskCode}`);
    console.log(`📈 Sequence: ${task.sequence}`);
    
    if (task.taskCode === `PMS-${project.taskSequence + 1}`) {
      console.log('🎉 SUCCESS: Task code and sequence are correct!');
    } else {
      console.error(`❌ FAILURE: Expected PMS-${project.taskSequence + 1} but got ${task.taskCode}`);
    }

  } catch (error) {
    console.error('❌ Test Failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

test();
