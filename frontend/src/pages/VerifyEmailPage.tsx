import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { verifyEmail } from "@/api/auth";

type Status = "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>(token ? "loading" : "error");

  useEffect(() => {
    if (!token) return;
    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-neutral-900">Copa de Cervezas</h1>

        {status === "loading" && (
          <p className="mt-6 text-sm text-neutral-600">Verificando...</p>
        )}

        {status === "success" && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-neutral-600">
              ¡Email verificado! Ya podés iniciar sesión.
            </p>
            <Link to="/login">
              <span className="text-sm font-medium text-primary hover:underline">
                Ir al login
              </span>
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-danger-600">
              El link de verificación no es válido o ya expiró.
            </p>
            <Link to="/login">
              <span className="text-sm font-medium text-primary hover:underline">
                Solicitá uno nuevo
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
