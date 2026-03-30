"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiRequest, ApiError } from "../lib/api";
import { clearStoredToken, readStoredToken, writeStoredToken } from "../lib/storage";
import type { AuthState, CurrentUser, MeResponse } from "../lib/types";

type AuthContextValue = AuthState & {
  setSession: (token: string, user: CurrentUser) => void;
  clearSession: () => void;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
};

const defaultAuthState: AuthState = {
  token: null,
  currentUser: null,
  isBooting: true,
  isAuthenticated: false,
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: React.ReactNode;
};

function createSignedOutState(): AuthState {
  return {
    token: null,
    currentUser: null,
    isBooting: false,
    isAuthenticated: false,
  };
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(defaultAuthState);

  const clearSession = () => {
    clearStoredToken();
    setState(createSignedOutState());
  };

  const setSession = (token: string, user: CurrentUser) => {
    writeStoredToken(token);
    setState({
      token,
      currentUser: user,
      isBooting: false,
      isAuthenticated: true,
    });
  };

  const refreshCurrentUser = async () => {
    const activeToken = readStoredToken();

    if (!activeToken) {
      setState(createSignedOutState());
      return;
    }

    const payload = await apiRequest<MeResponse>("/me", {
      token: activeToken,
    });

    setState({
      token: activeToken,
      currentUser: payload.user,
      isBooting: false,
      isAuthenticated: true,
    });
  };

  const logout = async () => {
    const activeToken = state.token ?? readStoredToken();

    try {
      if (activeToken) {
        await apiRequest("/auth/logout", {
          method: "POST",
          token: activeToken,
          body: {},
        });
      }
    } finally {
      clearSession();
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const storedToken = readStoredToken();

      if (!storedToken) {
        if (!cancelled) {
          setState(createSignedOutState());
        }
        return;
      }

      try {
        const payload = await apiRequest<MeResponse>("/me", { token: storedToken });

        if (!cancelled) {
          setState({
            token: storedToken,
            currentUser: payload.user,
            isBooting: false,
            isAuthenticated: true,
          });
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearStoredToken();
        }

        if (!cancelled) {
          setState(createSignedOutState());
        }
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      setSession,
      clearSession,
      logout,
      refreshCurrentUser,
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
