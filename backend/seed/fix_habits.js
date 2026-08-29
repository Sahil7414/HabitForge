import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function fixHabits() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Habit = mongoose.model('Habit', new mongoose.Schema({}, { strict: false }));
  const res = await Habit.updateMany({ isActive: { $ne: false } }, { $set: { isActive: true } });
  console.log('Fixed Habits in Atlas DB:', res);
  process.exit(0);
}

fixHabits();
