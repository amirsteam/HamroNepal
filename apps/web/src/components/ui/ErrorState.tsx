/**
 * Error State Component
 */

import { useT } from "@/lib/i18n";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  const { t } = useT();
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
        <svg
          className="w-8 h-8 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title ?? t.errorTitle}</h3>
      <p className="text-gray-600 mb-4">{message ?? t.errorMessage}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          {t.retry}
        </button>
      )}
    </div>
  );
}
