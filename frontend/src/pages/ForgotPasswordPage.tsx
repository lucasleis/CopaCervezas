import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPassword } from "@/api/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch {
      setError("Ocurrió un error. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-neutral-900">Copa de Cervezas</h1>
        <p className="mt-1 text-sm text-neutral-600">Recuperá tu contraseña</p>

        {success ? (
          <p className="mt-6 text-sm text-neutral-600">
            Si el email existe, recibirás un link para restablecer tu contraseña.
          </p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" variant="default" disabled={loading} className="w-full">
              {loading ? "Enviando..." : "Enviar link"}
            </Button>
            {error && <p className="text-sm text-danger-600">{error}</p>}
          </form>
        )}

        <p className="mt-6 text-sm text-neutral-600">
          <Link to="/login" className="font-medium text-primary hover:underline">
            Volver al login
          </Link>
        </p>
      </div>
    </div>
  );
}
