/**
 * Shared API types for HamroNepal (web, mobile, api).
 *
 * Documents use `$id` / `$createdAt` / `$updatedAt` (the API maps Mongo's
 * `_id` / `createdAt` / `updatedAt` to these names).
 */

export type ArticleStatus = "draft" | "pending" | "published" | "archived";
export type UserRole = "admin" | "editor" | "reporter";
export type CategoryType = "topic" | "location";
export type LocationLevel = "province" | "district" | "municipality";

export interface BaseDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface Category extends BaseDocument {
  name: string;
  /** English name (dashboard); the public API already returns it as `name` on the English site. */
  nameEn?: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  isActive: boolean;
  type: CategoryType;
  /** Parent location (province for a district, district for a municipality). */
  parentId?: string | null;
  level?: LocationLevel;
  /** Place names used to match news to this location (Nepali + English). */
  aliases?: string[];
  /** Shown in the main menu / "स्थानीय" menu. */
  showInMenu?: boolean;
  /** Priority location for AI ingestion and the home page "local" section. */
  ingest?: boolean;
  /** Fallback image for AI articles in this category. */
  defaultImage?: string;
}

export interface ArticleSource {
  type: "manual" | "ai";
  url?: string;
  name?: string;
  title?: string;
  publishedAt?: string;
  aiModel?: string;
  aiConfidence?: number;
  /** Things the editor should check in an AI draft, e.g. "अंग्रेजी शब्द: the". */
  aiWarnings?: string[];
}

/** Who took a photo and where it came from (shown under the image). */
export interface ImageCredit {
  name: string;
  url?: string;
  /** e.g. "Pexels" */
  provider?: string;
  /** The photo's page on the provider's site. */
  pageUrl?: string;
  /** A stock photo standing in for the event ("प्रतीकात्मक तस्बिर"). */
  symbolic?: boolean;
}

export interface Article extends BaseDocument {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage?: string;
  imageCredit?: ImageCredit | null;
  categoryId: string;
  locationIds: string[];
  tags: string[];
  authorId: string;
  authorName: string;
  status: ArticleStatus;
  isFeatured: boolean;
  isBreaking: boolean;
  viewCount: number;
  publishedAt?: string;
  publishedAtBS?: string;
  createdAtBS: string;
  source?: ArticleSource;
  /** English version (dashboard only; the public API returns it in place on the English site). */
  en?: ArticleTranslation;
  /** Language of title/excerpt/content as returned by the public API. */
  lang?: Lang;
}

export type Lang = "ne" | "en";

export interface ArticleTranslation {
  title?: string;
  excerpt?: string;
  content?: string;
  translatedAt?: string;
  /** AI model, or "editor" after a person edited it. */
  model?: string;
  edited?: boolean;
  /** The Nepali has changed since this was made (set by the API). */
  outdated?: boolean;
}

/** A dashboard user (admin, editor or reporter). */
export interface Author extends BaseDocument {
  name: string;
  email: string;
  role: UserRole;
  bio?: string;
  avatar?: string;
  isActive: boolean;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  documents: T[];
  total: number;
}

export interface HomeSection {
  category: Category;
  articles: Article[];
}

export interface HomeData {
  featured: Article[];
  breaking: Article[];
  latest: Article[];
  sections: HomeSection[];
  local: HomeSection[];
}

export interface WeatherData {
  temp: number;
  /** "sunny" means a clear sky (a moon is shown at night, see isDay). */
  condition: "sunny" | "partly-cloudy" | "cloudy" | "rainy" | "stormy" | "snowy" | "foggy";
  /** Daytime at the place (from the provider), for sun vs moon icons. */
  isDay?: boolean;
  /** The condition in Nepali, e.g. "आंशिक बादल". */
  summary?: string;
  /** The provider's own wording (English). */
  description: string;
  icon: string;
  location: string;
  /** Which WEATHER_CITIES entry this is ("" for the configured default place). */
  city?: string;
  humidity: number;
  feelsLike: number;
}

export interface NewsSource extends BaseDocument {
  name: string;
  url: string;
  /** "rss" feed, or a section "page" listing story links (sites with no feed). */
  kind?: "rss" | "page";
  categoryId?: string | null;
  locationId?: string | null;
  isActive: boolean;
  lastFetchedAt?: string;
  lastItemCount?: number;
  lastError?: string | null;
}

export interface IngestRunStats {
  fetched: number;
  duplicates: number;
  skipped: number;
  classified: number;
  drafted: number;
  failed: number;
}

export interface IngestRun extends BaseDocument {
  startedAt: string;
  finishedAt?: string;
  dryRun: boolean;
  trigger: "cron" | "manual" | "cli";
  stats: IngestRunStats;
  errorLog: string[];
}

export interface ApiErrorBody {
  error: string;
  details?: unknown;
}

/** Where an advertisement appears on the website. */
export type WebPromoPlacement = "header" | "home" | "sidebar" | "article" | "popup";
/** Print-edition ad slots: full page, half page, a story box, the front-page strip. */
export type PrintPromoPlacement = "print-full" | "print-half" | "print-box" | "print-strip";
export type PromoPlacement = WebPromoPlacement | PrintPromoPlacement;

/** An advertisement (banner) managed in the dashboard. */
export interface Promotion extends BaseDocument {
  title: string;
  imageUrl: string;
  mobileImageUrl?: string;
  linkUrl?: string;
  placement: PromoPlacement;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
  /** Dashboard only. */
  views?: number;
  clicks?: number;
}

/** A generated print edition (PDF for the press). */
export interface PrintIssue extends BaseDocument {
  number: number;
  volume: number;
  issueDate: string;
  issueDateBS?: string;
  pages?: number;
  pdfUrl?: string;
  sizeBytes?: number;
  articleIds: string[];
  trigger: "cron" | "manual" | "cli";
}
