import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setPassword as setPasswordApi } from "@/api/auth";

export default function SetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!token) return;

    setLoading(true);
    try {
      await setPasswordApi({ token, password });
      setSuccess(true);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 400) {
        setError("El link no es válido o ya expiró.");
      } else {
        setError("Ocurrió un error. Intentá de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!token) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-neutral-900">Crear contraseña</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Completá tu registro estableciendo una contraseña.
        </p>

        {success ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-neutral-600">
              Contraseña creada. Ya podés iniciar sesión.
            </p>
            <Link to="/login">
              <span className="text-sm font-medium text-primary hover:underline">
                Ir al login
              </span>
            </Link>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="password">Nueva contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirmar contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" variant="default" disabled={loading} className="w-full">
              {loading ? "Guardando..." : "Crear contraseña"}
            </Button>
            {error && <p className="text-sm text-danger-600">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
