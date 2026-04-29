import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load models
import Project from '../models/Project.js';
import Task from '../models/Task.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pms';

async function migrate() {

  try {
    await mongoose.connect(MONGO_URI);

    const projects = await Project.find({ isActive: true });

    for (const project of projects) {

      // Phase 1: Ensure Project Code exists
      if (!project.code) {
        let code = project.name
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .substring(0, 4);
        
        if (code.length < 2) code = 'PRJ';

        // Check if code is unique globally
        let existingWithCode = await Project.findOne({ 
          code,
          _id: { $ne: project._id }
        });

        let counter = 1;
        const baseCode = code;
        while (existingWithCode) {
          code = `${baseCode}${counter}`;
          existingWithCode = await Project.findOne({ 
            code,
            _id: { $ne: project._id }
          });
          counter++;
        }

        project.code = code;
        await project.save();
      }

      // Phase 2: Get all tasks for this project sorted by creation date
      const tasks = await Task.find({ 
        projectId: project._id,
        isActive: true
      }).sort({ createdAt: 1 });


      let sequence = 0;
      const bulkOps = [];

      for (const task of tasks) {
        sequence++;
        
        // Skip if already has taskCode and it matches project code (idempotency)
        if (task.taskCode && task.taskCode.startsWith(project.code) && task.sequence === sequence) {
          continue;
        }

        const taskCode = `${project.code}-${sequence}`;
        const legacyId = task.legacyId || String(task._id).slice(-6).toUpperCase();

        bulkOps.push({
          updateOne: {
            filter: { _id: task._id },
            update: { 
              $set: { 
                taskCode, 
                sequence, 
                legacyId: task.legacyId || `T-${String(task._id).slice(-4).toUpperCase()}`
              } 
            }
          }
        });
      }

      if (bulkOps.length > 0) {
        // Use bulkWrite for efficiency
        await Task.bulkWrite(bulkOps);
        
        // Update project taskSequence
        project.taskSequence = sequence;
        await project.save();
      } else {
      }
    }

  } catch (error) {
  } finally {
    await mongoose.disconnect();
  }
}

migrate();
