import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Task from '../models/Task.js';
import Status from '../models/Status.js';

dotenv.config();

const migrate = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/pms';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const statuses = await Status.find();
    console.log(`Found ${statuses.length} dynamic statuses.`);

    const statusMap: Record<string, mongoose.Types.ObjectId> = {};
    statuses.forEach(s => {
      const key = s.name.toLowerCase().replace(/[\s_-]/g, "");
      statusMap[key] = s._id as mongoose.Types.ObjectId;
    });

    // Find a default status (prefer Backlog or first one)
    const defaultStatus = statuses.find(s => s.name.toLowerCase().includes('backlog')) || statuses[0];
    if (!defaultStatus) {
      console.error('No statuses found in database. Please seed statuses first.');
      process.exit(1);
    }

    const allTasks = await Task.find();
    console.log(`Analyzing ${allTasks.length} tasks...`);

    let updatedCount = 0;
    let fallbackCount = 0;

    for (const task of allTasks) {
      const currentStatus = task.status;
      
      // If it's already an ObjectId, skip
      if (currentStatus instanceof mongoose.Types.ObjectId || (typeof currentStatus === 'string' && mongoose.Types.ObjectId.isValid(currentStatus))) {
        continue;
      }

      // It's likely a legacy string or name
      const statusStr = String(currentStatus || "").toLowerCase().replace(/[\s_-]/g, "");
      const matchedId = statusMap[statusStr];

      if (matchedId) {
        task.status = matchedId;
        await task.save();
        updatedCount++;
      } else {
        // Fallback to default status
        console.log(`Task "${task.title}" has unknown status "${currentStatus}". Falling back to "${defaultStatus.name}".`);
        task.status = defaultStatus._id;
        await task.save();
        fallbackCount++;
      }
    }

    console.log('Migration completed successfully!');
    console.log(`- Tasks updated with matched status: ${updatedCount}`);
    console.log(`- Tasks updated with fallback status: ${fallbackCount}`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
