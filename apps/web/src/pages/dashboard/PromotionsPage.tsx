/**
 * विज्ञापन – banner advertisements on the website (admin only).
 * Each ad has a placement, an optional phone banner, a link and a run period;
 * views and clicks are counted.
 */

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import type { PromoPlacement, Promotion } from "@/types";
import { uploadImage } from "@/services/admin.service";
import {
  PLACEMENTS,
  createPromotion,
  deletePromotion,
  getPromotionsAdmin,
  placementLabel,
  promotionImageUrl,
  updatePromotion,
  type PromotionInput,
} from "@/services/promotions.service";
import { formatDualDate, toNepaliDigits } from "@/lib/bs-date";

const inputClass =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm";

interface FormState {
  title: string;
  placement: PromoPlacement;
  imageUrl: string;
  mobileImageUrl: string;
  linkUrl: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const emptyForm: FormState = {
  title: "",
  placement: "header",
  imageUrl: "",
  mobileImageUrl: "",
  linkUrl: "",
  startDate: "",
  endDate: "",
  isActive: true,
};

/** "YYYY-MM-DD" in Nepal time, for the date inputs. */
const toDateInput = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kathmandu" }) : "";

/** Start of the start day / end of the end day, Nepal time. */
const startOf = (d: string) => (d ? new Date(`${d}T00:00:00+05:45`).toISOString() : null);
const endOf = (d: string) => (d ? new Date(`${d}T23:59:59+05:45`).toISOString() : null);

type Status = { label: string; className: string };
function statusOf(p: Promotion, now = Date.now()): Status {
  if (!p.isActive) return { label: "बन्द", className: "bg-gray-100 text-gray-700" };
  if (p.startsAt && new Date(p.startsAt).getTime() > now) return { label: "सुरु हुन बाँकी", className: "bg-blue-100 text-blue-800" };
  if (p.endsAt && new Date(p.endsAt).getTime() < now) return { label: "समाप्त", className: "bg-red-100 text-red-800" };
  return { label: "चलिरहेको", className: "bg-green-100 text-green-800" };
}

function ImageField({
  id,
  label,
  hint,
  value,
  required,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  required?: boolean;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      onChange(await uploadImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "तस्बिर अपलोड हुन सकेन।");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label htmlFor={id} className="block text-xs text-gray-600 mb-1">
        {label} <span className="text-gray-500">({hint})</span>
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="url"
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… वा अपलोड गर्नुहोस्"
          className={inputClass}
        />
        <label className="shrink-0 px-3 py-2 border border-gray-300 rounded-lg text-sm cursor-pointer hover:bg-gray-50">
          {uploading ? "अपलोड हुँदै…" : "अपलोड"}
          <input type="file" accept="image/*" className="sr-only" onChange={onFile} disabled={uploading} />
        </label>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      {value && (
        <img src={promotionImageUrl(value)} alt="" className="mt-2 max-h-32 w-auto rounded border border-gray-200" />
      )}
    </div>
  );
}

export function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      setPromotions(await getPromotionsAdmin());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "विज्ञापन लोड हुन सकेन।");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const size = PLACEMENTS.find((p) => p.value === form.placement)!;

  function startEdit(p: Promotion) {
    setEditingId(p.$id);
    setMessage(null);
    setForm({
      title: p.title,
      placement: p.placement,
      imageUrl: p.imageUrl,
      mobileImageUrl: p.mobileImageUrl ?? "",
      linkUrl: p.linkUrl ?? "",
      startDate: toDateInput(p.startsAt),
      endDate: toDateInput(p.endsAt),
      isActive: p.isActive,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const data: PromotionInput = {
      title: form.title.trim(),
      placement: form.placement,
      imageUrl: form.imageUrl.trim(),
      mobileImageUrl: form.mobileImageUrl.trim(),
      linkUrl: form.linkUrl.trim(),
      startsAt: startOf(form.startDate),
      endsAt: endOf(form.endDate),
      isActive: form.isActive,
    };
    try {
      if (editingId) {
        const updated = await updatePromotion(editingId, data);
        setPromotions((prev) => prev.map((p) => (p.$id === editingId ? updated : p)));
        setMessage("विज्ञापन अद्यावधिक भयो।");
      } else {
        const created = await createPromotion(data);
        setPromotions((prev) => [created, ...prev]);
        setMessage("विज्ञापन थपियो।");
      }
      cancelEdit();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "विज्ञापन सुरक्षित हुन सकेन।");
    } finally {
      setSaving(false);
    }
  }

  async function onToggle(p: Promotion) {
    try {
      const updated = await updatePromotion(p.$id, { isActive: !p.isActive });
      setPromotions((prev) => prev.map((x) => (x.$id === p.$id ? updated : x)));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "परिवर्तन हुन सकेन।");
    }
  }

  async function onDelete(p: Promotion) {
    if (!confirm(`"${p.title}" विज्ञापन मेटाउने हो?`)) return;
    try {
      await deletePromotion(p.$id);
      setPromotions((prev) => prev.filter((x) => x.$id !== p.$id));
      if (editingId === p.$id) cancelEdit();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "मेटाउन सकिएन।");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">विज्ञापन</h1>
        <p className="text-gray-600 mt-1">
          वेबसाइटमा देखिने ब्यानर विज्ञापन। एउटै स्थानमा धेरै विज्ञापन भए पाठकले हरेक भ्रमणमा फरक विज्ञापन देख्छन्। मिति खाली
          छोडे विज्ञापन बन्द नगरेसम्म चलिरहन्छ।
        </p>
      </div>

      <form onSubmit={onSubmit} className="bg-white rounded-lg shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">{editingId ? "विज्ञापन सम्पादन" : "नयाँ विज्ञापन"}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="promo-title" className="block text-xs text-gray-600 mb-1">
              विज्ञापनदाता / नाम
            </label>
            <input
              id="promo-title"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="promo-placement" className="block text-xs text-gray-600 mb-1">
              स्थान
            </label>
            <select
              id="promo-placement"
              value={form.placement}
              onChange={(e) => setForm({ ...form, placement: e.target.value as PromoPlacement })}
              className={inputClass}
            >
              {PLACEMENTS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <ImageField
            id="promo-image"
            label="ब्यानर तस्बिर"
            hint={`${size.size} px`}
            required
            value={form.imageUrl}
            onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
          />
          <ImageField
            id="promo-mobile-image"
            label="मोबाइलको लागि (ऐच्छिक)"
            hint={size.mobileSize ? `${size.mobileSize} px` : "आवश्यक छैन"}
            value={form.mobileImageUrl}
            onChange={(url) => setForm((f) => ({ ...f, mobileImageUrl: url }))}
          />
          <div className="md:col-span-2">
            <label htmlFor="promo-link" className="block text-xs text-gray-600 mb-1">
              क्लिक गर्दा खुल्ने लिङ्क (ऐच्छिक)
            </label>
            <input
              id="promo-link"
              type="url"
              value={form.linkUrl}
              onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
              placeholder="https://advertiser.com.np"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="promo-start" className="block text-xs text-gray-600 mb-1">
              सुरु मिति (ऐच्छिक)
            </label>
            <input
              id="promo-start"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="promo-end" className="block text-xs text-gray-600 mb-1">
              अन्त्य मिति (ऐच्छिक)
            </label>
            <input
              id="promo-end"
              type="date"
              value={form.endDate}
              min={form.startDate || undefined}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="w-4 h-4"
          />
          सक्रिय
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "सुरक्षित हुँदै…" : editingId ? "परिवर्तन सुरक्षित गर्नुहोस्" : "+ विज्ञापन थप्नुहोस्"}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              रद्द गर्नुहोस्
            </button>
          )}
        </div>
      </form>

      {message && (
        <p role="status" className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
          {message}
        </p>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white rounded-lg shadow-sm animate-pulse" />
          ))}
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <p className="text-red-600">{loadError}</p>
          <button onClick={load} className="mt-2 text-primary hover:underline">
            फेरि प्रयास गर्नुहोस्
          </button>
        </div>
      ) : promotions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-10 text-center text-gray-500">अहिलेसम्म कुनै विज्ञापन छैन।</div>
      ) : (
        <ul className="space-y-3">
          {promotions.map((p) => {
            const status = statusOf(p);
            const views = p.views ?? 0;
            const clicks = p.clicks ?? 0;
            const ctr = views ? ((clicks / views) * 100).toFixed(1) : "0";
            return (
              <li key={p.$id} className="bg-white rounded-lg shadow-sm p-4 flex flex-col sm:flex-row gap-4">
                <img
                  src={promotionImageUrl(p.imageUrl)}
                  alt=""
                  className="w-full sm:w-48 max-h-28 object-contain bg-gray-50 rounded border border-gray-200"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
                    <span className={`px-2 py-0.5 rounded font-medium ${status.className}`}>{status.label}</span>
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{placementLabel(p.placement)}</span>
                  </div>
                  <h2 className="font-semibold text-gray-900">{p.title}</h2>
                  {p.linkUrl && <p className="text-xs text-gray-500 truncate">{p.linkUrl}</p>}
                  <p className="text-xs text-gray-600 mt-1">
                    {p.startsAt ? formatDualDate(p.startsAt).bs : "जहिलेदेखि पनि"} – {p.endsAt ? formatDualDate(p.endsAt).bs : "अनिश्चित"}
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    देखियो {toNepaliDigits(views)} पटक · क्लिक {toNepaliDigits(clicks)} · क्लिक दर {toNepaliDigits(ctr)}%
                  </p>
                </div>
                <div className="flex sm:flex-col gap-2 shrink-0">
                  <button onClick={() => startEdit(p)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                    सम्पादन
                  </button>
                  <button onClick={() => onToggle(p)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                    {p.isActive ? "बन्द गर्नुहोस्" : "सक्रिय गर्नुहोस्"}
                  </button>
                  <button
                    onClick={() => onDelete(p)}
                    className="px-3 py-1.5 border border-red-200 text-red-700 rounded-lg text-sm hover:bg-red-50"
                  >
                    मेटाउनुहोस्
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
