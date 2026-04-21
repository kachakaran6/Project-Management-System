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
    console.log('Connected to MongoDB');

    // 1. Find all users
    const allUsers = await User.find();
    console.log(`Found ${allUsers.length} users to migrate.`);
    
    // 2. Identify the broken shared "Default Organization"
    const sharedDefaultOrg = await Organization.findOne({ slug: 'default-org' });
    if (sharedDefaultOrg) {
      console.log(`Shared default organization found: ${sharedDefaultOrg._id}. Will re-scope data.`);
    }

    for (const user of allUsers) {
      console.log(`\nProcessing user: ${user.email} (${user.firstName})`);
      
      // A. Check if user already has a private default organization
      let privateOrg = await Organization.findOne({ ownerId: user._id, isDefault: true });
      
      if (!privateOrg) {
        console.log(`Creating private default organization for ${user.firstName}...`);
        const orgName = `${user.firstName}'s Workspace`;
        const slug = `${user.firstName.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).substring(2, 7)}`;
        
        [privateOrg] = await Organization.create([{
          name: orgName,
          slug: slug,
          ownerId: user._id,
          isDefault: true,
          isActive: true
        }]);
        console.log(`Created private org: ${privateOrg._id}`);
      } else {
        console.log(`User already has private org: ${privateOrg._id}`);
      }

      const orgId = privateOrg._id;

      // B. Ensure user is OWNER of this new private org
      const membership = await OrganizationMember.findOne({ userId: user._id, organizationId: orgId });
      if (!membership) {
        await OrganizationMember.create({
          userId: user._id,
          organizationId: orgId,
          role: 'OWNER',
          isActive: true
        });
        console.log(`Assigned OWNER role to user in private org.`);
      }

      // C. Update user's organizationId
      await User.updateOne({ _id: user._id }, { $set: { organizationId: orgId } });

      // D. RE-SCOPE DATA: Move user's personal data to their private org
      // We assume data created by the user without an organizationId or in the 'shared' org belongs to their private space.
      const queryFilter = {
        $or: [
          { organizationId: sharedDefaultOrg?._id },
          { organizationId: null },
          { organizationId: { $exists: false } }
        ],
        // Strategy: If I am the owner/creator of the resource, it belongs to my private workspace in this migration
      };

      const modelsToUpdate = [
        { name: 'Project', model: Project, ownerField: 'ownerId' },
        { name: 'Task', model: Task, ownerField: 'userId' }, // Some tasks use 'userId' or 'creatorId'
        { name: 'Workspace', model: Workspace, ownerField: 'createdBy' },
        { name: 'Comment', model: Comment, ownerField: 'userId' },
        { name: 'ActivityLog', model: ActivityLog, ownerField: 'userId' },
        { name: 'Tag', model: Tag, ownerField: 'createdBy' },
        { name: 'Notification', model: Notification, ownerField: 'recipientId' }
      ];

      for (const { name, model, ownerField } of modelsToUpdate) {
        const updateResult = await (model as any).updateMany(
          { ...queryFilter, [ownerField]: user._id },
          { $set: { organizationId: orgId } }
        );
        if (updateResult.modifiedCount > 0) {
          console.log(`Moved ${updateResult.modifiedCount} ${name} records to private org.`);
        }
      }
    }

    // 3. Cleanup: Remove shared default org memberships and then the org itself
    if (sharedDefaultOrg) {
      console.log('\nCleaning up shared default organization...');
      await OrganizationMember.deleteMany({ organizationId: sharedDefaultOrg._id });
      await Organization.deleteOne({ _id: sharedDefaultOrg._id });
      console.log('Shared default organization removed.');
    }

    console.log('\nMigration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
