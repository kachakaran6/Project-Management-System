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
  
  const user = await User.findOne({ email: "kachakaran06@gmail.com" });
  if (!user) {
    console.log("User not found");
    process.exit(1);
  }

  console.log("User ID:", user._id);
  console.log("User Role:", user.get('role'));
  
  const memberships = await OrgMember.find({ userId: user._id });
  console.log("Memberships found:", memberships.length);
  for (const m of memberships) {
    const org = await Organization.findById(m.get('organizationId'));
    console.log(`- Role: ${m.get('role')}, Org: ${org?.get('name')} (Active: ${m.get('isActive')})`);
  }

  const ownedOrgs = await Organization.find({ ownerId: user._id });
  console.log("Owned Organizations:", ownedOrgs.length);
  for (const o of ownedOrgs) {
    console.log(`- Org: ${o.get('name')}`);
  }

  process.exit(0);
}

checkMe();
