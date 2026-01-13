/**
 * Dashboard Home Page
 *
 * Overview with stats and recent articles.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboardStats, getMyArticles, getImagePreviewUrl } from "@/services/admin.service";
import { useAuth } from "@/contexts/AuthContext";
import type { Article } from "@/types";
import { toNepaliDigits, formatBSDate, adToBS } from "@/lib/bs-date";

interface DashboardStats {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  totalViews: number;
}

export function DashboardHomePage() {
  const { author } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!author) return;

      try {
        const [statsData, articlesData] = await Promise.all([
          getDashboardStats(author.userId),
          getMyArticles(author.userId, 5),
        ]);

        setStats(statsData);
        setRecentArticles(articlesData.articles);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [author]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return (
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
            प्रकाशित
          </span>
        );
      case "draft":
        return (
          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded">
            ड्राफ्ट
          </span>
        );
      case "archived":
        return (
          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
            संग्रहित
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow-sm p-6 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          स्वागत छ, {author?.displayName}!
        </h1>
        <p className="text-gray-600 mt-1">
          आज {formatBSDate(adToBS(new Date()))} हो।
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">कुल समाचार</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">
                {toNepaliDigits(stats?.totalArticles || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">प्रकाशित</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {toNepaliDigits(stats?.publishedArticles || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">ड्राफ्ट</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">
                {toNepaliDigits(stats?.draftArticles || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">कुल भ्युज</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">
                {toNepaliDigits(stats?.totalViews || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Recent articles */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            भर्खरका समाचारहरू
          </h2>
          <Link
            to="/dashboard/articles"
            className="text-sm text-primary hover:underline"
          >
            सबै हेर्नुहोस्
          </Link>
        </div>

        {recentArticles.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <svg
              className="w-12 h-12 mx-auto text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
              />
            </svg>
            <p>कुनै समाचार छैन।</p>
            <Link
              to="/dashboard/articles/new"
              className="inline-block mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              नयाँ समाचार थप्नुहोस्
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {recentArticles.map((article) => (
              <div
                key={article.$id}
                className="px-6 py-4 flex items-center justify-between"
              >
                <div className="flex items-center space-x-4 min-w-0">
                  {article.featuredImage && (
                    <img
                      src={
                        article.featuredImage.startsWith("http")
                          ? article.featuredImage
                          : getImagePreviewUrl(article.featuredImage, 160, 120)
                      }
                      alt={article.title}
                      className="w-16 h-12 object-cover rounded hidden sm:block"
                    />
                  )}
                  <div className="min-w-0">
                    <Link
                      to={`/dashboard/articles/${article.$id}`}
                      className="font-medium text-gray-800 hover:text-primary truncate block"
                    >
                      {article.title}
                    </Link>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatBSDate(adToBS(new Date(article.$createdAt)))}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {getStatusBadge(article.status)}
                  <Link
                    to={`/dashboard/articles/${article.$id}`}
                    className="text-gray-400 hover:text-primary"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/dashboard/articles/new"
          className="bg-white rounded-lg shadow-sm p-6 flex items-center space-x-4 hover:shadow-md transition group"
        >
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition">
            <svg
              className="w-6 h-6 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">
              नयाँ समाचार लेख्नुहोस्
            </h3>
            <p className="text-sm text-gray-500">
              समाचार थप्न यहाँ क्लिक गर्नुहोस्
            </p>
          </div>
        </Link>

        <Link
          to="/dashboard/articles"
          className="bg-white rounded-lg shadow-sm p-6 flex items-center space-x-4 hover:shadow-md transition group"
        >
          <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center group-hover:bg-secondary/20 transition">
            <svg
              className="w-6 h-6 text-secondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">
              समाचारहरू व्यवस्थापन
            </h3>
            <p className="text-sm text-gray-500">
              सम्पादन, प्रकाशन वा मेटाउनुहोस्
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
