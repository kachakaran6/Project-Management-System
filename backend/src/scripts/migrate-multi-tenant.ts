import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Organization from '../models/Organization.js';
import OrganizationMember from '../models/OrganizationMember.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Workspace from '../models/Workspace.js';
import Comment from '../models/Comment.js';
import ActivityLog from '../models/ActivityLog.js';
import Tag from '../models/Tag.js';
import Notification from '../models/Notification.js';

dotenv.config();

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!);

    // 1. Check if a Default Organization exists
    let defaultOrg = await Organization.findOne({ slug: 'default-org' });
    
    if (!defaultOrg) {
      const superAdmin = await User.findOne({ role: 'SUPER_ADMIN' });
      const ownerId = superAdmin ? superAdmin._id : (await User.findOne())?._id;
      
      if (!ownerId) {
        process.exit(1);
      }

      [defaultOrg] = await Organization.create([{
        name: 'Default Organization',
        slug: 'default-org',
        ownerId: ownerId,
        isActive: true
      }]);
    } else {
    }

    const orgId = defaultOrg._id;

    // 2. Link all users to the Default Organization if they have no memberships
    const allUsers = await User.find();
    
    for (const user of allUsers) {
      const membership = await OrganizationMember.findOne({ userId: user._id, organizationId: orgId });
      if (!membership) {
        await OrganizationMember.create({
          userId: user._id,
          organizationId: orgId,
          role: user.role === 'SUPER_ADMIN' ? 'OWNER' : 'MEMBER',
          isActive: true
        });
      }
      
      // Update user.organizationId if not set
      if (!user.organizationId) {
        await User.updateOne({ _id: user._id }, { $set: { organizationId: orgId } });
      }
    }

    // 3. Update all entities with null organizationId
    const modelsToUpdate = [
      { name: 'Workspace', model: Workspace },
      { name: 'Project', model: Project },
      { name: 'Task', model: Task },
      { name: 'Comment', model: Comment },
      { name: 'ActivityLog', model: ActivityLog },
      { name: 'Tag', model: Tag },
      { name: 'Notification', model: Notification }
    ];

    for (const { name, model } of modelsToUpdate) {
      const result = await (model as any).updateMany(
        { $or: [{ organizationId: null }, { organizationId: { $exists: false } }] },
        { $set: { organizationId: orgId } }
      );
    }

    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
};

migrate();
