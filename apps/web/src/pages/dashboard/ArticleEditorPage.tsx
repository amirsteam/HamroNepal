/**
 * Article Editor Page
 *
 * Create and edit articles with image upload, topic + location, and the AI
 * assistant. Publishing rules are enforced by the API.
 */

import { Fragment, Suspense, lazy, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  createArticle,
  updateArticle,
  getArticleById,
  uploadImage,
  getImagePreviewUrl,
  translateArticleNow,
  type UpdateArticleInput,
} from "@/services/admin.service";
import {
  getCategories,
  getLocationCategories,
  buildLocationTree,
  type LocationNode,
} from "@/services/categories.service";
import { canPublish } from "@/services/auth.service";
import { useAuth } from "@/contexts/AuthContext";
import type { Article, ArticleStatus, ArticleTranslation, Category } from "@/types";
import { formatDualDate } from "@/lib/bs-date";
import { AIAssistantModal } from "@/components/dashboard/AIAssistantModal";
import { AIWarnings } from "@/components/dashboard/AIWarnings";
// The editor is large and only editors need it: load it with this page.
const RichTextEditor = lazy(() => import("@/components/dashboard/RichTextEditor").then((m) => ({ default: m.RichTextEditor })));
import type { GeneratedArticle } from "@/services/ai.service";

interface ArticleFormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  categoryId: string;
  locationId: string;
  featuredImage: string;
  tags: string;
  status: ArticleStatus;
  isBreaking: boolean;
  isFeatured: boolean;
}

const initialFormData: ArticleFormData = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  categoryId: "",
  locationId: "",
  featuredImage: "",
  tags: "",
  status: "draft",
  isBreaking: false,
  isFeatured: false,
};

/** The English version as edited in the form. */
interface EnglishForm {
  title: string;
  excerpt: string;
  content: string;
}
const emptyEnglish: EnglishForm = { title: "", excerpt: "", content: "" };

const englishOf = (en?: ArticleTranslation): EnglishForm => ({
  title: en?.title ?? "",
  excerpt: en?.excerpt ?? "",
  content: en?.content ?? "",
});

/** Where the English version came from, for the badge in the English section. */
function EnglishStatus({ meta }: { meta?: ArticleTranslation }) {
  if (!meta?.title) return <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">अनुवाद छैन</span>;
  const when = meta.translatedAt ? ` · ${formatDualDate(meta.translatedAt).relative}` : "";
  return (
    <span className="flex flex-wrap gap-1.5">
      <span className={`text-xs px-2 py-0.5 rounded ${meta.edited ? "bg-green-100 text-green-800" : "bg-purple-100 text-purple-800"}`}>
        {meta.edited ? "सम्पादकले सच्याएको" : `AI अनुवाद${meta.model ? ` (${meta.model})` : ""}`}
        {when}
      </span>
      {meta.outdated && (
        <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">
          नेपाली बदलिएको छ – अंग्रेजी पुरानो हुन सक्छ
        </span>
      )}
    </span>
  );
}

const inputClass =
  "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition";

function Spinner({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}

export function ArticleEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { author } = useAuth();
  const mayPublish = canPublish(author);

  const [formData, setFormData] = useState<ArticleFormData>(initialFormData);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locationTree, setLocationTree] = useState<LocationNode[]>([]);
  const [source, setSource] = useState<Article["source"]>(undefined);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  // English version: the form copy, what the API last said about it, and
  // whether a person changed it here (only then is it sent on save).
  const [english, setEnglish] = useState<EnglishForm>(emptyEnglish);
  const [englishMeta, setEnglishMeta] = useState<ArticleTranslation | undefined>(undefined);
  const [englishDirty, setEnglishDirty] = useState(false);
  const [showEnglish, setShowEnglish] = useState(false);
  const [translating, setTranslating] = useState(false);
  // Remounts the English editor when the AI replaces its text.
  const [englishVersion, setEnglishVersion] = useState(0);

  const isEditing = !!id;

  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoriesData, locations] = await Promise.all([getCategories(), getLocationCategories()]);
        setCategories(categoriesData);
        setLocationTree(buildLocationTree(locations));

        if (id) {
          const article = await getArticleById(id);
          setSource(article.source);
          setEnglish(englishOf(article.en));
          setEnglishMeta(article.en);
          // Most specific location = the one that is not a parent of another selected one.
          const selected = locations.filter((l) => article.locationIds?.includes(l.$id));
          const parents = new Set(selected.map((l) => l.parentId));
          const locationId = selected.find((l) => !parents.has(l.$id))?.$id ?? "";
          setFormData({
            title: article.title,
            slug: article.slug,
            excerpt: article.excerpt || "",
            content: article.content,
            categoryId: article.categoryId || "",
            locationId,
            featuredImage: article.featuredImage || "",
            tags: article.tags?.join(", ") || "",
            status: article.status,
            isBreaking: article.isBreaking || false,
            isFeatured: article.isFeatured || false,
          });
        }
      } catch (err) {
        console.error("Failed to load data:", err);
        setError("डाटा लोड गर्न सकिएन।");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const generateSlug = (title: string): string =>
    title
      .toLowerCase()
      .replace(/[^\w\sऀ-ॿ-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 100);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData((prev) => ({
      ...prev,
      title,
      slug: prev.slug === generateSlug(prev.title) || !prev.slug ? generateSlug(title) : prev.slug,
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("कृपया छवि फाइल मात्र अपलोड गर्नुहोस्।");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("फाइल साइज ५ MB भन्दा कम हुनुपर्छ।");
      return;
    }

    setUploading(true);
    try {
      const imageUrl = await uploadImage(file);
      setFormData((prev) => ({ ...prev, featuredImage: imageUrl }));
    } catch (err) {
      console.error("Failed to upload image:", err);
      alert(err instanceof Error ? err.message : "छवि अपलोड गर्न सकिएन।");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author) return;

    if (!formData.title.trim()) return setError("शीर्षक आवश्यक छ।");
    if (!formData.content.trim()) return setError("सामग्री आवश्यक छ।");
    if (!formData.categoryId) return setError("श्रेणी छान्नुहोस्।");

    setError(null);
    setSaving(true);

    try {
      const data: UpdateArticleInput & { title: string; categoryId: string } = {
        title: formData.title.trim(),
        slug: formData.slug || generateSlug(formData.title),
        excerpt: formData.excerpt.trim() || formData.title.trim(),
        content: formData.content.trim(),
        categoryId: formData.categoryId,
        locationIds: formData.locationId ? [formData.locationId] : [],
        featuredImage: formData.featuredImage || "",
        tags: formData.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        // The server sets publish dates and turns a reporter's "published" into "pending".
        status: formData.status,
        isBreaking: formData.isBreaking,
        isFeatured: formData.isFeatured,
      };
      if (englishDirty) {
        data.en = english.title.trim()
          ? { title: english.title.trim(), excerpt: english.excerpt.trim(), content: english.content.trim() }
          : null;
      }

      if (isEditing) await updateArticle(id!, data);
      else await createArticle(data);

      navigate(source?.type === "ai" ? "/dashboard/review" : "/dashboard/articles");
    } catch (err) {
      console.error("Failed to save article:", err);
      setError(err instanceof Error && err.message ? err.message : "समाचार सेभ गर्न सकिएन। कृपया पुन: प्रयास गर्नुहोस्।");
    } finally {
      setSaving(false);
    }
  };

  const changeEnglish = (patch: Partial<EnglishForm>) => {
    setEnglish((prev) => ({ ...prev, ...patch }));
    setEnglishDirty(true);
  };

  /** AI translation of the saved Nepali; replaces the English in the form. */
  const handleTranslate = async () => {
    if (!id) return;
    if (englishDirty && !confirm("तपाईंले लेखेको अंग्रेजी AI अनुवादले बदलिनेछ। जारी राख्ने हो?")) return;
    setTranslating(true);
    setError(null);
    try {
      const article = await translateArticleNow(id);
      setEnglish(englishOf(article.en));
      setEnglishMeta(article.en);
      setEnglishDirty(false);
      setEnglishVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "अनुवाद गर्न सकिएन।");
    } finally {
      setTranslating(false);
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
        <h1 className="text-2xl font-bold text-gray-800">{isEditing ? "समाचार सम्पादन" : "नयाँ समाचार"}</h1>
        <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-gray-800" aria-label="बन्द गर्नुहोस्">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">{error}</div>}

      {source?.type === "ai" && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-900 space-y-1">
          <p className="font-semibold">✨ AI ले तयार पारेको मस्यौदा – प्रकाशन अघि स्रोतसँग मिलाएर जाँच्नुहोस्।</p>
          {source.url && (
            <p>
              स्रोत:{" "}
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline">
                {source.name || source.url}
              </a>
              {source.title && <span className="text-purple-700"> – “{source.title}”</span>}
            </p>
          )}
          {typeof source.aiConfidence === "number" && (
            <p>
              विश्वास स्तर: {Math.round(source.aiConfidence * 100)}% · मोडेल: {source.aiModel}
            </p>
          )}
        </div>
      )}
      {source?.type === "ai" && <AIWarnings warnings={source.aiWarnings} className="mb-6" />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main content */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              शीर्षक <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleTitleChange}
              required
              className={inputClass}
              placeholder="समाचारको शीर्षक लेख्नुहोस्..."
            />
          </div>

          <button
            type="button"
            onClick={() => setShowAIModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:opacity-90 transition text-sm font-medium"
          >
            <span>✨</span>
            AI सहायता
          </button>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 transition"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span>उन्नत विकल्प</span>
          </button>

          {showAdvanced && (
            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
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
              <p className="text-xs text-gray-500 mt-1">खाली छोड्नुहोस् शीर्षकबाट स्वतः बन्छ।</p>
            </div>
          )}

          <div>
            <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-1">
              सारांश
            </label>
            <textarea
              id="excerpt"
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              rows={2}
              className={`${inputClass} resize-none`}
              placeholder="समाचारको छोटो सारांश..."
            />
          </div>

          <div>
            <p id="content-label" className="block text-sm font-medium text-gray-700 mb-1">
              सामग्री <span className="text-red-500">*</span>
            </p>
            <Suspense fallback={<div className="h-96 rounded-lg border border-gray-300 bg-gray-50 animate-pulse" aria-label="सम्पादक लोड हुँदै" />}>
              <RichTextEditor
                id="content"
                labelledBy="content-label"
                value={formData.content}
                onChange={(html) => setFormData((prev) => ({ ...prev, content: html }))}
                onUploadImage={uploadImage}
                placeholder="समाचारको विस्तृत सामग्री लेख्नुहोस्…"
              />
            </Suspense>
          </div>
        </div>

        {/* English version (the English site at /en) */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowEnglish(!showEnglish)}
              aria-expanded={showEnglish}
              className="flex items-center gap-2 font-semibold text-gray-800"
            >
              <svg className={`w-4 h-4 transition-transform ${showEnglish ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              अंग्रेजी संस्करण (English)
            </button>
            <EnglishStatus meta={englishDirty ? { ...englishMeta, title: english.title, edited: true, outdated: false, translatedAt: undefined } : englishMeta} />
          </div>

          {showEnglish && (
            <>
              <p className="text-sm text-gray-500">
                प्रकाशित समाचार हरेक घण्टा AI ले अंग्रेजीमा अनुवाद गर्छ। यहाँ सच्याउनुभयो भने त्यो सम्पादकको संस्करण मानिन्छ र AI ले फेरि बदल्दैन।
                शीर्षक खाली गरेर सेभ गर्दा अंग्रेजी संस्करण हट्छ।
              </p>
              {mayPublish && isEditing && (
                <button
                  type="button"
                  onClick={handleTranslate}
                  disabled={translating}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:opacity-90 transition text-sm font-medium disabled:opacity-50"
                >
                  {translating ? <Spinner className="w-4 h-4" /> : <span>✨</span>}
                  {translating ? "अनुवाद हुँदैछ..." : "AI ले अहिले अनुवाद गर्नुहोस्"}
                </button>
              )}
              {mayPublish && isEditing && (
                <p className="text-xs text-gray-500 -mt-2">सेभ भइसकेको नेपाली पाठ अनुवाद हुन्छ। नेपाली बदल्नुभएको छ भने पहिले सेभ गर्नुहोस्।</p>
              )}

              <div lang="en" className="space-y-4">
                <div>
                  <label htmlFor="en-title" className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    id="en-title"
                    value={english.title}
                    onChange={(e) => changeEnglish({ title: e.target.value })}
                    maxLength={300}
                    className={inputClass}
                    placeholder="English headline"
                  />
                </div>
                <div>
                  <label htmlFor="en-excerpt" className="block text-sm font-medium text-gray-700 mb-1">
                    Summary
                  </label>
                  <textarea
                    id="en-excerpt"
                    value={english.excerpt}
                    onChange={(e) => changeEnglish({ excerpt: e.target.value })}
                    rows={2}
                    maxLength={1000}
                    className={`${inputClass} resize-none`}
                    placeholder="A short English summary"
                  />
                </div>
                <div>
                  <p id="en-content-label" className="block text-sm font-medium text-gray-700 mb-1">
                    Story
                  </p>
                  <Suspense fallback={<div className="h-64 rounded-lg border border-gray-300 bg-gray-50 animate-pulse" aria-label="सम्पादक लोड हुँदै" />}>
                    <RichTextEditor
                      key={englishVersion}
                      id="en-content"
                      labelledBy="en-content-label"
                      value={english.content}
                      onChange={(html) => {
                        // The editor reports its first render too; only a real change counts as an edit.
                        if (html !== english.content) changeEnglish({ content: html });
                      }}
                      onUploadImage={uploadImage}
                      placeholder="The English story…"
                    />
                  </Suspense>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Classification */}
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-800">वर्गीकरण</h2>

            <div>
              <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">
                श्रेणी <span className="text-red-500">*</span>
              </label>
              <select
                id="categoryId"
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                required
                className={inputClass}
              >
                <option value="">श्रेणी छान्नुहोस्</option>
                {categories.map((category) => (
                  <option key={category.$id} value={category.$id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="locationId" className="block text-sm font-medium text-gray-700 mb-1">
                स्थान (स्थानीय समाचार)
              </label>
              <select
                id="locationId"
                name="locationId"
                value={formData.locationId}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="">राष्ट्रिय / कुनै खास स्थान छैन</option>
                {locationTree.map((province) => (
                  <optgroup key={province.$id} label={province.name}>
                    <option value={province.$id}>{province.name} (पूरै प्रदेश)</option>
                    {province.children.map((district) => (
                      <Fragment key={district.$id}>
                        <option value={district.$id}>{district.name}</option>
                        {district.children.map((m) => (
                          <option key={m.$id} value={m.$id}>
                            {"  ↳ "}
                            {m.name}
                          </option>
                        ))}
                      </Fragment>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">जिल्ला छान्दा समाचार प्रदेशको मेनुमा पनि देखिन्छ।</p>
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                ट्यागहरू
              </label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className={inputClass}
                placeholder="ट्याग १, ट्याग २, ट्याग ३"
              />
              <p className="text-xs text-gray-500 mt-1">कमाले छुट्याएर लेख्नुहोस्</p>
            </div>
          </div>

          {/* Featured Image */}
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-800">मुख्य छवि</h2>

            {formData.featuredImage ? (
              <div className="relative">
                <img
                  src={getImagePreviewUrl(formData.featuredImage, 600, 400)}
                  alt="Featured"
                  className="w-full h-40 object-cover rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%23f3f4f6' width='200' height='150'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af'%3EImage Error%3C/text%3E%3C/svg%3E";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, featuredImage: "" }))}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  aria-label="छवि हटाउनुहोस्"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary transition">
                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="hidden" />
                {uploading ? (
                  <div className="flex flex-col items-center text-gray-500">
                    <Spinner className="w-8 h-8 mb-2" />
                    <span className="text-sm">अपलोड हुँदैछ...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-gray-500">
                    <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-sm">छवि अपलोड गर्नुहोस्</span>
                    <span className="text-xs text-gray-500 mt-1">अधिकतम ५ MB</span>
                  </div>
                )}
              </label>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
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
                value="pending"
                checked={formData.status === "pending"}
                onChange={handleChange}
                className="w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-700">समीक्षाको लागि</span>
            </label>
            {mayPublish && (
              <>
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, isBreaking: e.target.checked }))}
                    className="w-4 h-4 text-red-600 focus:ring-red-500 rounded"
                  />
                  <span className="text-sm text-red-600 font-medium">ब्रेकिङ न्युज</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData((prev) => ({ ...prev, isFeatured: e.target.checked }))}
                    className="w-4 h-4 text-yellow-600 focus:ring-yellow-500 rounded"
                  />
                  <span className="text-sm text-yellow-700 font-medium">मुख्य समाचार</span>
                </label>
              </>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
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
                  <Spinner />
                  <span>सेभ हुँदैछ...</span>
                </>
              ) : (
                <span>{isEditing ? "अपडेट गर्नुहोस्" : "सेभ गर्नुहोस्"}</span>
              )}
            </button>
          </div>
        </div>
      </form>

      <AIAssistantModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        currentTitle={formData.title}
        currentContent={formData.content}
        categories={categories}
        onApplyDraft={(draft: GeneratedArticle) => {
          setFormData((prev) => ({ ...prev, title: draft.title, excerpt: draft.excerpt, content: draft.content }));
          setShowAIModal(false);
        }}
        onApplyExcerpt={(excerpt: string) => {
          setFormData((prev) => ({ ...prev, excerpt }));
          setShowAIModal(false);
        }}
        onApplyTags={(categoryId: string, tags: string) => {
          setFormData((prev) => ({ ...prev, categoryId: categoryId || prev.categoryId, tags }));
          setShowAIModal(false);
        }}
      />
    </div>
  );
}
