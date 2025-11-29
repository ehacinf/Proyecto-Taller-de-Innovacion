import { useMemo, useState } from "react";
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
  allowedPages?: Set<ActivePage>;
  canCreateSale?: boolean;
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
  reportes: {
    title: "Reportes Automáticos",
    subtitle: "Genera informes personalizables y exportables en segundos.",
  },
  configuracion: {
    title: "Configuración",
    subtitle: "Personaliza tu negocio y preferencias del sistema.",
  },
};

const menuItems: { label: string; page?: ActivePage }[] = [
  { label: "Inicio", page: "inicio" },
  { label: "Dashboard", page: "dashboard" },
  { label: "Inventario", page: "inventario" },
  { label: "Finanzas", page: "finanzas" },
  { label: "Ventas (POS)" },
  { label: "Panel de IA" },
  { label: "Reportes automáticos", page: "reportes" },
  { label: "Usuarios & Roles" },
  { label: "Configuración", page: "configuracion" },
];

const MainLayout = ({
  activePage,
  onChangePage,
  onOpenQuickSale,
  onSignOut,
  userEmail,
  searchTerm,
  onSearchTermChange,
  allowedPages,
  canCreateSale = true,
  children,
}: MainLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { title, subtitle } = pageDescriptions[activePage];
  const pageSet = useMemo(
    () => allowedPages ?? new Set<ActivePage>(["inicio", "dashboard", "inventario", "finanzas", "reportes", "configuracion"]),
    [allowedPages]
  );
  const filteredMenu = useMemo(
    () => menuItems.filter((item) => (item.page ? pageSet.has(item.page) : true)),
    [pageSet]
  );

  const handleChangePage = (page: ActivePage) => {
    onChangePage(page);
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-softGray">
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-primary text-white flex flex-col transform transition-transform duration-200 md:static md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        role="navigation"
        aria-label="Menú principal"
      >
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
          {filteredMenu.map((item) => (
            <SidebarItem
              key={item.label}
              label={item.label}
              active={item.page ? activePage === item.page : false}
              onClick={() => {
                if (item.page) {
                  handleChangePage(item.page);
                }
              }}
            />
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/10 text-xs text-primaryLight/90">
          <p>Ayuda y soporte</p>
          <p className="opacity-80">Chat interno · Tutoriales · Tooltips</p>
        </div>
      </div>

      {isSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-20 md:hidden"
          aria-label="Cerrar menú"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-auto bg-white flex flex-wrap gap-3 items-center justify-between px-4 md:px-6 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex md:hidden items-center justify-center w-10 h-10 rounded-xl border border-gray-200 text-gray-600 hover:bg-softGray"
              aria-label="Abrir menú"
              onClick={() => setIsSidebarOpen(true)}
            >
              <span className="sr-only">Abrir menú</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-5 h-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h2 className="text-lg font-semibold text-primary">{title}</h2>
              <p className="text-xs text-gray-500">{subtitle}</p>
            </div>
          </div>

          <div className="flex-1 flex flex-wrap gap-3 items-center justify-end min-w-0">
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
                <div className="flex-1 min-w-[200px] max-w-lg order-2 md:order-1">
                  <input
                    type="text"
                    placeholder='Buscar productos, facturas, "ventas de hoy"...'
                    className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primaryLight/80"
                    value={searchTerm}
                    onChange={(event) => onSearchTermChange(event.target.value)}
                  />
                </div>
                <button
                  onClick={onOpenQuickSale}
                  disabled={!canCreateSale}
                  className="text-sm bg-primaryLight text-white px-4 py-2 rounded-xl shadow-sm hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + Venta rápida
                </button>
              </>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-500 order-3">
              <div className="text-right hidden sm:block truncate">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">
                  Sesión activa
                </p>
                <p className="font-semibold text-primary truncate">{userEmail}</p>
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

        <main className="flex-1 p-4 md:p-6 space-y-6 min-w-0">{children}</main>
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
