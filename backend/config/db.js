import mongoose from 'mongoose';

export const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/habitforge';

  try {
    const conn = await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`[MongoDB] Connected to Persistent Database: ${conn.connection.name || 'habitforge'} on host ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.warn(`[MongoDB Connection Warning] Could not connect to primary database (${error.message}). Operating in Standalone Mode.`);
    mongoose.set('bufferCommands', false);
    return false;
  }
};
