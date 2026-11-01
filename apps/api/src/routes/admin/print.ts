/**
 * Print edition (editors and admins): the list of generated issues and a
 * preview of the next one. The preview is the same HTML the PDF is printed
 * from; the PDF itself is made by `npm run print:issue` or the weekly job,
 * because the web server has no browser to print with.
 */

import { Router } from "express";
import { z } from "zod";
import { PrintIssue } from "../../models";
import { toApiList } from "../../lib/http";
import { buildIssue } from "../../print/issue";
import { renderIssueHtml } from "../../print/render";

export const adminPrintRouter = Router();

// GET /admin/print/issues
adminPrintRouter.get("/issues", async (_req, res) => {
  res.json(toApiList(await PrintIssue.find().sort({ number: -1 }).limit(52).lean()));
});

// GET /admin/print/preview?date=YYYY-MM-DD – the next issue as HTML.
adminPrintRouter.get("/preview", async (req, res) => {
  const { date } = z
    .object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() })
    .parse(req.query);
  const { plan, meta } = await buildIssue({ date });
  res.set("Content-Type", "text/html; charset=utf-8");
  res.set("Cache-Control", "no-store");
  res.send(await renderIssueHtml(plan, meta));
});
