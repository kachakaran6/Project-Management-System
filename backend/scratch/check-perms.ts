import mongoose from 'mongoose';
import OrganizationMember from './src/models/OrganizationMember.js';
import User from './src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkUser() {
  await mongoose.connect(process.env.MONGO_URI!);
  const userId = "69daaad5533ba2bb9269a007";
  const orgId = "69daa1f80a2683c18c0a0865";

  const user = await User.findById(userId);
  console.log("User Platform Role:", user?.role);

  const membership = await OrganizationMember.findOne({ userId, organizationId: orgId });
  console.log("Membership Role:", membership?.role);
  console.log("Membership Active:", membership?.isActive);

  process.exit(0);
}

checkUser();
