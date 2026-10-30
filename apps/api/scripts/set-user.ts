/**
 * Create a dashboard user or reset their password/role.
 *
 *   npm run user:set -w apps/api -- --email you@example.com --name "नाम" --role admin
 *   (add --password "..." or a random one is generated and printed once)
 */

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { connectDB, disconnectDB } from "../src/db";
import { User } from "../src/models";

const args = process.argv.slice(2);
const get = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const email = get("email")?.toLowerCase();
const role = get("role");
if (!email) {
  console.error('Usage: npm run user:set -w apps/api -- --email EMAIL [--name NAME] [--role admin|editor|reporter] [--password PASS]');
  process.exit(1);
}
if (role && !["admin", "editor", "reporter"].includes(role)) {
  console.error("--role must be admin, editor or reporter");
  process.exit(1);
}

const generated = !get("password");
const password = get("password") ?? randomBytes(12).toString("base64url");
if (password.length < 10) {
  console.error("Password must be at least 10 characters.");
  process.exit(1);
}

await connectDB();
const existing = await User.findOne({ email });
const passwordHash = await bcrypt.hash(password, 12);

if (existing) {
  existing.passwordHash = passwordHash;
  existing.mustResetPassword = generated;
  existing.isActive = true;
  if (role) existing.role = role as "admin";
  if (get("name")) existing.name = get("name")!;
  await existing.save();
  console.log(`Updated ${email} (${existing.role}).`);
} else {
  await User.create({
    email,
    name: get("name") ?? email.split("@")[0],
    role: role ?? "reporter",
    passwordHash,
    mustResetPassword: generated,
  });
  console.log(`Created ${email} (${role ?? "reporter"}).`);
}
if (generated) console.log(`Temporary password (shown once): ${password}`);
await disconnectDB();
