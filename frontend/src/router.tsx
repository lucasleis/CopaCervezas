import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactElement } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { Role } from "@/api/auth";
import LoginPage from "@/pages/LoginPage";
import SelectOrgPage from "@/pages/SelectOrgPage";
import RegisterPage from "@/pages/RegisterPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import SetPasswordPage from "@/pages/SetPasswordPage";
import AdminLayout from "@/components/AdminLayout";
import BreweryLayout from "@/components/BreweryLayout";
import DashboardPage from "@/pages/admin/DashboardPage";
import EdicionesPage from "@/pages/admin/EdicionesPage";
import EdicionDetailPage from "@/pages/admin/EdicionDetailPage";
import CataLivePage from "@/pages/admin/CataLivePage";
import CataPage from "@/pages/juez/CataPage";
import VueloEvaluacionPage from "@/pages/juez/VueloEvaluacionPage";
import MisMuestrasPage from "@/pages/brewery/MisMuestrasPage";
import MisMuestrasEdicionPage from "@/pages/brewery/MisMuestrasEdicionPage";
import CompetenciaDetallePage from "@/pages/brewery/CompetenciaDetallePage";
import EstilosPage from "@/pages/admin/EstilosPage";
import InscriptosPage from "@/pages/admin/InscriptosPage";
import GruposPage from "@/pages/admin/GruposPage";

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

function NotFound() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Cargando...
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-neutral-600">
      <h1 className="text-3xl font-semibold text-neutral-900">404</h1>
      <p className="text-sm">La página que buscás no existe.</p>
    </div>
  );
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
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route path="/" element={<RootRedirect />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <DashboardPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cata"
        element={
          <ProtectedRoute requiredRole="judge">
            <CataPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cata/:vuelo_id"
        element={
          <ProtectedRoute requiredRole="judge">
            <VueloEvaluacionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mis-muestras"
        element={
          <ProtectedRoute requiredRole="brewery">
            <BreweryLayout>
              <MisMuestrasPage />
            </BreweryLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mis-muestras/competencia/:edicion_id"
        element={
          <ProtectedRoute requiredRole="brewery">
            <BreweryLayout>
              <CompetenciaDetallePage />
            </BreweryLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mis-muestras/:edicion_id"
        element={
          <ProtectedRoute requiredRole="brewery">
            <BreweryLayout>
              <MisMuestrasEdicionPage />
            </BreweryLayout>
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
      <Route
        path="/admin/ediciones/:id"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <EdicionDetailPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/cata/:edicion_id"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <CataLivePage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/estilos"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <EstilosPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/ediciones/:id/inscripcion"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <InscriptosPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/ediciones/:id/grupos"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <GruposPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
