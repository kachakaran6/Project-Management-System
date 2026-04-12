import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema);

const OrgSchema = new mongoose.Schema({}, { strict: false });
const Organization = mongoose.model('Organization', OrgSchema);

const MemberSchema = new mongoose.Schema({}, { strict: false });
const OrgMember = mongoose.model('OrganizationMember', MemberSchema);

async function checkMe() {
  await mongoose.connect(process.env.MONGO_URI!);
  
  const userId = "69daaad5533ba2bb9269a007"; // ID from logs
  const user = await User.findById(userId);
  if (!user) {
    console.log("User not found with ID", userId);
    process.exit(1);
  }

  console.log("User Email:", user.get('email'));
  console.log("User Role:", user.get('role'));
  
  const memberships = await OrgMember.find({ userId });
  console.log("Memberships found:", memberships.length);
  for (const m of memberships) {
    const org = await Organization.findById(m.get('organizationId'));
    console.log(`- Role: ${m.get('role')}, Org: ${org?.get('name')} (Active: ${m.get('isActive')})`);
  }

  process.exit(0);
}

checkMe();
