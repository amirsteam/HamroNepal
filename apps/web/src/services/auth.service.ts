/**
 * Auth Service – session cookie login and role helpers.
 */

import { api, ApiError } from "@/lib/api";
import type { Author } from "@/types";

export interface LoginCredentials {
  email: string;
  password: string;
}

/** The signed-in user. Same object as `Author` (one account per person). */
export type AuthUser = Author;

export async function login(credentials: LoginCredentials): Promise<AuthUser> {
  return api.post<AuthUser>("/auth/login", credentials);
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

/** Returns null when not signed in. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    return await api.get<AuthUser | null>("/auth/me");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post("/auth/password", { currentPassword, newPassword });
}

export function hasRole(author: Author | null, requiredRoles: string[]): boolean {
  return !!author && requiredRoles.includes(author.role);
}

export const canCreateArticle = (a: Author | null) => hasRole(a, ["admin", "editor", "reporter"]);
export const canEditAnyArticle = (a: Author | null) => hasRole(a, ["admin", "editor"]);
export const canPublish = (a: Author | null) => hasRole(a, ["admin", "editor"]);
export const canDeleteArticle = (a: Author | null) => hasRole(a, ["admin"]);
export const canManageCategories = (a: Author | null) => hasRole(a, ["admin", "editor"]);
export const isAdmin = (a: Author | null) => hasRole(a, ["admin"]);
