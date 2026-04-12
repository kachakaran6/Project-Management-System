import mongoose from 'mongoose';
import { env } from '../src/config/env';
import User from '../src/models/User';
import OrganizationMember from '../src/models/OrganizationMember';
import RolePermission from '../src/models/RolePermission';
import { ROLES, PERMISSIONS } from '../src/constants/index';

async function check() {
  await mongoose.connect(env.mongodbUri);
  console.log('Connected to DB');

  const email = 'kachakaran06@gmail.com';
  const user = await User.findOne({ email });
  
  if (!user) {
    console.log('User not found');
    process.exit(0);
  }

  console.log('User found:', {
    id: user._id,
    role: user.role,
    status: user.status,
    isApproved: user.isApproved
  });

  const memberships = await OrganizationMember.find({ userId: user._id });
  console.log('Memberships:', memberships.map(m => ({
    orgId: m.organizationId,
    role: m.role,
    isActive: m.isActive
  })));

  const permissions = await RolePermission.find({ 
    $or: [{ role: user.role }, { role: 'ADMIN' }, { role: 'SUPER_ADMIN' }]
  });
  console.log('Relevant DB Permissions count:', permissions.length);
  permissions.forEach(p => {
    console.log(` - Role: ${p.role}, Permission: ${p.permission}, Org: ${p.organizationId || 'GLOBAL'}`);
  });

  process.exit(0);
}

check().catch(console.error);
