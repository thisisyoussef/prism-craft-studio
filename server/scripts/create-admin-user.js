#!/usr/bin/env node
/*
 Creates or promotes a user to admin in MongoDB (Node API), bypassing HTTP admin checks.
 Usage:
   node scripts/create-admin-user.js <email> <password> <firstName> <lastName>

 Requirements:
   - MONGODB_URI must be set in environment (or in server/.env)
*/

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function main() {
  const [email, password, firstName, lastName] = process.argv.slice(2);

  if (!email || !password || !firstName || !lastName) {
    console.error('Usage: node scripts/create-admin-user.js <email> <password> <firstName> <lastName>');
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('Missing MONGODB_URI in environment. Add it to server/.env or export it in your shell.');
    process.exit(1);
  }

  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected');

    const Users = mongoose.connection.collection('users');

    const existing = await Users.findOne({ email: String(email).toLowerCase() });
    const now = new Date();

    if (existing) {
      console.log('ℹ️ User exists; updating password and promoting to admin...');
      const salt = await bcrypt.genSalt(12);
      const hashed = await bcrypt.hash(password, salt);
      await Users.updateOne(
        { _id: existing._id },
        {
          $set: {
            password: hashed,
            role: 'admin',
            isActive: true,
            updatedAt: now,
          },
        }
      );
      console.log(`👑 Updated password and promoted ${email} to admin.`);
    } else {
      const salt = await bcrypt.genSalt(12);
      const hashed = await bcrypt.hash(password, salt);
      const doc = {
        email: String(email).toLowerCase(),
        password: hashed,
        firstName,
        lastName,
        role: 'admin',
        isActive: true,
        address: { country: 'US' },
        createdAt: now,
        updatedAt: now,
      };
      const result = await Users.insertOne(doc);
      console.log(`✅ Created admin user with _id=${result.insertedId}`);
    }
  } catch (err) {
    console.error('❌ Error creating admin user:', err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected');
  }
}

main();
