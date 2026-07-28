import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getMe, logout as logoutApi } from "@/api/auth";
import type { Role, MeResponse } from "@/api/auth";

interface AuthContextValue {
  isAuthenticated: boolean;
  role: Role | null;
  loading: boolean;
  setAuthenticated: (value: boolean, role?: Role) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then((me: MeResponse) => {
        setIsAuthenticated(true);
        setRole(me.role);
      })
      .catch(() => {
        setIsAuthenticated(false);
        setRole(null);
      })
      .finally(() => setLoading(false));
  }, []);

  function setAuthenticated(value: boolean, newRole?: Role) {
    setIsAuthenticated(value);
    setRole(value && newRole ? newRole : null);
  }

  async function logout() {
    await logoutApi();
    setIsAuthenticated(false);
    setRole(null);
  }

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, role, loading, setAuthenticated, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
