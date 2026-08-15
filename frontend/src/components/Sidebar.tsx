import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Ediciones", to: "/admin/ediciones" },
  { label: "Jueces", to: "/admin/jueces" },
  { label: "Estilos", to: "/admin/estilos" },
];

export default function Sidebar() {
  const { logout } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <aside className="flex h-screen w-[240px] shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="px-4 py-4">
        <p className="text-sm font-semibold text-neutral-900">Copa de Cervezas</p>
        <p className="text-xs text-neutral-600">Admin</p>
      </div>
      <nav className="flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block px-4 py-2 text-sm ${isActive ? "font-medium text-primary" : "text-neutral-600"}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-neutral-200 px-4 py-4">
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="flex w-full items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 hover:text-red-600 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Cerrar sesión?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-700 leading-relaxed">
            Vas a salir de tu cuenta. Tendrás que volver a ingresar para continuar.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="default"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => { logout(); setConfirmOpen(false); }}
            >
              Cerrar sesión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
