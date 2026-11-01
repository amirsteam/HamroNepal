/**
 * प्रिन्ट संस्करण – the weekly press PDF (editors and admins).
 * Issues are made by the weekly job (or `npm run print:issue`); this page
 * lists them and previews the next one.
 */

import { useEffect, useState } from "react";
import type { PrintIssue } from "@/types";
import { getPrintIssues, printPreviewUrl } from "@/services/print.service";
import { formatDualDate, toNepaliDigits } from "@/lib/bs-date";

const inputClass =
  "px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm";

/** Today in Nepal, "YYYY-MM-DD". */
const todayNepal = () => new Date(Date.now() + (5 * 60 + 45) * 60_000).toISOString().slice(0, 10);

export function PrintPage() {
  const [issues, setIssues] = useState<PrintIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(todayNepal);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setIssues(await getPrintIssues());
    } catch (err) {
      setError(err instanceof Error ? err.message : "अंकहरू लोड हुन सकेनन्।");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">प्रिन्ट संस्करण</h1>
        <p className="text-gray-600 mt-1">
          छापाखानाका लागि साप्ताहिक PDF (३१८ × ४८३ मिमी, ३ मिमी ब्लिड, CMYK, ६ पृष्ठ)। हप्ताभरका प्रकाशित समाचारबाट हरेक
          शुक्रबार साँझ स्वतः बन्छ। पहिलो पृष्ठमा मुख्य समाचार, दोस्रो पृष्ठमा सम्पादकीय, भित्री पृष्ठमा राष्ट्रिय, स्थानीय, अर्थ,
          अन्तर्राष्ट्रिय र खेलकुद खण्ड हुन्छन्। हरेक समाचारको QR कोडले पूरा समाचार अनलाइन खोल्छ। सम्पादकीय “सम्पादकीय”
          श्रेणीमा लेख्नुहोस्; छापाका विज्ञापन “विज्ञापन” पृष्ठबाट थप्नुहोस्।
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-5 space-y-3">
        <h2 className="font-semibold text-gray-800">अर्को अंक हेर्नुहोस्</h2>
        <p className="text-sm text-gray-600">
          प्रकाशित समाचार मात्र छापिन्छन्। AI समीक्षामा बाँकी समाचार स्वीकृत गरेपछि पूर्वावलोकनमा देखिन्छन्। पूर्वावलोकनबाट
          ब्राउजरको “Print → Save as PDF” गरेर पनि PDF बनाउन सकिन्छ।
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="print-date" className="block text-xs text-gray-600 mb-1">
              अंकको मिति
            </label>
            <input id="print-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
          <a
            href={printPreviewUrl(date || undefined)}
            target="_blank"
            rel="noopener"
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            पूर्वावलोकन खोल्नुहोस्
          </a>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <h2 className="font-semibold text-gray-800 px-5 pt-5">बनेका अंकहरू</h2>
        {loading ? (
          <div className="p-5 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-5 text-center">
            <p className="text-red-600">{error}</p>
            <button onClick={load} className="mt-2 text-primary hover:underline">
              फेरि प्रयास गर्नुहोस्
            </button>
          </div>
        ) : issues.length === 0 ? (
          <p className="p-5 text-gray-500">
            अहिलेसम्म कुनै अंक बनेको छैन। पहिलो अंक यो शुक्रबार स्वतः बन्छ, वा GitHub मा “Print edition” workflow चलाउनुहोस्।
          </p>
        ) : (
          <table className="w-full text-sm mt-3">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-5 py-2 font-medium">अंक</th>
                <th className="px-5 py-2 font-medium">मिति</th>
                <th className="px-5 py-2 font-medium">समाचार</th>
                <th className="px-5 py-2 font-medium">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {issues.map((issue) => (
                <tr key={issue.$id}>
                  <td className="px-5 py-3 font-semibold text-gray-900">
                    वर्ष {toNepaliDigits(issue.volume)}, अंक {toNepaliDigits(issue.number)}
                  </td>
                  <td className="px-5 py-3 text-gray-700">{formatDualDate(issue.issueDate).bs}</td>
                  <td className="px-5 py-3 text-gray-700">{toNepaliDigits(issue.articleIds.length)}</td>
                  <td className="px-5 py-3">
                    {issue.pdfUrl ? (
                      <a href={issue.pdfUrl} target="_blank" rel="noopener" className="text-primary font-medium hover:underline">
                        डाउनलोड
                        {issue.sizeBytes ? ` (${toNepaliDigits((issue.sizeBytes / 1024 / 1024).toFixed(1))} MB)` : ""}
                      </a>
                    ) : (
                      <span className="text-gray-500">GitHub Actions मा छ</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
