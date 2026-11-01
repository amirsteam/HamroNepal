/**
 * Express app (shared by the local server, Vercel and tests).
 */

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config";
import { loadUser, requireAuth, requireRole } from "./middleware/auth";
import { sameOriginWrites } from "./middleware/origin";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { publicRouter } from "./routes/public";
import { authRouter } from "./routes/auth";
import { adminArticlesRouter } from "./routes/admin/articles";
import { adminCategoriesRouter } from "./routes/admin/categories";
import { adminUploadsRouter } from "./routes/admin/uploads";
import { adminAiRouter } from "./routes/admin/ai";
import { adminIngestRouter, adminSourcesRouter } from "./routes/admin/sources";
import { seoRouter } from "./routes/seo";
import { promotionsRouter } from "./routes/promotions";
import { adminPromotionsRouter } from "./routes/admin/promotions";
import { adminPrintRouter } from "./routes/admin/print";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  // The SPA sets its own CSP-free headers; the API only serves JSON/XML.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "same-site" } }));
  if (config.corsOrigins.length) {
    app.use("/api", cors({ origin: config.corsOrigins, credentials: true }));
  }
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use("/api", sameOriginWrites);
  app.use(loadUser);

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/promotions", promotionsRouter);
  app.use("/api", publicRouter);
  app.use("/api/auth", authRouter);

  const admin = express.Router();
  admin.use(requireAuth);
  admin.use("/articles", adminArticlesRouter);
  admin.use("/categories", requireRole("admin", "editor"), adminCategoriesRouter);
  admin.use("/uploads", adminUploadsRouter);
  admin.use("/ai", adminAiRouter);
  admin.use("/sources", requireRole("admin", "editor"), adminSourcesRouter);
  admin.use("/ingest", requireRole("admin", "editor"), adminIngestRouter);
  admin.use("/promotions", requireRole("admin"), adminPromotionsRouter);
  admin.use("/print", requireRole("admin", "editor"), adminPrintRouter);
  app.use("/api/admin", admin);

  app.use(seoRouter);

  app.use("/api", notFoundHandler);
  app.use(errorHandler);
  return app;
}
