import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models";
import { config } from "../config";
import { badRequest, toApi, unauthorized } from "../lib/http";
import { clearSession, issueSession, requireAuth } from "../middleware/auth";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: config.rateLimits.loginPer15Min,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "धेरै पटक प्रयास भयो। १५ मिनेटपछि पुन: प्रयास गर्नुहोस्।" },
});

const loginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

// Compared against when the email is unknown, so a wrong email takes as long
// as a wrong password and the answer time doesn't reveal who has an account.
// Made on first use, not at start-up (serverless cold starts).
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= bcrypt.hash("not-a-real-password", 12));

async function publicUser(id: string) {
  return toApi(await User.findById(id).lean());
}

authRouter.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  const matches = await bcrypt.compare(password, user?.passwordHash ?? (await getDummyHash()));
  const ok = user && user.isActive && !user.isSystem && matches;
  if (!ok) throw unauthorized("इमेल वा पासवर्ड मिलेन।");
  issueSession(res, String(user._id));
  res.json(await publicUser(String(user._id)));
});

authRouter.post("/logout", (_req, res) => {
  clearSession(res);
  res.status(204).end();
});

// Signed out is a normal answer here (200 + null), not an error.
authRouter.get("/me", async (req, res) => {
  res.json(req.user ? await publicUser(req.user.id) : null);
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10, "पासवर्ड कम्तीमा १० अक्षरको हुनुपर्छ।").max(200),
});

authRouter.post("/password", requireAuth, loginLimiter, async (req, res) => {
  const { currentPassword, newPassword } = passwordSchema.parse(req.body);
  const user = await User.findById(req.user!.id).select("+passwordHash");
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw badRequest("हालको पासवर्ड मिलेन।");
  }
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.mustResetPassword = false;
  await user.save();
  res.status(204).end();
});
