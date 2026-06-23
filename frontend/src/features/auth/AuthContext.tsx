import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { configureAuth, setAccessToken } from '@/lib/api';
import {
  loginRequest,
  logoutRequest,
  refreshRequest,
  updateProfileRequest,
  type AuthUser,
  type ProfileInput,
} from './auth.api';

type Status = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: Status;
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: ProfileInput) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const initialized = useRef(false);

  const applySession = useCallback((token: string, u: AuthUser) => {
    setAccessToken(token);
    setUser(u);
    setStatus('authenticated');
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const refresh = useCallback(async (): Promise<string | null> => {
    try {
      const data = await refreshRequest();
      applySession(data.accessToken, data.user);
      return data.accessToken;
    } catch {
      clearSession();
      return null;
    }
  }, [applySession, clearSession]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    configureAuth({ refresh, onUnauthorized: clearSession });
    refresh();
  }, [refresh, clearSession]);

  const login = useCallback(
    async (username: string, password: string) => {
      const data = await loginRequest(username, password);
      applySession(data.accessToken, data.user);
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const updateProfile = useCallback(async (data: ProfileInput) => {
    const res = await updateProfileRequest(data);
    setUser(res.user);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, logout, updateProfile }),
    [status, user, login, logout, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
