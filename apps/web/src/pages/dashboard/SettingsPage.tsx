/**
 * साइट सेटिङ (admin only): the outlet's name, logo, colours, contact details,
 * social links, English edition and print masthead. Saved settings apply to
 * the website, link previews, RSS, the AI desk byline and the print edition.
 */

import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { DEFAULT_SITE_SETTINGS, contrastRatio, type Localized, type SiteSettings } from "@hamronepal/shared";
import { getSettingsAdmin, saveSiteSettings } from "@/services/settings.service";
import { uploadImage } from "@/services/admin.service";
import { useUpdateSettings } from "@/lib/settings";
import { NepalFlag } from "@/components/ui/NepalFlag";

const inputClass =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm";

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="bg-white rounded-lg shadow-sm p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-gray-800">{title}</h2>
        {hint && <p className="text-sm text-gray-500 mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ id, label, children, hint }: { id: string; label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-gray-600 mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

/** One text field in Nepali and English, side by side. */
function LocalizedFields({
  id,
  label,
  value,
  onChange,
  multiline,
  max,
}: {
  id: string;
  label: string;
  value: Localized;
  onChange: (v: Localized) => void;
  multiline?: boolean;
  max: number;
}) {
  const Input = multiline ? "textarea" : "input";
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {(["ne", "en"] as const).map((lang) => (
        <Field key={lang} id={`${id}-${lang}`} label={`${label} (${lang === "ne" ? "नेपाली" : "English"})`}>
          <Input
            id={`${id}-${lang}`}
            lang={lang}
            value={value[lang]}
            maxLength={max}
            rows={multiline ? 2 : undefined}
            onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...value, [lang]: e.target.value })}
            className={`${inputClass} ${multiline ? "resize-y" : ""}`}
          />
        </Field>
      ))}
    </div>
  );
}

function ImageSetting({ id, label, hint, value, onChange }: { id: string; label: string; hint: string; value: string; onChange: (url: string) => void }) {
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
    <Field id={id} label={label} hint={hint}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-16 min-w-16 px-2 flex items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50">
          {value ? <img src={value} alt="" className="max-h-14 max-w-48 object-contain" /> : <span className="text-xs text-gray-400">छैन</span>}
        </div>
        <label className="px-3 py-2 border border-gray-300 rounded-lg text-sm cursor-pointer hover:bg-gray-50">
          {uploading ? "अपलोड हुँदै…" : "अपलोड गर्नुहोस्"}
          <input id={id} type="file" accept="image/*" className="sr-only" onChange={onFile} disabled={uploading} />
        </label>
        {value && (
          <button type="button" onClick={() => onChange("")} className="px-3 py-2 text-sm text-red-700 hover:underline">
            हटाउनुहोस्
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </Field>
  );
}

const COLOR_FIELDS: Array<{ key: keyof SiteSettings["colors"]; label: string; hint: string }> = [
  { key: "primary", label: "मुख्य रङ", hint: "ब्रेकिङ, लिङ्क, बटन, सक्रिय मेनु" },
  { key: "secondary", label: "दोस्रो रङ", hint: "मेनु पट्टी र फुटर" },
  { key: "ink", label: "शीर्षकको रङ", hint: "समाचार शीर्षक" },
];

/** Text on these colours must stay readable (WCAG AA: 4.5:1). */
function readability(c: SiteSettings["colors"]): string[] {
  const warn: string[] = [];
  if (contrastRatio(c.primary, "#ffffff") < 4.5) warn.push("मुख्य रङमाथिको सेतो अक्षर (बटन, ब्रेकिङ) पढ्न गाह्रो हुन्छ। अलि गाढा रङ छान्नुहोस्।");
  if (contrastRatio(c.secondary, "#ffffff") < 4.5) warn.push("मेनु पट्टीको सेतो अक्षर पढ्न गाह्रो हुन्छ। दोस्रो रङ अलि गाढा छान्नुहोस्।");
  if (contrastRatio(c.ink, "#ffffff") < 7) warn.push("शीर्षकको रङ सेतो पृष्ठमा कमजोर देखिन्छ। गाढा रङ राम्रो हुन्छ।");
  return warn;
}

function Preview({ s }: { s: SiteSettings }) {
  const [first, ...rest] = s.name.ne.split(" ");
  return (
    <div className="rounded-lg overflow-hidden border border-gray-200" aria-label="पूर्वावलोकन">
      <div className="bg-white px-4 py-3 flex items-center justify-center gap-2">
        {s.logoUrl ? (
          <img src={s.logoUrl} alt="" className="h-10 w-auto object-contain" />
        ) : (
          <span className="flex items-center gap-1.5 font-display text-2xl font-extrabold">
            {s.showFlag && <NepalFlag className="h-7 w-auto" />}
            <span style={{ color: s.colors.primary }}>{first}</span>
            <span style={{ color: s.colors.secondary }}>{rest.join(" ")}</span>
          </span>
        )}
      </div>
      <div className="flex gap-4 px-4 py-2 text-sm font-medium text-white" style={{ background: s.colors.secondary }}>
        <span className="border-b-2 pb-0.5" style={{ borderColor: s.colors.primary }}>
          गृहपृष्ठ
        </span>
        <span>राजनीति</span>
        <span>अर्थतन्त्र</span>
      </div>
      <div className="bg-white px-4 py-4 space-y-2">
        <span className="inline-block text-xs font-bold text-white px-2 py-0.5 rounded" style={{ background: s.colors.primary }}>
          ब्रेकिङ
        </span>
        <p className="font-display text-xl font-bold" style={{ color: s.colors.ink }}>
          यो समाचार शीर्षक यस्तो देखिन्छ
        </p>
        <span className="text-sm font-semibold underline" style={{ color: s.colors.primary }}>
          थप हेर्नुहोस्
        </span>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const update = useUpdateSettings();
  const [form, setForm] = useState<SiteSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    setLoadError(null);
    try {
      setForm(await getSettingsAdmin());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "सेटिङ लोड हुन सकेन।");
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loadError) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <p className="text-red-600">{loadError}</p>
        <button onClick={load} className="mt-2 text-primary hover:underline">
          फेरि प्रयास गर्नुहोस्
        </button>
      </div>
    );
  }
  if (!form) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 bg-white rounded-lg shadow-sm animate-pulse" />
        ))}
      </div>
    );
  }

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => setForm({ ...form, [key]: value });
  const warnings = readability(form.colors);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setMessage(null);
    try {
      const saved = await saveSiteSettings(form);
      setForm(saved);
      update(saved); // the whole site (and this dashboard) changes at once
      setMessage({ ok: true, text: "सेटिङ सुरक्षित भयो। वेबसाइटमा तुरुन्त लागू भयो।" });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "सेटिङ सुरक्षित हुन सकेन।" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">साइट सेटिङ</h1>
        <p className="text-gray-600 mt-1">
          समाचार पोर्टलको नाम, लोगो, रङ र सम्पर्क विवरण। यहाँ बदलेको कुरा वेबसाइट, सामाजिक सञ्जालमा देखिने लिङ्क, RSS, AI
          डेस्कको नाम र प्रिन्ट संस्करणमा लागू हुन्छ।
        </p>
      </div>

      <Section title="पहिचान" hint="नाम दुई शब्दको भए पहिलो शब्द मुख्य रङमा र बाँकी दोस्रो रङमा देखिन्छ।">
        <LocalizedFields id="name" label="साइटको नाम" value={form.name} max={80} onChange={(v) => set("name", v)} />
        <LocalizedFields id="tagline" label="नारा (ट्यागलाइन)" value={form.tagline} max={160} onChange={(v) => set("tagline", v)} />
        <LocalizedFields
          id="description"
          label="छोटो परिचय (गुगल र लिङ्क पूर्वावलोकनमा)"
          value={form.description}
          max={300}
          multiline
          onChange={(v) => set("description", v)}
        />
      </Section>

      <Section title="लोगो र तस्बिर" hint="लोगो राखेमा नाम र झन्डाको सट्टा लोगो देखिन्छ। पारदर्शी PNG वा SVG राम्रो हुन्छ।">
        <ImageSetting id="logo" label="लोगो" hint="उचाइ कम्तीमा १६० px" value={form.logoUrl} onChange={(v) => set("logoUrl", v)} />
        <ImageSetting id="favicon" label="ब्राउजर ट्याबको आइकन" hint="वर्गाकार, ५१२ × ५१२ px" value={form.faviconUrl} onChange={(v) => set("faviconUrl", v)} />
        <ImageSetting
          id="og-image"
          label="सामाजिक सञ्जालमा लिङ्कको तस्बिर"
          hint="१२०० × ६३० px (गृहपृष्ठ र तस्बिर नभएका पृष्ठमा)"
          value={form.ogImageUrl}
          onChange={(v) => set("ogImageUrl", v)}
        />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.showFlag} onChange={(e) => set("showFlag", e.target.checked)} className="w-4 h-4" />
          नामसँगै नेपालको झन्डा देखाउनुहोस् (लोगो नभएमा)
        </label>
      </Section>

      <Section title="रङ" hint="वेबसाइट, ड्यासबोर्ड र प्रिन्ट संस्करणमा प्रयोग हुन्छ।">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {COLOR_FIELDS.map(({ key, label, hint }) => (
              <Field key={key} id={`color-${key}`} label={label} hint={hint}>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label={`${label} छान्नुहोस्`}
                    value={form.colors[key]}
                    onChange={(e) => set("colors", { ...form.colors, [key]: e.target.value })}
                    className="h-10 w-14 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    id={`color-${key}`}
                    value={form.colors[key]}
                    onChange={(e) => set("colors", { ...form.colors, [key]: e.target.value })}
                    pattern="#[0-9a-fA-F]{6}"
                    className={`${inputClass} font-mono max-w-32`}
                  />
                </div>
              </Field>
            ))}
            <button
              type="button"
              onClick={() => set("colors", DEFAULT_SITE_SETTINGS.colors)}
              className="text-sm text-primary hover:underline"
            >
              सुरुको रङमा फर्काउनुहोस्
            </button>
          </div>
          <div className="space-y-3">
            <Preview s={form} />
            {warnings.length > 0 && (
              <ul role="status" className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3 list-disc pl-6 space-y-1">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>

      <Section title="सम्पर्क" hint="खाली छोडेको विवरण फुटरमा देखिँदैन।">
        <LocalizedFields
          id="address"
          label="ठेगाना"
          value={form.contact.address}
          max={200}
          onChange={(v) => set("contact", { ...form.contact, address: v })}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field id="phone" label="फोन">
            <input id="phone" type="tel" value={form.contact.phone} onChange={(e) => set("contact", { ...form.contact, phone: e.target.value })} className={inputClass} />
          </Field>
          <Field id="email" label="इमेल">
            <input id="email" type="email" value={form.contact.email} onChange={(e) => set("contact", { ...form.contact, email: e.target.value })} className={inputClass} />
          </Field>
        </div>
      </Section>

      <Section title="सामाजिक सञ्जाल" hint="पूरा लिङ्क (https://…) राख्नुहोस्; खाली भएकोको आइकन देखिँदैन।">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(["facebook", "x", "instagram", "youtube", "tiktok"] as const).map((k) => (
            <Field key={k} id={`social-${k}`} label={{ facebook: "Facebook", x: "X (Twitter)", instagram: "Instagram", youtube: "YouTube", tiktok: "TikTok" }[k]}>
              <input
                id={`social-${k}`}
                type="url"
                value={form.social[k]}
                placeholder="https://"
                onChange={(e) => set("social", { ...form.social, [k]: e.target.value })}
                className={inputClass}
              />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="भाषा">
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.englishEdition} onChange={(e) => set("englishEdition", e.target.checked)} className="w-4 h-4 mt-0.5" />
          <span>
            अंग्रेजी संस्करण (/en) देखाउनुहोस्
            <span className="block text-xs text-gray-500">बन्द गर्दा हेडरको “English” बटन लुक्छ। समाचारको अनुवाद भने भइरहन्छ।</span>
          </span>
        </label>
      </Section>

      <Section title="प्रिन्ट संस्करण" hint="पत्रिकाको मास्टहेडमा देखिन्छ। दर्ता नम्बर वेबसाइटको माथिल्लो पट्टी र फुटरमा पनि देखिन्छ।">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field id="reg-no" label="दर्ता नम्बर">
            <input id="reg-no" value={form.print.regNo} onChange={(e) => set("print", { ...form.print, regNo: e.target.value })} className={inputClass} placeholder="जि.प्र.का. द. नं. …" />
          </Field>
          <Field id="price" label="मूल्य (रु.)">
            <input id="price" value={form.print.price} onChange={(e) => set("print", { ...form.print, price: e.target.value })} className={inputClass} />
          </Field>
          <Field id="print-email" label="लेख/प्रतिक्रिया पठाउने इमेल">
            <input id="print-email" type="email" value={form.print.email} onChange={(e) => set("print", { ...form.print, email: e.target.value })} className={inputClass} />
          </Field>
        </div>
      </Section>

      {message && (
        <p role="status" className={`p-3 rounded-lg text-sm border ${message.ok ? "bg-green-50 border-green-200 text-green-900" : "bg-red-50 border-red-200 text-red-800"}`}>
          {message.text}
        </p>
      )}
      <div className="sticky bottom-0 bg-gray-100/90 backdrop-blur py-3">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? "सुरक्षित हुँदै…" : "सेटिङ सुरक्षित गर्नुहोस्"}
        </button>
      </div>
    </form>
  );
}
