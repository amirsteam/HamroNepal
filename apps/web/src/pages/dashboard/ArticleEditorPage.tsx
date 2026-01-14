/**
 * Article Editor Page
 *
 * Create and edit articles with image upload.
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  createArticle,
  updateArticle,
  getArticleById,
  uploadImage,
  getImagePreviewUrl,
} from "@/services/admin.service";
import { getCategories } from "@/services/categories.service";
import { useAuth } from "@/contexts/AuthContext";
import type { Category } from "@/types";
import { adToBS, formatBSDate } from "@/lib/bs-date";

interface ArticleFormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  categoryId: string;
  featuredImage: string;
  tags: string;
  status: "draft" | "published";
  isBreaking: boolean;
  isFeatured: boolean;
}

const initialFormData: ArticleFormData = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  categoryId: "",
  featuredImage: "",
  tags: "",
  status: "draft",
  isBreaking: false,
  isFeatured: false,
};

export function ArticleEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { author } = useAuth();

  const [formData, setFormData] = useState<ArticleFormData>(initialFormData);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!id;

  // Load article if editing
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load categories
        const categoriesData = await getCategories();
        setCategories(categoriesData);

        // Load article if editing
        if (id) {
          const article = await getArticleById(id);
          if (article) {
            setFormData({
              title: article.title,
              slug: article.slug,
              excerpt: article.excerpt || "",
              content: article.content,
              categoryId: article.categoryId || "",
              featuredImage: article.featuredImage || "",
              tags: article.tagIds?.join(", ") || "",
              status: article.status === "published" ? "published" : "draft",
              isBreaking: article.isBreaking || false,
              isFeatured: article.isFeatured || false,
            });
          }
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        setError("डाटा लोड गर्न सकिएन।");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  // Auto-generate slug from title
  const generateSlug = (title: string): string => {
    // Simple transliteration for Nepali to English slug
    // Keep alphanumeric, spaces, hyphens, and Devanagari script
    return title
      .toLowerCase()
      .replace(/[^\w\s\u0900-\u097F-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 100);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData((prev) => ({
      ...prev,
      title,
      // Only auto-generate slug if it's empty or hasn't been manually edited
      slug:
        prev.slug === generateSlug(prev.title) || !prev.slug
          ? generateSlug(title)
          : prev.slug,
    }));
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("कृपया छवि फाइल मात्र अपलोड गर्नुहोस्।");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert("फाइल साइज ५ MB भन्दा कम हुनुपर्छ।");
      return;
    }

    setUploading(true);
    try {
      const imageUrl = await uploadImage(file);
      setFormData((prev) => ({ ...prev, featuredImage: imageUrl }));
    } catch (error) {
      console.error("Failed to upload image:", error);
      alert("छवि अपलोड गर्न सकिएन।");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author) return;

    // Validate required fields
    if (!formData.title.trim()) {
      setError("शीर्षक आवश्यक छ।");
      return;
    }
    if (!formData.content.trim()) {
      setError("सामग्री आवश्यक छ।");
      return;
    }
    if (!formData.categoryId) {
      setError("श्रेणी छान्नुहोस्।");
      return;
    }

    setError(null);
    setSaving(true);

    try {
      // Get featured image URL if it's a file ID
      const featuredImageUrl = formData.featuredImage
        ? formData.featuredImage.startsWith("http")
          ? formData.featuredImage
          : getImagePreviewUrl(formData.featuredImage, 1200, 630)
        : undefined;

      const baseData = {
        title: formData.title.trim(),
        slug: formData.slug || generateSlug(formData.title),
        excerpt: formData.excerpt.trim() || formData.title.trim(),
        content: formData.content.trim(),
        categoryId: formData.categoryId,
        featuredImage: featuredImageUrl,
        tagIds: formData.tags
          ? formData.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        status: formData.status as
          | "draft"
          | "pending"
          | "published"
          | "archived",
        isBreaking: formData.isBreaking,
        isFeatured: formData.isFeatured,
        // Set publishedAt when publishing
        ...(formData.status === "published" && {
          publishedAt: new Date().toISOString(),
          publishedAtBS: formatBSDate(adToBS(new Date())),
        }),
      };

      if (isEditing) {
        await updateArticle(id!, baseData);
      } else {
        // Create new article with required fields
        const createdAtBS = formatBSDate(adToBS(new Date()));
        await createArticle({
          ...baseData,
          authorId: author.userId,
          authorName: author.displayName || author.userId,
          createdAtBS,
        });
      }

      navigate("/dashboard/articles");
    } catch (error) {
      console.error("Failed to save article:", error);
      setError("समाचार सेभ गर्न सकिएन। कृपया पुन: प्रयास गर्नुहोस्।");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-40 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {isEditing ? "समाचार सम्पादन" : "नयाँ समाचार"}
        </h1>
        <button
          onClick={() => navigate("/dashboard/articles")}
          className="text-gray-600 hover:text-gray-800"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main content */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              शीर्षक <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleTitleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              placeholder="समाचारको शीर्षक लेख्नुहोस्..."
            />
          </div>

          {/* Slug */}
          <div>
            <label
              htmlFor="slug"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              स्लग (URL)
            </label>
            <div className="flex items-center">
              <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-500 text-sm">
                /news/
              </span>
              <input
                type="text"
                id="slug"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="auto-generated-slug"
              />
            </div>
          </div>

          {/* Excerpt */}
          <div>
            <label
              htmlFor="excerpt"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              सारांश
            </label>
            <textarea
              id="excerpt"
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition resize-none"
              placeholder="समाचारको छोटो सारांश..."
            />
          </div>

          {/* Content */}
          <div>
            <label
              htmlFor="content"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              सामग्री <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              required
              rows={15}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition resize-y font-mono text-sm"
              placeholder="समाचारको विस्तृत सामग्री लेख्नुहोस्..."
            />
            <p className="text-xs text-gray-500 mt-1">
              HTML ट्याग प्रयोग गर्न सकिन्छ।
            </p>
          </div>
        </div>

        {/* Sidebar options */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category & Tags */}
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-gray-800">वर्गीकरण</h3>

            {/* Category */}
            <div>
              <label
                htmlFor="categoryId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                श्रेणी <span className="text-red-500">*</span>
              </label>
              <select
                id="categoryId"
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              >
                <option value="">श्रेणी छान्नुहोस्</option>
                {categories.map((category) => (
                  <option key={category.$id} value={category.$id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label
                htmlFor="tags"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                ट्यागहरू
              </label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="ट्याग १, ट्याग २, ट्याग ३"
              />
              <p className="text-xs text-gray-500 mt-1">
                कमाले छुट्याएर लेख्नुहोस्
              </p>
            </div>
          </div>

          {/* Featured Image */}
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-gray-800">मुख्य छवि</h3>

            {formData.featuredImage ? (
              <div className="relative">
                <img
                  src={
                    formData.featuredImage.startsWith("http")
                      ? formData.featuredImage
                      : getImagePreviewUrl(formData.featuredImage, 600, 400)
                  }
                  alt="Featured"
                  className="w-full h-40 object-cover rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%23f3f4f6' width='200' height='150'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af'%3EImage Error%3C/text%3E%3C/svg%3E";
                  }}
                />
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, featuredImage: "" }))
                  }
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary transition">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
                {uploading ? (
                  <div className="flex flex-col items-center text-gray-500">
                    <svg
                      className="w-8 h-8 animate-spin mb-2"
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
                    <span className="text-sm">अपलोड हुँदैछ...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-gray-500">
                    <svg
                      className="w-10 h-10 mb-2"
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
                    <span className="text-sm">छवि अपलोड गर्नुहोस्</span>
                    <span className="text-xs text-gray-400 mt-1">
                      अधिकतम ५ MB
                    </span>
                  </div>
                )}
              </label>
            )}


          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="draft"
                checked={formData.status === "draft"}
                onChange={handleChange}
                className="w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-700">ड्राफ्ट</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="published"
                checked={formData.status === "published"}
                onChange={handleChange}
                className="w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-700">प्रकाशित गर्नुहोस्</span>
            </label>
            <span className="text-gray-300">|</span>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isBreaking}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, isBreaking: e.target.checked }))
                }
                className="w-4 h-4 text-red-600 focus:ring-red-500 rounded"
              />
              <span className="text-sm text-red-600 font-medium">ब्रेकिङ न्युज</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, isFeatured: e.target.checked }))
                }
                className="w-4 h-4 text-yellow-600 focus:ring-yellow-500 rounded"
              />
              <span className="text-sm text-yellow-600 font-medium">मुख्य समाचार</span>
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard/articles")}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              रद्द गर्नुहोस्
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {saving ? (
                <>
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
                  <span>सेभ हुँदैछ...</span>
                </>
              ) : (
                <span>{isEditing ? "अपडेट गर्नुहोस्" : "सेभ गर्नुहोस्"}</span>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
