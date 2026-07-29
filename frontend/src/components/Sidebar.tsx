import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Ediciones", to: "/admin/ediciones" },
];

export default function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside className="flex h-screen w-[240px] shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="px-4 py-4">
        <p className="text-sm font-semibold text-neutral-900">Nivalis</p>
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
      <div className="px-4 py-4">
        <button type="button" onClick={logout} className="text-sm text-neutral-600">
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
