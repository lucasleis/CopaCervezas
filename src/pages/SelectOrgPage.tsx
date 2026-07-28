import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { selectOrg, getMe } from "@/api/auth";
import type { OrgOption } from "@/api/auth";
import { useAuth } from "@/contexts/AuthContext";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  judge: "Juez",
  brewery: "Cervecería",
};

export default function SelectOrgPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuthenticated } = useAuth();

  const orgs: OrgOption[] | undefined = location.state?.orgs;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If landed here without org list, redirect to login
  if (!orgs || orgs.length === 0) {
    return <Navigate to="/login" replace />;
  }

  async function handleSelect(orgId: string) {
    setError(null);
    setLoading(true);
    try {
      await selectOrg(orgId);
      const me = await getMe();
      setAuthenticated(true, me.role);
      if (me.role === "admin") navigate("/dashboard", { replace: true });
      else if (me.role === "judge") navigate("/cata", { replace: true });
      else navigate("/mis-muestras", { replace: true });
    } catch {
      setError("No se pudo seleccionar la organización. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-neutral-900">Seleccioná una organización</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Tu cuenta tiene acceso a más de una organización.
        </p>

        <div className="mt-6 space-y-3">
          {orgs.map((org) => (
            <button
              key={org.id}
              type="button"
              disabled={loading}
              onClick={() => handleSelect(org.id)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-left transition-colors hover:border-neutral-400 hover:bg-neutral-50 disabled:opacity-50"
            >
              <p className="text-sm font-medium text-neutral-900">{org.name}</p>
              <p className="text-xs text-neutral-500">
                {ROLE_LABELS[org.role] ?? org.role}
              </p>
            </button>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
