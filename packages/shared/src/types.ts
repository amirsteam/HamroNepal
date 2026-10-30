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
  condition: "sunny" | "cloudy" | "rainy" | "snowy" | "foggy";
  description: string;
  icon: string;
  location: string;
  humidity: number;
  feelsLike: number;
}

export interface NewsSource extends BaseDocument {
  name: string;
  url: string;
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
