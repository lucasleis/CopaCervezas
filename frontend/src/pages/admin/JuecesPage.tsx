import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/PageHeader";
import { invitarJuez } from "@/api/auth";

export default function JuecesPage() {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: invitarJuez,
    onSuccess: (_data, variables) => {
      toast.success(`Invitación enviada a ${variables.email}.`);
      setNombre("");
      setApellido("");
      setEmail("");
      setError(null);
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 409) {
        setError("Ya existe una cuenta con ese email.");
      } else {
        setError("No se pudo enviar la invitación. Intentá de nuevo.");
      }
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    mutation.mutate({ nombre, apellido, email });
  }

  return (
    <div className="p-8">
      <PageHeader title="Jueces" subtitle="Invitá jueces para que evalúen las muestras de la competencia." />

      <Card padding="md" className="mb-6">
        <h2 className="text-base font-semibold text-neutral-900">Invitar juez</h2>
        <form className="mt-4 flex flex-col gap-4 md:flex-row md:items-end" onSubmit={handleSubmit}>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="apellido">Apellido</Label>
            <Input
              id="apellido"
              type="text"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              required
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" variant="default" disabled={mutation.isPending}>
            {mutation.isPending ? "Enviando..." : "Invitar"}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-danger-600">{error}</p>}
      </Card>

      <div>
        <h2 className="mb-2 text-base font-semibold text-neutral-900">Jueces</h2>
        <EmptyState message="La lista de jueces estará disponible próximamente." />
      </div>
    </div>
  );
}
