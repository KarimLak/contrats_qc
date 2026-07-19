"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { authApi, User, BusinessProfileData } from "../api/auth";
import { getAccessToken, setAccessToken, onAuthExpired } from "../api/http";

export type Subscription = "user" | "pro" | "enterprise";

interface AuthContextType {
  user:         User | null;
  loading:      boolean;
  subscription: Subscription;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, business: BusinessProfileData) => Promise<void>;
  logout:   () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function deriveSubscription(user: User | null): Subscription {
  if (!user?.roles?.length) return "user";
  if (user.roles.includes("enterprise")) return "enterprise";
  if (user.roles.includes("pro") || user.roles.includes("admin")) return "pro";
  return "user";
}

export { getAccessToken };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // If the background refresh (proactive or 401-triggered) ever comes back
  // empty — the refresh token itself expired or got blacklisted — drop the
  // user client-side so AppLayout's redirect-to-/login effect kicks in,
  // instead of leaving stale UI up with a dead session.
  useEffect(() => {
    onAuthExpired(() => setUser(null));
  }, []);

  useEffect(() => {
    authApi.refresh()
      .then((data) => { setAccessToken(data.access_token); return authApi.me(data.access_token); })
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<void> => {
    const data = await authApi.login(username, password);
    setAccessToken(data.access_token);
    setUser(await authApi.me(data.access_token));
  }, []);

  const register = useCallback(async (username: string, email: string, password: string, business: BusinessProfileData): Promise<void> => {
    await authApi.register(username, email, password, business);
    await login(username, password);
  }, [login]);

  const logout = useCallback(async (): Promise<void> => {
    try { await authApi.logout(); } catch {}
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, subscription: deriveSubscription(user), login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
