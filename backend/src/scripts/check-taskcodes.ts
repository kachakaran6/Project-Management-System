import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import Task from '../models/Task.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI;

async function check() {
  try {
    await mongoose.connect(MONGO_URI!);
    const countExplicitNull = await Task.countDocuments({ taskCode: { $type: "null" } });
    const countMissing = await Task.countDocuments({ taskCode: { $exists: false } });
    const allTasks = await Task.countDocuments({});
    
    console.log(`Total tasks: ${allTasks}`);
    console.log(`Tasks with taskCode explicit null: ${countExplicitNull}`);
    console.log(`Tasks with taskCode missing: ${countMissing}`);
    
    // Check for duplicates including nulls if possible
    const duplicates = await Task.aggregate([
      { $group: { _id: "$taskCode", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 }, _id: { $ne: undefined } } }
    ]);
    
    console.log(`Duplicate taskCodes found: ${duplicates.length}`);
    if (duplicates.length > 0) {
      console.log(JSON.stringify(duplicates, null, 2));
    }

  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

check();
