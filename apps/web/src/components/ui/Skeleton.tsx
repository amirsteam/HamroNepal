/**
 * Loading Skeleton Components
 */

export function NewsCardSkeleton() {
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-sm animate-pulse">
      <div className="aspect-video bg-gray-200" />
      <div className="p-4">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-full mb-2" />
        <div className="h-3 bg-gray-200 rounded w-2/3 mt-4" />
      </div>
    </div>
  );
}

export function NewsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <NewsCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function FeaturedSkeleton() {
  return <div className="bg-gray-200 rounded-lg aspect-video animate-pulse" />;
}

export function SidebarSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3 animate-pulse">
          <div className="w-20 h-16 bg-gray-200 rounded" />
          <div className="flex-1">
            <div className="h-3 bg-gray-200 rounded w-full mb-2" />
            <div className="h-3 bg-gray-200 rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ArticleDetailSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Mirrors the centred article header, so the real one doesn't shift it. */}
      <div className="h-6 w-32 bg-gray-200 rounded-full mx-auto mb-4" />
      <div className="h-9 md:h-11 bg-gray-200 rounded w-11/12 mx-auto mb-3" />
      <div className="h-9 md:h-11 bg-gray-200 rounded w-3/4 mx-auto mb-5" />
      <div className="h-8 bg-gray-200 rounded-full w-64 mx-auto mb-6" />
      <div className="aspect-video bg-gray-200 rounded-lg mb-6" />
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded w-4/5" />
      </div>
    </div>
  );
}
