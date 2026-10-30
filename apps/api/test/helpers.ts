import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import request from "supertest";
import { connectDB, disconnectDB } from "../src/db";
import { Article, Category, User } from "../src/models";
import { createApp } from "../src/app";

let mongo: MongoMemoryServer | null = null;

export async function startDb() {
  mongo = await MongoMemoryServer.create();
  await connectDB(mongo.getUri());
  await Promise.all([Article.syncIndexes(), Category.syncIndexes(), User.syncIndexes()]);
}

export async function stopDb() {
  await disconnectDB();
  await mongo?.stop();
}

export async function clearDb() {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

export const PASSWORD = "correct-horse-battery";

export async function makeUser(role: "admin" | "editor" | "reporter", email = `${role}@test.np`) {
  return User.create({ email, name: `${role} user`, role, passwordHash: await bcrypt.hash(PASSWORD, 4) });
}

export const app = createApp();

/** A supertest agent that keeps the session cookie. */
export async function loginAs(email: string) {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}
