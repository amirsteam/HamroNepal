/**
 * App Router Configuration
 */

import { createBrowserRouter } from "react-router-dom";
import { Layout } from "@/components/layout";
import { HomePage, CategoryPage, NewsDetailPage, NotFoundPage, SearchPage } from "@/pages";
import { DashboardLayout } from "@/components/dashboard";
import { ProtectedRoute } from "@/components/auth";
import {
  LoginPage,
  DashboardHomePage,
  ArticlesListPage,
  ArticleEditorPage,
  CategoriesPage,
  ReviewPage,
  SourcesPage,
  PromotionsPage,
} from "@/pages/dashboard";

export const router = createBrowserRouter([
  // Public routes
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "category/:slug",
        element: <CategoryPage />,
      },
      {
        path: "news/:slug",
        element: <NewsDetailPage />,
      },
      {
        path: "search",
        element: <SearchPage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },

  // Dashboard login (public)
  {
    path: "/dashboard/login",
    element: <LoginPage />,
  },

  // Dashboard routes (protected)
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardHomePage />,
      },
      {
        path: "articles",
        element: <ArticlesListPage />,
      },
      {
        path: "articles/new",
        element: <ArticleEditorPage />,
      },
      {
        path: "articles/:id",
        element: <ArticleEditorPage />,
      },
      {
        path: "categories",
        element: (
          <ProtectedRoute allowedRoles={["admin", "editor"]}>
            <CategoriesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "review",
        element: (
          <ProtectedRoute allowedRoles={["admin", "editor"]}>
            <ReviewPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "sources",
        element: (
          <ProtectedRoute allowedRoles={["admin", "editor"]}>
            <SourcesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "promotions",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            <PromotionsPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
