import mongoose from 'mongoose';
import OrganizationMember from './src/models/OrganizationMember.js';
import User from './src/models/User.js';
import Organization from './src/models/Organization.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkMe() {
  await mongoose.connect(process.env.MONGO_URI!);
  const userId = "69daaad5533ba2bb9269a007"; // The user from logs

  const user = await User.findById(userId);
  if (!user) {
    console.log("User not found");
    process.exit(1);
  }

  const memberships = await OrganizationMember.find({ userId, isActive: true })
    .populate('organizationId', 'name slug')
    .lean();

  console.log("User Email:", user.email);
  console.log("Found Memberships:", memberships.length);
  memberships.forEach((m: any) => {
    console.log(`- Org: ${m.organizationId?.name} (${m.role})`);
  });

  process.exit(0);
}

checkMe();
