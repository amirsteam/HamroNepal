/**
 * News Grid Component
 *
 * Displays a grid of news articles.
 */

import type { Article } from "@/types";
import { NewsCard } from "./NewsCard";
import { useT } from "@/lib/i18n";

interface NewsGridProps {
  articles: Article[];
  columns?: 2 | 3 | 4;
  variant?: "default" | "compact";
}

export function NewsGrid({
  articles,
  columns = 3,
  variant = "default",
}: NewsGridProps) {
  const { t } = useT();
  const gridCols = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  if (articles.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">{t.noNews}</div>
    );
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-6`}>
      {articles.map((article) => (
        <NewsCard
          key={article.$id}
          article={article}
          variant={variant === "compact" ? "horizontal" : "default"}
        />
      ))}
    </div>
  );
}
