import mongoose from "mongoose";
import { config } from "./config";

let connecting: Promise<typeof mongoose> | null = null;

/**
 * Connect once and reuse the connection (important on serverless, where the
 * module stays warm between requests).
 */
export function connectDB(uri = config.mongoUri): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose);
  if (!connecting) {
    mongoose.set("strictQuery", true);
    connecting = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 10_000, maxPoolSize: 10 })
      .catch((err) => {
        connecting = null;
        throw err;
      });
  }
  return connecting;
}

export async function disconnectDB(): Promise<void> {
  connecting = null;
  await mongoose.disconnect();
}
