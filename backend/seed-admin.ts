import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Organization from './src/models/Organization.js';
import OrganizationMember from './src/models/OrganizationMember.js';
import { hashPassword } from './src/utils/password.js';
import { ROLES } from './src/constants/index.js';

dotenv.config();

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('Connected to MongoDB');

    const adminEmail = 'superadmin@system.com';
    const adminPassword = 'Super@123';
    
    // Check if exists
    const existing = await User.findOne({ email: adminEmail });
    if (existing) {
      console.log('Super Admin already exists:', adminEmail);
      process.exit(0);
    }

    const hashedPassword = await hashPassword(adminPassword);
    
    // Create User
    await User.create({
      firstName: 'System',
      lastName: 'Owner',
      email: adminEmail,
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      isApproved: true,
      isEmailVerified: true
    });

    console.log('Super Admin created successfully!');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    
    process.exit(0);
  } catch (error: unknown) {
    console.error('Error seeding super admin:', error);
    process.exit(1);
  }
};

seedSuperAdmin();
