import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, SESSION_EXPIRED_EVENT } from '../services/api';
import { User } from '../types';

type AuthState = {
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

const tokenKey = 'ss_token';
const userKey = 'ss_user';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(tokenKey));
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem(userKey);
    return raw ? JSON.parse(raw) : null;
  });

  const login = async (email: string, password: string) => {
    const res = await apiFetch<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    setToken(res.token);
    setUser(res.user);
    localStorage.setItem(tokenKey, res.token);
    localStorage.setItem(userKey, JSON.stringify(res.user));
  };

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
  }, []);

  useEffect(() => {
    const onSessionExpired = () => {
      logout();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, [logout]);

  const value = useMemo(() => ({ token, user, login, logout }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
