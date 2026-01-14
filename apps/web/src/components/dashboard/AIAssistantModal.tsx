/**
 * AI Assistant Modal Component
 *
 * Provides AI-powered article generation features in a modal dialog.
 */

import { useState } from "react";
import type { Category } from "@/types";
import {
  generateArticleDraft,
  improveExcerpt,
  suggestTags,
  isAIConfigured,
  type GeneratedArticle,
  type SuggestedTags,
} from "@/services/ai.service";

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyDraft: (draft: GeneratedArticle) => void;
  onApplyExcerpt: (excerpt: string) => void;
  onApplyTags: (categoryId: string, tags: string) => void;
  currentTitle: string;
  currentContent: string;
  categories: Category[];
}

type TabType = "generate" | "excerpt" | "tags";

export function AIAssistantModal({
  isOpen,
  onClose,
  onApplyDraft,
  onApplyExcerpt,
  onApplyTags,
  currentTitle,
  currentContent,
  categories,
}: AIAssistantModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("generate");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Results
  const [generatedDraft, setGeneratedDraft] = useState<GeneratedArticle | null>(null);
  const [generatedExcerpt, setGeneratedExcerpt] = useState<string | null>(null);
  const [suggestedTags, setSuggestedTags] = useState<SuggestedTags | null>(null);

  if (!isOpen) return null;

  const configured = isAIConfigured();

  const handleGenerateDraft = async () => {
    if (!topic.trim()) {
      setError("कृपया विषय लेख्नुहोस्");
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedDraft(null);

    try {
      const draft = await generateArticleDraft(topic);
      setGeneratedDraft(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI त्रुटि भयो");
    } finally {
      setLoading(false);
    }
  };

  const handleImproveExcerpt = async () => {
    if (!currentTitle.trim() || !currentContent.trim()) {
      setError("कृपया पहिले शीर्षक र सामग्री लेख्नुहोस्");
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedExcerpt(null);

    try {
      const excerpt = await improveExcerpt(currentTitle, currentContent);
      setGeneratedExcerpt(excerpt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI त्रुटि भयो");
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestTags = async () => {
    if (!currentContent.trim()) {
      setError("कृपया पहिले सामग्री लेख्नुहोस्");
      return;
    }

    setLoading(true);
    setError(null);
    setSuggestedTags(null);

    try {
      const categoriesForAI = categories.map((c) => ({ id: c.$id, name: c.name }));
      const tags = await suggestTags(currentContent, categoriesForAI);
      setSuggestedTags(tags);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI त्रुटि भयो");
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: "generate", label: "विषयबाट लेख्नुहोस्" },
    { id: "excerpt", label: "सारांश सुधार" },
    { id: "tags", label: "ट्याग सुझाव" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-purple-600 to-blue-600">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">✨</span>
            AI सहायता
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* API Key Warning */}
        {!configured && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
            <p className="text-yellow-800 text-sm">
              ⚠️ Gemini API key कन्फिगर गरिएको छैन। .env.local मा VITE_GEMINI_API_KEY थप्नुहोस्।
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setError(null);
              }}
              className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50"
                  : "text-gray-600 hover:text-purple-600 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Generate Tab */}
          {activeTab === "generate" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  विषय वा शीर्षक
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="जस्तै: नेपालको आर्थिक विकासको अवस्था"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  disabled={loading}
                />
              </div>

              <button
                onClick={handleGenerateDraft}
                disabled={loading || !configured}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    लेख बनाउँदै...
                  </>
                ) : (
                  <>
                    🪄 लेख बनाउनुहोस्
                  </>
                )}
              </button>

              {/* Generated Draft Preview */}
              {generatedDraft && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-700">AI द्वारा उत्पन्न:</h4>
                    <button
                      onClick={() => onApplyDraft(generatedDraft)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                    >
                      ✓ लागू गर्नुहोस्
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <span className="text-xs text-gray-500">शीर्षक:</span>
                      <p className="font-bold text-gray-900">{generatedDraft.title}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">सारांश:</span>
                      <p className="text-gray-700">{generatedDraft.excerpt}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">सामग्री:</span>
                      <div
                        className="text-gray-700 text-sm mt-1 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: generatedDraft.content }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Excerpt Tab */}
          {activeTab === "excerpt" && (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                वर्तमान शीर्षक र सामग्रीबाट आकर्षक सारांश बनाउनुहोस्।
              </p>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">वर्तमान शीर्षक:</p>
                <p className="font-medium">{currentTitle || "(खाली)"}</p>
              </div>

              <button
                onClick={handleImproveExcerpt}
                disabled={loading || !configured || !currentTitle || !currentContent}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    सारांश बनाउँदै...
                  </>
                ) : (
                  <>
                    ✨ सारांश सुधार्नुहोस्
                  </>
                )}
              </button>

              {/* Generated Excerpt */}
              {generatedExcerpt && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-700">सुझाइएको सारांश:</h4>
                    <button
                      onClick={() => onApplyExcerpt(generatedExcerpt)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                    >
                      ✓ लागू गर्नुहोस्
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700">{generatedExcerpt}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tags Tab */}
          {activeTab === "tags" && (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                सामग्रीको आधारमा उपयुक्त श्रेणी र ट्यागहरू सुझाव पाउनुहोस्।
              </p>

              <button
                onClick={handleSuggestTags}
                disabled={loading || !configured || !currentContent}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    विश्लेषण गर्दै...
                  </>
                ) : (
                  <>
                    🏷️ ट्यागहरू सुझाव दिनुहोस्
                  </>
                )}
              </button>

              {/* Suggested Tags */}
              {suggestedTags && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-700">सुझाइएको:</h4>
                    <button
                      onClick={() =>
                        onApplyTags(suggestedTags.categoryId, suggestedTags.tags.join(", "))
                      }
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                    >
                      ✓ लागू गर्नुहोस्
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <span className="text-xs text-gray-500">श्रेणी:</span>
                      <p className="font-medium">
                        {categories.find((c) => c.$id === suggestedTags.categoryId)?.name ||
                          suggestedTags.categoryId}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">ट्यागहरू:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {suggestedTags.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            बन्द गर्नुहोस्
          </button>
        </div>
      </div>
    </div>
  );
}
