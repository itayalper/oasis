import { useState, useEffect, createContext, useContext } from 'react';
import { authApi, type UserInfo, ApiError } from '../api/client';

interface AuthState {
  user: UserInfo | null;
  loading: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (tenantName: string, email: string, displayName: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export type AuthContextValue = AuthState & AuthActions;

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthProvider(): AuthContextValue {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Check session on mount
  useEffect(() => {
    authApi
      .me()
      .then(setUser)
      .catch((err: unknown) => {
        // 401 means no active session — not an error
        if (err instanceof ApiError && err.status === 401) {
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const userInfo = await authApi.login({ email, password });
    setUser(userInfo);
  };

  const register = async (
    tenantName: string,
    email: string,
    displayName: string,
    password: string
  ) => {
    const userInfo = await authApi.register({ tenantName, email, displayName, password });
    setUser(userInfo);
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    // Clear any cached Jira project list
    sessionStorage.removeItem('jira_projects');
  };

  return { user, loading, login, register, logout };
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
