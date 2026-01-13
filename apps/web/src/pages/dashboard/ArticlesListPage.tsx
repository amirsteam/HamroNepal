/**
 * Articles List Page
 *
 * List and manage articles with filtering.
 */

import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  getMyArticles,
  deleteArticle,
  updateArticleStatus,
  getImagePreviewUrl,
} from "@/services/admin.service";
import { useAuth } from "@/contexts/AuthContext";
import type { Article } from "@/types";
import { toNepaliDigits, formatBSDate, adToBS } from "@/lib/bs-date";

type StatusFilter = "all" | "published" | "draft" | "archived";

export function ArticlesListPage() {
  const { author } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  const statusFilter = (searchParams.get("status") as StatusFilter) || "all";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 10;

  const loadArticles = useCallback(async () => {
    if (!author) return;

    setLoading(true);
    try {
      const result = await getMyArticles(
        author.userId,
        limit,
        (page - 1) * limit,
        statusFilter === "all" ? undefined : statusFilter
      );
      setArticles(result.articles);
      setTotal(result.total);
    } catch (error) {
      console.error("Failed to load articles:", error);
    } finally {
      setLoading(false);
    }
  }, [author, page, statusFilter]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const handleDelete = async (articleId: string, title: string) => {
    if (!confirm(`"${title}" मेटाउने हो?`)) return;

    setDeleting(articleId);
    try {
      await deleteArticle(articleId);
      setArticles((prev) => prev.filter((a) => a.$id !== articleId));
      setTotal((prev) => prev - 1);
    } catch (error) {
      console.error("Failed to delete article:", error);
      alert("समाचार मेटाउन सकिएन।");
    } finally {
      setDeleting(null);
    }
  };

  const handleStatusChange = async (articleId: string, newStatus: string) => {
    setStatusUpdating(articleId);
    try {
      await updateArticleStatus(
        articleId,
        newStatus as "draft" | "published" | "archived"
      );
      setArticles((prev) =>
        prev.map((a) =>
          a.$id === articleId
            ? { ...a, status: newStatus as Article["status"] }
            : a
        )
      );
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("स्थिति परिवर्तन गर्न सकिएन।");
    } finally {
      setStatusUpdating(null);
    }
  };

  const setFilter = (status: StatusFilter) => {
    setSearchParams({ status, page: "1" });
  };

  const setPage = (newPage: number) => {
    setSearchParams({ status: statusFilter, page: String(newPage) });
  };

  const totalPages = Math.ceil(total / limit);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">समाचारहरू</h1>
          <p className="text-gray-600 mt-1">
            कुल {toNepaliDigits(total)} समाचार
          </p>
        </div>
        <Link
          to="/dashboard/articles/new"
          className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>नयाँ समाचार</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(["all", "published", "draft", "archived"] as StatusFilter[]).map(
          (status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                statusFilter === status
                  ? "bg-primary text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              {status === "all" && "सबै"}
              {status === "published" && "प्रकाशित"}
              {status === "draft" && "ड्राफ्ट"}
              {status === "archived" && "संग्रहित"}
            </button>
          )
        )}
      </div>

      {/* Articles list */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex items-center space-x-4 animate-pulse"
              >
                <div className="w-20 h-14 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <svg
              className="w-16 h-16 mx-auto text-gray-300 mb-4"
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
            <p className="text-lg mb-2">कुनै समाचार फेला परेन</p>
            <Link
              to="/dashboard/articles/new"
              className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              नयाँ समाचार थप्नुहोस्
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                      समाचार
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                      श्रेणी
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                      स्थिति
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                      मिति
                    </th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">
                      कार्य
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {articles.map((article) => (
                    <tr key={article.$id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-4">
                          {article.featuredImage ? (
                            <img
                              src={
                                article.featuredImage.startsWith("http")
                                  ? article.featuredImage
                                  : getImagePreviewUrl(article.featuredImage, 160, 120)
                              }
                              alt={article.title}
                              className="w-16 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-16 h-12 bg-gray-200 rounded flex items-center justify-center">
                              <svg
                                className="w-6 h-6 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                          )}
                          <div className="min-w-0">
                            <Link
                              to={`/dashboard/articles/${article.$id}`}
                              className="font-medium text-gray-800 hover:text-primary line-clamp-2"
                            >
                              {article.title}
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {article.categoryId || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={article.status}
                          onChange={(e) =>
                            handleStatusChange(article.$id, e.target.value)
                          }
                          disabled={statusUpdating === article.$id}
                          className="text-sm border rounded px-2 py-1 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        >
                          <option value="draft">ड्राफ्ट</option>
                          <option value="published">प्रकाशित</option>
                          <option value="archived">संग्रहित</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatBSDate(adToBS(new Date(article.$createdAt)))}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            to={`/news/${article.slug}`}
                            target="_blank"
                            className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                            title="हेर्नुहोस्"
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
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </Link>
                          <Link
                            to={`/dashboard/articles/${article.$id}`}
                            className="p-2 text-gray-400 hover:text-primary rounded-lg hover:bg-primary/10"
                            title="सम्पादन"
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
                          <button
                            onClick={() =>
                              handleDelete(article.$id, article.title)
                            }
                            disabled={deleting === article.$id}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                            title="मेटाउनुहोस्"
                          >
                            {deleting === article.$id ? (
                              <svg
                                className="w-5 h-5 animate-spin"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                            ) : (
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
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y">
              {articles.map((article) => (
                <div key={article.$id} className="p-4">
                  <div className="flex items-start space-x-3">
                    {article.featuredImage ? (
                      <img
                        src={
                          article.featuredImage.startsWith("http")
                            ? article.featuredImage
                            : getImagePreviewUrl(article.featuredImage, 200, 140)
                        }
                        alt={article.title}
                        className="w-20 h-14 object-cover rounded flex-shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-14 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-6 h-6 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/dashboard/articles/${article.$id}`}
                        className="font-medium text-gray-800 hover:text-primary line-clamp-2"
                      >
                        {article.title}
                      </Link>
                      <div className="flex items-center space-x-2 mt-2">
                        {getStatusBadge(article.status)}
                        <span className="text-xs text-gray-500">
                          {formatBSDate(adToBS(new Date(article.$createdAt)))}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end space-x-2 mt-3 pt-3 border-t">
                    <Link
                      to={`/news/${article.slug}`}
                      target="_blank"
                      className="p-2 text-gray-400 hover:text-blue-600"
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
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    </Link>
                    <Link
                      to={`/dashboard/articles/${article.$id}`}
                      className="p-2 text-gray-400 hover:text-primary"
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
                    <button
                      onClick={() => handleDelete(article.$id, article.title)}
                      disabled={deleting === article.$id}
                      className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-50"
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <p className="text-sm text-gray-600">
              पृष्ठ {toNepaliDigits(page)} / {toNepaliDigits(totalPages)}
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                अघिल्लो
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                अर्को
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
