/**
 * Problems the AI pipeline spotted in a draft (English words left over,
 * letters from another script, numbers not in the source). Rechecked on save.
 */
export function AIWarnings({ warnings, className = "" }: { warnings?: string[]; className?: string }) {
  if (!warnings?.length) return null;
  return (
    <div role="note" className={`p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900 ${className}`}>
      <p className="font-semibold">⚠ प्रकाशन अघि सच्याउनुहोस्:</p>
      <ul className="mt-1 list-disc pl-5 space-y-0.5">
        {warnings.map((w) => (
          <li key={w} className="break-words">{w}</li>
        ))}
      </ul>
    </div>
  );
}
