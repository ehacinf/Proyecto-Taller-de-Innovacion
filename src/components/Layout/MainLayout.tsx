import type { ReactNode } from "react";
import logoMark from "../../assets/simpligest-mark.svg";
import type { ActivePage } from "../../types";

type MainLayoutProps = {
  activePage: ActivePage;
  onChangePage: (page: ActivePage) => void;
  onOpenQuickSale: () => void;
  onSignOut: () => void;
  userEmail: string;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  children: ReactNode;
};

const pageDescriptions: Record<ActivePage, { title: string; subtitle: string }> = {
  inicio: {
    title: "Tu cockpit central",
    subtitle: "Accede a resúmenes clave y sigue optimizando tu operación.",
  },
  dashboard: {
    title: "Dashboard General",
    subtitle: "Controla inventario, finanzas y ventas desde un solo lugar.",
  },
  inventario: {
    title: "Inventario",
    subtitle: "Administra tus productos, stock y proveedores.",
  },
  finanzas: {
    title: "Finanzas",
    subtitle: "Revisa ingresos, egresos y el saldo disponible en caja.",
  },
};

const menuItems: { label: string; page?: ActivePage }[] = [
  { label: "Inicio", page: "inicio" },
  { label: "Dashboard", page: "dashboard" },
  { label: "Inventario", page: "inventario" },
  { label: "Finanzas", page: "finanzas" },
  { label: "Ventas (POS)" },
  { label: "Panel de IA" },
  { label: "Reportes" },
  { label: "Usuarios & Roles" },
  { label: "Configuración" },
];

const MainLayout = ({
  activePage,
  onChangePage,
  onOpenQuickSale,
  onSignOut,
  userEmail,
  searchTerm,
  onSearchTermChange,
  children,
}: MainLayoutProps) => {
  const { title, subtitle } = pageDescriptions[activePage];

  return (
    <div className="min-h-screen flex bg-softGray">
      <aside className="w-64 bg-primary text-white flex flex-col">
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img
              src={logoMark}
              alt="Logotipo de SimpliGest"
              className="w-12 h-12 rounded-2xl shadow-lg shadow-primary/40"
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">SimpliGest</h1>
              <p className="text-sm text-primaryLight/90">
                Simple como Excel, potente como un ERP.
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 text-sm">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.label}
              label={item.label}
              active={item.page ? activePage === item.page : false}
              onClick={() => {
                if (item.page) {
                  onChangePage(item.page);
                }
              }}
            />
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/10 text-xs text-primaryLight/90">
          <p>Ayuda y soporte</p>
          <p className="opacity-80">Chat interno · Tutoriales · Tooltips</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-white flex flex-wrap gap-3 items-center justify-between px-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-primary">{title}</h2>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>

          <div className="flex items-center gap-3">
            {activePage === "inicio" ? (
              <>
                <button
                  onClick={() => onChangePage("dashboard")}
                  className="hidden md:inline-flex items-center gap-2 text-sm px-4 py-2 rounded-xl border border-primary/20 text-primary hover:bg-primary/5 transition"
                >
                  Ver demo interactiva
                </button>
                <button className="text-sm bg-primaryLight text-white px-4 py-2 rounded-xl shadow-sm hover:opacity-90 transition">
                  Hablar con un asesor
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  placeholder='Buscar productos, facturas, "ventas de hoy"...'
                  className="hidden md:block w-72 text-sm px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primaryLight/80"
                  value={searchTerm}
                  onChange={(event) => onSearchTermChange(event.target.value)}
                />
                <button
                  onClick={onOpenQuickSale}
                  className="text-sm bg-primaryLight text-white px-4 py-2 rounded-xl shadow-sm hover:opacity-90 transition"
                >
                  + Venta rápida
                </button>
              </>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="text-right hidden sm:block">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">
                  Sesión activa
                </p>
                <p className="font-semibold text-primary">{userEmail}</p>
              </div>
              <button
                onClick={onSignOut}
                className="text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-softGray"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 space-y-6">{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;

type SidebarItemProps = {
  label: string;
  active?: boolean;
  onClick?: () => void;
};

function SidebarItem({ label, active, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-xl transition text-sm ${
        active ? "bg-white text-primary font-semibold" : "text-white/90 hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}
