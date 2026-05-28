import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from './src/models/Project.js';
import Task from './src/models/Task.js';
import Status from './src/models/Status.js';

dotenv.config();

async function backfill() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');

  const projects = await Project.find({ status: { $ne: 'completed' }, isActive: true });
  console.log(`Checking ${projects.length} active projects...`);

  for (const project of projects) {
    const doneStatuses = await Status.find({
      organizationId: project.organizationId,
      name: { $regex: /done|completed|resolved/i }
    }).select('_id');
    const doneStatusIds = doneStatuses.map(s => s._id);

    if (doneStatusIds.length === 0) continue;

    const allActiveTasks = await Task.find({
      projectId: project._id,
      isActive: true,
      isDraft: false
    }).select('status');

    if (allActiveTasks.length === 0) continue;

    const allTasksCount = allActiveTasks.length;
    const completedTasksCount = allActiveTasks.filter(t => 
      doneStatusIds.some(ds => ds.equals(t.status as mongoose.Types.ObjectId))
    ).length;

    if (allTasksCount > 0 && completedTasksCount === allTasksCount) {
      console.log(`Auto-completing project: ${project.name}`);
      project.status = 'completed';
      await project.save();
    }
  }

  console.log('Done');
  process.exit(0);
}

backfill().catch(console.error);
