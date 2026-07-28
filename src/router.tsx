import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactElement } from "react";
import { useAuth } from "@/contexts/AuthContext";
import LoginPage from "@/pages/LoginPage";
import AdminLayout from "@/components/AdminLayout";

type Role = "admin" | "judge" | "brewery";

function ProtectedRoute({ children, requiredRole }: { children: ReactElement; requiredRole?: Role }) {
  const { isAuthenticated, role, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center">Cargando...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && role !== requiredRole) return <Navigate to="/login" replace />;
  return children;
}

function RootRedirect() {
  const { isAuthenticated, role, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center">Cargando...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role === "admin") return <Navigate to="/dashboard" replace />;
  if (role === "judge") return <Navigate to="/cata" replace />;
  return <Navigate to="/mis-muestras" replace />;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RootRedirect />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <div className="p-8 text-2xl font-semibold">Dashboard</div>
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
