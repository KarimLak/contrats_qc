"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { authApi, User } from "../../client/app/api/auth";

interface AuthContextType {
  user:     User | null;
  loading:  boolean;
  login:    (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout:   () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

let _token: string | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    authApi.refresh()
      .then((data) => { _token = data.access_token; return authApi.me(_token); })
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<void> => {
    const data = await authApi.login(username, password);
    _token = data.access_token;
    setUser(await authApi.me(_token));
  }, []);

  const register = useCallback(async (username: string, email: string, password: string): Promise<void> => {
    await authApi.register(username, email, password);
    await login(username, password);
  }, [login]);

  const logout = useCallback(async (): Promise<void> => {
    try { await authApi.logout(); } catch {}
    _token = null;
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}