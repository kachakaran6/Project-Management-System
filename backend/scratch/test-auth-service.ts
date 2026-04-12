import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getUserById } from './src/modules/auth/auth.service.js';

dotenv.config();

async function testService() {
  await mongoose.connect(process.env.MONGO_URI!);
  
  const userId = "69da90c06157f0f4c5a99c2c"; // Karan Kacha ID
  const result = await getUserById(userId);

  console.log("User Email:", result.email);
  console.log("Organizations Count:", result.organizations.length);
  result.organizations.forEach(o => {
    console.log(`- ${o.name} (${o.role})`);
  });

  process.exit(0);
}

testService();
