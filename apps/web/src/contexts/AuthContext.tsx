/**
 * Auth Context
 *
 * Provides authentication state throughout the app. `user` and `author` are
 * the same object (one dashboard account per person); both names are kept
 * for the existing components.
 */

import { createContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { Author } from "@/types";
import {
  getCurrentUser,
  login as authLogin,
  logout as authLogout,
  type AuthUser,
  type LoginCredentials,
} from "@/services/auth.service";

interface AuthContextType {
  user: AuthUser | null;
  author: Author | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    try {
      setUser(await getCurrentUser());
    } catch {
      setUser(null);
    }
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setUser(await authLogin(credentials));
  };

  const logout = async () => {
    try {
      await authLogout();
    } finally {
      setUser(null);
    }
  };

  useEffect(() => {
    refreshAuth().finally(() => setIsLoading(false));
  }, [refreshAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        author: user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Re-export useAuth from separate file to fix Fast Refresh warning
export { useAuth } from "./useAuth";
