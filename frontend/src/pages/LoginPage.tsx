import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login, getMe } from "@/api/auth";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await login(email, password);

      if (data.requires_org_selection && data.orgs) {
        navigate("/select-org", {
          replace: true,
          state: { orgs: data.orgs },
        });
        return;
      }

      const me = await getMe();
      setAuthenticated(true, me.role);
      if (me.role === "admin") navigate("/dashboard", { replace: true });
      else if (me.role === "judge") navigate("/cata", { replace: true });
      else navigate("/mis-muestras", { replace: true });
    } catch {
      setError("Email o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-neutral-900">Copa de Cervezas</h1>
        <p className="mt-1 text-sm text-neutral-600">Iniciá sesión para continuar</p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-neutral-600">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-neutral-600">
              Contraseña
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" variant="default" disabled={loading} className="w-full">
            {loading ? "Ingresando..." : "Ingresar"}
          </Button>
          <Link to="/register" className="block text-center text-sm text-neutral-500 hover:text-neutral-700">
            ¿Primera vez? Registrá tu cervecería
          </Link>
          {error && <p className="text-sm text-danger-500">{error}</p>}
        </form>
      </div>
    </div>
  );
}
