/**
 * MongoDB models for HamroNepal.
 */

import mongoose, { Schema, type InferSchemaType, type HydratedDocument } from "mongoose";

const { ObjectId } = Schema.Types;

// ---------------------------------------------------------------- users
const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ["admin", "editor", "reporter"], default: "reporter" },
    bio: String,
    avatar: String,
    isActive: { type: Boolean, default: true },
    /** Non-login accounts such as the AI news desk. */
    isSystem: { type: Boolean, default: false },
    mustResetPassword: { type: Boolean, default: false },
  },
  { timestamps: true }
);
export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;
export const User = mongoose.model("User", userSchema);

// ---------------------------------------------------------------- categories
const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    /** English name for the English site (falls back to `name`). */
    nameEn: { type: String, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    description: String,
    icon: String,
    color: String,
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    type: { type: String, enum: ["topic", "location"], default: "topic" },
    parentId: { type: ObjectId, ref: "Category", default: null },
    level: { type: String, enum: ["province", "district", "municipality", null], default: null },
    aliases: { type: [String], default: [] },
    showInMenu: { type: Boolean, default: true },
    ingest: { type: Boolean, default: false },
    defaultImage: String,
  },
  { timestamps: true }
);
categorySchema.index({ type: 1, isActive: 1, sortOrder: 1 });
categorySchema.index({ parentId: 1 });
export type CategoryDoc = HydratedDocument<InferSchemaType<typeof categorySchema>>;
export const Category = mongoose.model("Category", categorySchema);

// ---------------------------------------------------------------- articles
const sourceSchema = new Schema(
  {
    type: { type: String, enum: ["manual", "ai"], default: "manual" },
    url: String,
    name: String,
    title: String,
    publishedAt: Date,
    aiModel: String,
    aiConfidence: Number,
    /** Things the editor should check in an AI draft (Nepali text). */
    aiWarnings: { type: [String], default: undefined },
  },
  { _id: false }
);

/** The English version of an article (AI-translated, editors may correct it). */
const translationSchema = new Schema(
  {
    title: String,
    excerpt: String,
    content: String,
    /** Hash of the Nepali title + excerpt + content it was made from (detects edits). */
    sourceHash: String,
    translatedAt: Date,
    /** AI model, or "editor" once a person has edited it. */
    model: String,
    /** A person edited the English: never overwritten by the AI. */
    edited: { type: Boolean, default: false },
  },
  { _id: false }
);

const imageCreditSchema = new Schema(
  {
    name: { type: String, required: true },
    url: String,
    provider: String,
    pageUrl: String,
    symbolic: Boolean,
  },
  { _id: false }
);

const articleSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    excerpt: { type: String, default: "" },
    content: { type: String, default: "" },
    featuredImage: String,
    featuredImagePublicId: String,
    imageCredit: { type: imageCreditSchema, default: undefined },
    categoryId: { type: ObjectId, ref: "Category", required: true },
    locationIds: { type: [{ type: ObjectId, ref: "Category" }], default: [] },
    tags: { type: [String], default: [] },
    authorId: { type: ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    status: {
      type: String,
      enum: ["draft", "pending", "published", "archived"],
      default: "draft",
    },
    isFeatured: { type: Boolean, default: false },
    isBreaking: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
    publishedAt: Date,
    publishedAtBS: String,
    createdAtBS: String,
    source: { type: sourceSchema, default: () => ({ type: "manual" }) },
    en: { type: translationSchema, default: undefined },
  },
  { timestamps: true }
);
articleSchema.index({ status: 1, publishedAt: -1 });
articleSchema.index({ status: 1, categoryId: 1, publishedAt: -1 });
articleSchema.index({ status: 1, locationIds: 1, publishedAt: -1 });
articleSchema.index({ status: 1, isFeatured: 1, publishedAt: -1 });
articleSchema.index({ status: 1, isBreaking: 1, publishedAt: -1 });
articleSchema.index({ authorId: 1, createdAt: -1 });
articleSchema.index({ "source.type": 1, status: 1, createdAt: -1 });
articleSchema.index(
  { title: "text", excerpt: "text", tags: "text" },
  { default_language: "none", weights: { title: 5, tags: 3, excerpt: 1 }, name: "article_text" }
);
export type ArticleDoc = HydratedDocument<InferSchemaType<typeof articleSchema>>;
export const Article = mongoose.model("Article", articleSchema);

// ---------------------------------------------------------------- comments
const commentSchema = new Schema(
  {
    articleId: { type: ObjectId, ref: "Article", required: true, index: true },
    userName: { type: String, required: true },
    content: { type: String, required: true },
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true }
);
export const Comment = mongoose.model("Comment", commentSchema);

// ---------------------------------------------------------------- news sources (AI ingestion)
const newsSourceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, unique: true, trim: true },
    /** "rss" feed, or a section "page" listing story links (sites with no feed). */
    kind: { type: String, enum: ["rss", "page"], default: "rss" },
    /** Topic to fall back on when the AI is unsure. */
    categoryId: { type: ObjectId, ref: "Category", default: null },
    /** Location for local outlets (e.g. a Kavre news site). */
    locationId: { type: ObjectId, ref: "Category", default: null },
    isActive: { type: Boolean, default: true },
    lastFetchedAt: Date,
    lastItemCount: Number,
    lastError: { type: String, default: null },
  },
  { timestamps: true }
);
export type NewsSourceDoc = HydratedDocument<InferSchemaType<typeof newsSourceSchema>>;
export const NewsSource = mongoose.model("NewsSource", newsSourceSchema);

// ---------------------------------------------------------------- ingested items (dedupe log)
const THIRTY_DAYS = 60 * 60 * 24 * 30;
const ingestedItemSchema = new Schema({
  urlHash: { type: String, required: true, unique: true },
  url: String,
  title: String,
  sourceName: String,
  status: { type: String, enum: ["drafted", "duplicate", "skipped", "failed"], required: true },
  reason: String,
  articleId: { type: ObjectId, ref: "Article", default: null },
  createdAt: { type: Date, default: Date.now, expires: THIRTY_DAYS },
});
export const IngestedItem = 
  mongoose.model("IngestedItem", ingestedItemSchema);

// ---------------------------------------------------------------- ingest runs
const ingestRunSchema = new Schema(
  {
    startedAt: { type: Date, default: Date.now },
    finishedAt: Date,
    dryRun: { type: Boolean, default: false },
    trigger: { type: String, enum: ["cron", "manual", "cli"], default: "cli" },
    stats: {
      fetched: { type: Number, default: 0 },
      duplicates: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      classified: { type: Number, default: 0 },
      drafted: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    errorLog: { type: [String], default: [] },
  },
  { timestamps: true }
);
ingestRunSchema.index({ startedAt: -1 });
export const IngestRun = mongoose.model("IngestRun", ingestRunSchema);

// ---------------------------------------------------------------- promotions (advertisements)
/** Where an advertisement can appear: on the website, or in the print edition ("print-*"). */
export const PROMO_PLACEMENTS = [
  "header",
  "home",
  "sidebar",
  "article",
  "popup",
  "print-full",
  "print-half",
  "print-box",
  "print-strip",
] as const;

const promotionSchema = new Schema(
  {
    /** Advertiser or campaign name (shown in the dashboard and as alt text). */
    title: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true },
    /** Optional narrower banner for phones. */
    mobileImageUrl: { type: String, default: "" },
    /** Where a click goes (empty = image only). */
    linkUrl: { type: String, default: "" },
    placement: { type: String, enum: PROMO_PLACEMENTS, required: true },
    /** Runs from/until these times; empty = no limit. */
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
  },
  { timestamps: true }
);
promotionSchema.index({ placement: 1, isActive: 1 });
export const Promotion = mongoose.model("Promotion", promotionSchema);

// ---------------------------------------------------------------- print edition
const printIssueSchema = new Schema(
  {
    /** अंक (issue number) and वर्ष (volume) as printed. */
    number: { type: Number, required: true },
    volume: { type: Number, required: true },
    /** The issue date (Nepal time, start of day). */
    issueDate: { type: Date, required: true },
    issueDateBS: String,
    pages: Number,
    pdfUrl: String,
    pdfPublicId: String,
    sizeBytes: Number,
    articleIds: { type: [ObjectId], default: [] },
    trigger: { type: String, enum: ["cron", "manual", "cli"], default: "cli" },
  },
  { timestamps: true }
);
printIssueSchema.index({ number: -1 });
export const PrintIssue = mongoose.model("PrintIssue", printIssueSchema);

// ---------------------------------------------------------------- site settings (one document)
const localizedSchema = new Schema({ ne: String, en: String }, { _id: false });
const siteSettingsSchema = new Schema(
  {
    /** Always "site": there is one settings document. */
    key: { type: String, default: "site", unique: true },
    name: localizedSchema,
    tagline: localizedSchema,
    description: localizedSchema,
    logoUrl: String,
    faviconUrl: String,
    ogImageUrl: String,
    showFlag: Boolean,
    colors: { primary: String, secondary: String, ink: String },
    contact: { address: localizedSchema, phone: String, email: String },
    social: { facebook: String, x: String, instagram: String, youtube: String, tiktok: String },
    englishEdition: Boolean,
    print: { regNo: String, price: String, email: String },
  },
  { timestamps: true }
);
export const SiteSettingsModel = mongoose.model("SiteSettings", siteSettingsSchema);
