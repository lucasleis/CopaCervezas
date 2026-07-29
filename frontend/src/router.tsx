import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactElement } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { Role } from "@/api/auth";
import LoginPage from "@/pages/LoginPage";
import SelectOrgPage from "@/pages/SelectOrgPage";
import AdminLayout from "@/components/AdminLayout";
import EdicionesPage from "@/pages/admin/EdicionesPage";

function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: ReactElement;
  requiredRole?: Role;
}) {
  const { isAuthenticated, role, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Cargando...
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && role !== requiredRole) return <Navigate to="/login" replace />;
  return children;
}

function RootRedirect() {
  const { isAuthenticated, role, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Cargando...
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role === "admin") return <Navigate to="/dashboard" replace />;
  if (role === "judge") return <Navigate to="/cata" replace />;
  return <Navigate to="/mis-muestras" replace />;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/select-org" element={<SelectOrgPage />} />
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
      <Route
        path="/cata"
        element={
          <ProtectedRoute requiredRole="judge">
            <AdminLayout>
              <div className="p-8 text-2xl font-semibold">Cata</div>
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mis-muestras"
        element={
          <ProtectedRoute requiredRole="brewery">
            <AdminLayout>
              <div className="p-8 text-2xl font-semibold">Mis muestras</div>
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/ediciones"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <EdicionesPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
