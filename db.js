const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

let gridFSBucket = null;

/**
 * Connects to MongoDB via Mongoose and initializes a GridFSBucket
 * on top of the same underlying native connection/driver.
 */
async function connectDB() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI is not defined in environment variables');
  }

  mongoose.connection.on('connected', () => {
    console.log('MongoDB connected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });

  await mongoose.connect(mongoUri);

  // Initialize GridFSBucket once the connection is open.
  gridFSBucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'uploads',
  });

  return { connection: mongoose.connection, gridFSBucket };
}

/**
 * Returns the active GridFSBucket instance.
 * Throws if called before connectDB() has completed.
 */
function getBucket() {
  if (!gridFSBucket) {
    throw new Error('GridFS bucket has not been initialized. Call connectDB() first.');
  }
  return gridFSBucket;
}

module.exports = { connectDB, getBucket };
