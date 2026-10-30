/**
 * समाचार स्रोत – RSS feeds used by the hourly AI news run.
 * Editors can view; admins can add, pause, test and run.
 */

import { useEffect, useState, type FormEvent } from "react";
import type { Category, IngestRun, NewsSource } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@/services/auth.service";
import { getCategories, getLocationCategories } from "@/services/categories.service";
import {
  createSource,
  deleteSource,
  getIngestRuns,
  getSources,
  runIngestNow,
  testSource,
  updateSource,
  type IngestReport,
} from "@/services/sources.service";
import { formatDualDate, toNepaliDigits } from "@/lib/bs-date";

const inputClass =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm";

export function SourcesPage() {
  const { author } = useAuth();
  const admin = isAdmin(author);

  const [sources, setSources] = useState<NewsSource[]>([]);
  const [runs, setRuns] = useState<IngestRun[]>([]);
  const [topics, setTopics] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<IngestReport | null>(null);
  const [form, setForm] = useState({ name: "", url: "", categoryId: "", locationId: "" });

  async function load() {
    setLoading(true);
    try {
      const [s, r, t, l] = await Promise.all([getSources(), getIngestRuns(), getCategories(), getLocationCategories()]);
      setSources(s);
      setRuns(r);
      setTopics(t);
      setLocations(l.filter((x) => x.level !== "province"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      const created = await createSource({
        name: form.name.trim(),
        url: form.url.trim(),
        categoryId: form.categoryId || null,
        locationId: form.locationId || null,
      });
      setSources((prev) => [created, ...prev]);
      setForm({ name: "", url: "", categoryId: "", locationId: "" });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "स्रोत थप्न सकिएन।");
    }
  }

  async function onToggle(s: NewsSource) {
    const updated = await updateSource(s.$id, { isActive: !s.isActive });
    setSources((prev) => prev.map((x) => (x.$id === s.$id ? updated : x)));
  }

  async function onDelete(s: NewsSource) {
    if (!confirm(`"${s.name}" हटाउने हो?`)) return;
    await deleteSource(s.$id);
    setSources((prev) => prev.filter((x) => x.$id !== s.$id));
  }

  async function onTest(s: NewsSource) {
    setMessage(`${s.name} जाँच हुँदैछ...`);
    const res = await testSource(s.$id);
    setMessage(
      res.ok
        ? `${s.name}: पछिल्लो ३ दिनमा ${toNepaliDigits(res.count ?? 0)} समाचार। जस्तै: ${res.sample?.slice(0, 2).join(" | ")}`
        : `${s.name}: त्रुटि – ${res.error}`
    );
  }

  async function onRun(dryRun: boolean) {
    setRunning(true);
    setReport(null);
    setMessage(null);
    try {
      setReport(await runIngestNow(dryRun));
      if (!dryRun) setRuns(await getIngestRuns());
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "चलाउन सकिएन।");
    } finally {
      setRunning(false);
    }
  }

  const nameOf = (id?: string | null) => [...topics, ...locations].find((c) => c.$id === id)?.name;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">समाचार स्रोत</h1>
        <p className="text-gray-600 mt-1">
          यी RSS फिडबाट हरेक घण्टा नयाँ समाचार संकलन हुन्छ। AI ले श्रेणी र स्थान छुट्याएर छोटो समाचार लेख्छ, जुन “AI समीक्षा” मा
          स्वीकृतिको लागि जान्छ। स्थानीय सञ्चारमाध्यमको फिड थप्दा स्थान छान्नुहोस्।
        </p>
      </div>

      {message && <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">{message}</div>}

      {admin && (
        <form onSubmit={onAdd} className="bg-white rounded-lg shadow-sm p-5 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-600 mb-1">नाम</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-600 mb-1">RSS URL</label>
            <input
              required
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://example.com/feed"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">स्थान (स्थानीय मिडिया)</label>
            <select value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })} className={inputClass}>
              <option value="">राष्ट्रिय</option>
              {locations.map((l) => (
                <option key={l.$id} value={l.$id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90">
            + स्रोत थप्नुहोस्
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-3">स्रोत</th>
              <th className="px-4 py-3">स्थान</th>
              <th className="px-4 py-3">अन्तिम संकलन</th>
              <th className="px-4 py-3">स्थिति</th>
              {admin && <th className="px-4 py-3 text-right">कार्य</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  लोड हुँदैछ...
                </td>
              </tr>
            ) : (
              sources.map((s) => (
                <tr key={s.$id} className={s.isActive ? "" : "opacity-60"}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{s.name}</div>
                    <div className="text-xs text-gray-400 truncate max-w-xs">{s.url}</div>
                  </td>
                  <td className="px-4 py-3">{nameOf(s.locationId) ?? "राष्ट्रिय"}</td>
                  <td className="px-4 py-3">
                    {s.lastFetchedAt ? (
                      <>
                        {formatDualDate(s.lastFetchedAt).relative}
                        {s.lastError ? (
                          <div className="text-xs text-red-500 truncate max-w-xs" title={s.lastError}>
                            {s.lastError}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">{toNepaliDigits(s.lastItemCount ?? 0)} समाचार</div>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400">अहिलेसम्म छैन</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        s.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {s.isActive ? "सक्रिय" : "रोकिएको"}
                    </span>
                  </td>
                  {admin && (
                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                      <button onClick={() => onTest(s)} className="text-blue-600 hover:underline">
                        जाँच
                      </button>
                      <button onClick={() => onToggle(s)} className="text-gray-600 hover:underline">
                        {s.isActive ? "रोक्नुहोस्" : "सुरु गर्नुहोस्"}
                      </button>
                      <button onClick={() => onDelete(s)} className="text-red-600 hover:underline">
                        हटाउनुहोस्
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-800">संकलन इतिहास</h2>
          {admin && (
            <div className="flex gap-2">
              <button
                onClick={() => onRun(true)}
                disabled={running}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                परीक्षण (सेभ नगर्ने)
              </button>
              <button
                onClick={() => onRun(false)}
                disabled={running}
                className="px-3 py-2 text-sm bg-secondary text-white rounded-lg hover:bg-secondary-dark disabled:opacity-50"
              >
                {running ? "चल्दैछ..." : "अहिले चलाउनुहोस् (२ वटा)"}
              </button>
            </div>
          )}
        </div>

        {report && (
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <p className="font-medium mb-1">
              {report.dryRun ? "परीक्षण नतिजा" : "नतिजा"}: {toNepaliDigits(report.stats.fetched)} संकलित ·{" "}
              {toNepaliDigits(report.stats.duplicates)} दोहोरिएका · {toNepaliDigits(report.stats.drafted)} मस्यौदा
            </p>
            <ul className="list-disc pl-5 text-gray-700">
              {report.drafts.map((d) => (
                <li key={d.sourceUrl}>
                  [{d.category}
                  {d.location ? ` / ${d.location}` : ""}] {d.title}
                </li>
              ))}
            </ul>
            {report.errorLog.length > 0 && <p className="text-red-600 mt-2">{report.errorLog.slice(0, 3).join(" · ")}</p>}
          </div>
        )}

        <table className="w-full text-sm">
          <thead className="text-gray-500 text-left">
            <tr>
              <th className="py-2">समय</th>
              <th className="py-2">प्रकार</th>
              <th className="py-2">संकलित</th>
              <th className="py-2">दोहोरिएका</th>
              <th className="py-2">मस्यौदा</th>
              <th className="py-2">त्रुटि</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {runs.map((r) => (
              <tr key={r.$id}>
                <td className="py-2">{formatDualDate(r.startedAt).relative}</td>
                <td className="py-2">
                  {r.trigger === "cron" ? "स्वचालित" : r.trigger === "manual" ? "म्यानुअल" : "CLI"}
                  {r.dryRun && " (परीक्षण)"}
                </td>
                <td className="py-2">{toNepaliDigits(r.stats.fetched)}</td>
                <td className="py-2">{toNepaliDigits(r.stats.duplicates)}</td>
                <td className="py-2">{toNepaliDigits(r.stats.drafted)}</td>
                <td className="py-2 text-red-500 truncate max-w-xs" title={r.errorLog.join("\n")}>
                  {r.errorLog.length ? toNepaliDigits(r.errorLog.length) : "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
