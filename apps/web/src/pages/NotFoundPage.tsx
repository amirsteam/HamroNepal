/**
 * 404 Not Found Page
 */

import { Link } from "react-router-dom";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { useT } from "@/lib/i18n";

export function NotFoundPage() {
  const { t, to, num } = useT();
  useDocumentTitle(t.notFoundTitle);
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <div className="max-w-md mx-auto">
        <p className="text-9xl font-bold text-primary mb-4" aria-hidden="true">{num(404)}</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{t.notFoundTitle}</h1>
        <p className="text-gray-600 mb-8">
          {t.notFoundText}
        </p>
        <Link
          to={to("/")}
          className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          {t.goHome}
        </Link>
      </div>
    </div>
  );
}
