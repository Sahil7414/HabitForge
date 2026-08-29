import mongoose from 'mongoose';

export const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/habitforge';

  if (!process.env.MONGODB_URI && process.env.NODE_ENV === 'production') {
    console.error('[MongoDB Fatal Error] MONGODB_URI is not set in environment variables for production.');
  }

  try {
    const conn = await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`[MongoDB] Connected to Persistent Database: ${conn.connection.name || 'habitforge'} on host ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`[MongoDB Connection Error] Could not connect to database (${error.message}).`);
    mongoose.set('bufferCommands', false);
    return false;
  }
};
