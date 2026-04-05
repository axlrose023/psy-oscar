import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router";
import { login as apiLogin } from "../api/auth";
import { getMe } from "../api/users";
import { AUTH_EXPIRED_EVENT, tokenStore } from "../api/client";
import type { UserDetail } from "../types/user";

interface AuthContextType {
  user: UserDetail | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUser = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me);
    } catch {
      tokenStore.clearTokens();
      setUser(null);
    }
  }, []);

  // On mount: check if we have a token and try to load user
  useEffect(() => {
    const token = tokenStore.getAccessToken();
    if (token) {
      fetchUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [fetchUser]);

  useEffect(() => {
    const handleAuthExpired = () => {
      tokenStore.clearTokens();
      setUser(null);
      navigate("/signin", { replace: true });
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, [navigate]);

  const login = useCallback(
    async (username: string, password: string) => {
      await apiLogin({ username, password });
      await fetchUser();
      navigate("/", { replace: true });
    },
    [fetchUser, navigate],
  );

  const logout = useCallback(() => {
    tokenStore.clearTokens();
    setUser(null);
    navigate("/signin", { replace: true });
  }, [navigate]);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
