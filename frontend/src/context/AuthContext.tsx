import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, tokenStore } from '../api/client';
import type { AuthResponse, User } from '../api/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(() => tokenStore.get() !== null);

  const logout = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
    qc.removeQueries({ queryKey: ['orders'] });
  }, [qc]);

  // restore the session on page load
  useEffect(() => {
    if (!tokenStore.get()) return;
    api<{ user: User }>('/api/auth/me').then((r) => setUser(r.user)).catch(() => tokenStore.set(null)).finally(() => setLoading(false));
  }, []);

  // any 401 on a protected call (e.g. expired token) signs the user out
  useEffect(() => {
    window.addEventListener('auth:expired', logout);
    return () => window.removeEventListener('auth:expired', logout);
  }, [logout]);

  const start = (r: AuthResponse) => { tokenStore.set(r.token); setUser(r.user); };

  const value = useMemo<AuthState>(() => ({
    user, loading, logout,
    login: async (email, password) => start(await api<AuthResponse>('/api/auth/login', { method: 'POST', body: { email, password } })),
    register: async (email, username, password) => start(await api<AuthResponse>('/api/auth/register', { method: 'POST', body: { email, username, password } })),
  }), [user, loading, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
