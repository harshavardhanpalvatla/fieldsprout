'use client';

import { useState, useCallback, useEffect } from 'react';
import { User } from '@/types';

interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isAuthenticated: false,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      const userStr = localStorage.getItem('user');
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr) as User;
          setAuthState({
            user,
            accessToken: token,
            isAuthenticated: true,
          });
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
        }
      }
    }
  }, []);

  const login = useCallback((tokens: AuthTokens, user: User) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', tokens.accessToken);
      if (tokens.refreshToken) {
        localStorage.setItem('refreshToken', tokens.refreshToken);
      }
      localStorage.setItem('user', JSON.stringify(user));
    }
    setAuthState({
      user,
      accessToken: tokens.accessToken,
      isAuthenticated: true,
    });
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
    setAuthState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });
  }, []);

  return {
    user: authState.user,
    accessToken: authState.accessToken,
    isAuthenticated: authState.isAuthenticated,
    login,
    logout,
  };
}

export default useAuth;
