import mongoose from "mongoose";

const globalForMongoose = globalThis;
const cached = globalForMongoose.mongooseConnection || { promise: null };
globalForMongoose.mongooseConnection = cached;

export default async function dbConnect() {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not configured.");
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI).catch((error) => {
      cached.promise = null;
      throw error;
    });
  }
  return cached.promise;
}
