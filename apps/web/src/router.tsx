/**
 * App Router Configuration
 */

import { Suspense, lazy, type ComponentType, type ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { Layout } from "@/components/layout";
import { HomePage, CategoryPage, NewsDetailPage, NotFoundPage, SearchPage } from "@/pages";
import { ProtectedRoute } from "@/components/auth";

// The dashboard (editor, AI tools, print, ads) loads only when someone opens
// /dashboard, so readers never download it.
const dash = <K extends string>(name: K) =>
  lazy(() =>
    import("@/pages/dashboard").then((m) => ({ default: (m as unknown as Record<K, ComponentType>)[name] }))
  );
const DashboardLayout = lazy(() => import("@/components/dashboard").then((m) => ({ default: m.DashboardLayout })));
const LoginPage = dash("LoginPage");
const DashboardHomePage = dash("DashboardHomePage");
const ArticlesListPage = dash("ArticlesListPage");
const ArticleEditorPage = dash("ArticleEditorPage");
const CategoriesPage = dash("CategoriesPage");
const ReviewPage = dash("ReviewPage");
const SourcesPage = dash("SourcesPage");
const PromotionsPage = dash("PromotionsPage");
const PrintPage = dash("PrintPage");

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center text-gray-500" role="status">
      लोड हुँदैछ...
    </div>
  );
}
const load = (node: ReactNode) => <Suspense fallback={<Loading />}>{node}</Suspense>;

/** The reader pages; the language comes from the URL (lib/i18n.ts). */
function publicPages() {
  return [
    { index: true, element: <HomePage /> },
    { path: "category/:slug", element: <CategoryPage /> },
    { path: "news/:slug", element: <NewsDetailPage /> },
    { path: "search", element: <SearchPage /> },
    { path: "*", element: <NotFoundPage /> },
  ];
}

export const router = createBrowserRouter([
  // Public routes: the Nepali site at /, the English site at /en (same pages).
  { path: "/", element: <Layout />, children: publicPages() },
  { path: "/en", element: <Layout />, children: publicPages() },

  // Dashboard login (public)
  {
    path: "/dashboard/login",
    element: load(<LoginPage />),
  },

  // Dashboard routes (protected)
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>{load(<DashboardLayout />)}</ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: load(<DashboardHomePage />),
      },
      {
        path: "articles",
        element: load(<ArticlesListPage />),
      },
      {
        path: "articles/new",
        element: load(<ArticleEditorPage />),
      },
      {
        path: "articles/:id",
        element: load(<ArticleEditorPage />),
      },
      {
        path: "categories",
        element: (
          <ProtectedRoute allowedRoles={["admin", "editor"]}>
            {load(<CategoriesPage />)}
          </ProtectedRoute>
        ),
      },
      {
        path: "review",
        element: (
          <ProtectedRoute allowedRoles={["admin", "editor"]}>
            {load(<ReviewPage />)}
          </ProtectedRoute>
        ),
      },
      {
        path: "sources",
        element: (
          <ProtectedRoute allowedRoles={["admin", "editor"]}>
            {load(<SourcesPage />)}
          </ProtectedRoute>
        ),
      },
      {
        path: "print",
        element: (
          <ProtectedRoute allowedRoles={["admin", "editor"]}>
            {load(<PrintPage />)}
          </ProtectedRoute>
        ),
      },
      {
        path: "promotions",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            {load(<PromotionsPage />)}
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
