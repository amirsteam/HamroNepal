/**
 * Categories Management Page
 *
 * Create, edit, and delete categories.
 */

import { useEffect, useState } from "react";
import {
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/services/categoriesAdmin.service";
import type { Category } from "@/types";
import { toNepaliDigits } from "@/lib/bs-date";

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
}

const initialFormData: CategoryFormData = {
  name: "",
  slug: "",
  description: "",
  sortOrder: 0,
};

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await getAdminCategories();
      setCategories(data);
    } catch (error) {
      console.error("Failed to load categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^\w\s\u0900-\u097F-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      slug:
        prev.slug === generateSlug(prev.name) || !prev.slug
          ? generateSlug(name)
          : prev.slug,
    }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "sortOrder" ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.$id);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      sortOrder: category.sortOrder || 0,
    });
    setShowForm(true);
    setError(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(initialFormData);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("श्रेणीको नाम आवश्यक छ।");
      return;
    }

    setError(null);
    setSaving(true);

    try {
      const categoryData = {
        name: formData.name.trim(),
        slug: formData.slug || generateSlug(formData.name),
        description: formData.description.trim() || undefined,
        sortOrder: formData.sortOrder,
        isActive: true,
      };

      if (editingId) {
        await updateCategory(editingId, categoryData);
        setCategories((prev) =>
          prev.map((c) => (c.$id === editingId ? { ...c, ...categoryData } : c))
        );
      } else {
        const newCategory = await createCategory(categoryData);
        setCategories((prev) => [...prev, newCategory]);
      }

      handleCancel();
    } catch (error) {
      console.error("Failed to save category:", error);
      setError("श्रेणी सेभ गर्न सकिएन।");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (categoryId: string, name: string) => {
    if (!confirm(`"${name}" श्रेणी मेटाउने हो?`)) return;

    setDeleting(categoryId);
    try {
      await deleteCategory(categoryId);
      setCategories((prev) => prev.filter((c) => c.$id !== categoryId));
    } catch (error) {
      console.error("Failed to delete category:", error);
      alert("श्रेणी मेटाउन सकिएन।");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-12 bg-gray-200 rounded animate-pulse"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">श्रेणीहरू</h1>
          <p className="text-gray-600 mt-1">
            कुल {toNepaliDigits(categories.length)} श्रेणी
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setFormData(initialFormData);
            }}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
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
            <span>नयाँ श्रेणी</span>
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            {editingId ? "श्रेणी सम्पादन" : "नयाँ श्रेणी"}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  नाम <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleNameChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                  placeholder="श्रेणीको नाम"
                />
              </div>

              {/* Slug */}
              <div>
                <label
                  htmlFor="slug"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  स्लग
                </label>
                <input
                  type="text"
                  id="slug"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                  placeholder="category-slug"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                विवरण
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition resize-none"
                placeholder="श्रेणीको विवरण..."
              />
            </div>

            {/* Order */}
            <div className="max-w-xs">
              <label
                htmlFor="order"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                क्रम
              </label>
              <input
                type="number"
                id="sortOrder"
                name="sortOrder"
                value={formData.sortOrder}
                onChange={handleChange}
                min={0}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              />
              <p className="text-xs text-gray-500 mt-1">
                सानो नम्बर = पहिला देखिन्छ
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3 pt-2">
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
                  <span>{editingId ? "अपडेट गर्नुहोस्" : "थप्नुहोस्"}</span>
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                रद्द गर्नुहोस्
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories list */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {categories.length === 0 ? (
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
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            <p className="text-lg mb-2">कुनै श्रेणी छैन</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              नयाँ श्रेणी थप्नुहोस्
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                    क्रम
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                    नाम
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                    स्लग
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 hidden md:table-cell">
                    विवरण
                  </th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">
                    कार्य
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {categories
                  .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                  .map((category) => (
                    <tr key={category.$id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {toNepaliDigits(category.sortOrder || 0)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-800">
                          {category.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <code className="px-2 py-1 bg-gray-100 rounded text-xs">
                          {category.slug}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
                        <span className="line-clamp-1">
                          {category.description || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(category)}
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
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(category.$id, category.name)
                            }
                            disabled={deleting === category.$id}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                            title="मेटाउनुहोस्"
                          >
                            {deleting === category.$id ? (
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
        )}
      </div>
    </div>
  );
}
