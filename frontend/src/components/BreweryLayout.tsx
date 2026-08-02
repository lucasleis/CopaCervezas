import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export default function BreweryLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-end border-b border-neutral-200 bg-white px-8 py-4">
        <Button variant="ghost" size="sm" onClick={logout}>
          Cerrar sesión
        </Button>
      </header>
      <main className="flex-1 overflow-y-auto bg-neutral-100">{children}</main>
    </div>
  );
}
