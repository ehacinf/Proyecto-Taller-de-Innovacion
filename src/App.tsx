import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import logoMark from "./assets/simpligest-mark.svg";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

/* -----------------------------------------------------------
   TIPOS
----------------------------------------------------------- */

type ActivePage = "dashboard" | "inventario";

type Product = {
  id: string;
  nombre: string;
  categoria: string;
  stock: number;
  proveedor: string;
  costo: number;
};

/* -----------------------------------------------------------
   COMPONENTE PRINCIPAL
----------------------------------------------------------- */

function App() {
  const [activePage, setActivePage] = useState<ActivePage>("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Escuchar cambios en Firestore (realtime)
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("nombre", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Product[] = snapshot.docs.map((doc) => {
        const d = doc.data() as Omit<Product, "id">;
        return {
          id: doc.id,
          nombre: d.nombre,
          categoria: d.categoria,
          stock: d.stock,
          proveedor: d.proveedor,
          costo: d.costo,
        };
      });
      setProducts(data);
      setLoadingProducts(false);
    });

    // limpiar listener
    return () => unsubscribe();
  }, []);

  async function handleAddProduct(product: Omit<Product, "id">) {
    await addDoc(collection(db, "products"), product);
  }

  return (
    <div className="min-h-screen flex bg-softGray">
      {/* SIDEBAR */}
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
          <SidebarItem
            label="Dashboard"
            active={activePage === "dashboard"}
            onClick={() => setActivePage("dashboard")}
          />
          <SidebarItem
            label="Inventario"
            active={activePage === "inventario"}
            onClick={() => setActivePage("inventario")}
          />
          <SidebarItem label="Finanzas" />
          <SidebarItem label="Ventas (POS)" />
          <SidebarItem label="Panel de IA" />
          <SidebarItem label="Reportes" />
          <SidebarItem label="Usuarios & Roles" />
          <SidebarItem label="Configuración" />
        </nav>

        <div className="px-4 py-4 border-t border-white/10 text-xs text-primaryLight/90">
          <p>Ayuda y soporte</p>
          <p className="opacity-80">Chat interno · Tutoriales · Tooltips</p>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col">
        {/* TOP BAR */}
        <header className="h-16 bg-white flex items-center justify-between px-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-primary">
              {activePage === "dashboard" ? "Dashboard General" : "Inventario"}
            </h2>
            <p className="text-xs text-gray-500">
              {activePage === "dashboard"
                ? "Controla inventario, finanzas y ventas desde un solo lugar."
                : "Administra tus productos, stock y proveedores."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder='Buscar productos, facturas, "ventas de hoy"...'
              className="hidden md:block w-72 text-sm px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primaryLight/80"
            />
            <button className="text-sm bg-primaryLight text-white px-4 py-2 rounded-xl shadow-sm hover:opacity-90 transition">
              + Venta rápida
            </button>
          </div>
        </header>

        {/* CONTENT AREA */}
        <main className="flex-1 p-6 space-y-6">
          {activePage === "dashboard" ? (
            <Dashboard />
          ) : (
            <InventoryPage
              products={products}
              onAddProduct={handleAddProduct}
              loading={loadingProducts}
            />
          )}
        </main>
      </div>
    </div>
  );
}

/* -----------------------------------------------------------
   DASHBOARD
----------------------------------------------------------- */

function Dashboard() {
  return (
    <>
      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Stock total"
          value="3.482"
          subtitle="Productos en inventario"
        />
        <KpiCard
          title="Ventas de hoy"
          value="$ 452.300"
          subtitle="Resumen día actual"
        />
        <KpiCard
          title="Flujo de caja"
          value="+ $ 1.230.000"
          subtitle="Últimos 30 días"
          positive
        />
        <KpiCard
          title="Alertas"
          value="7"
          subtitle="Stock crítico / cuentas por pagar"
        />
      </section>

      {/* MAIN PANELS */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Inventario resumen (estático) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-semibold mb-1 text-primary">Inventario</h3>
          <p className="text-xs text-gray-500 mb-3">
            Productos con stock crítico y movimientos recientes.
          </p>

          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">Producto</th>
                <th className="py-2">Categoría</th>
                <th className="py-2">Stock</th>
                <th className="py-2">Proveedor</th>
                <th className="py-2 text-right">Costo</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              <TableRow
                producto="Pan de molde 1kg"
                categoria="Alimentos"
                stock="5 uds"
                proveedor="Proveedor Los Andes"
                costo="$ 1.200"
                stockCritico
              />
              <TableRow
                producto="Bebida cola 1.5L"
                categoria="Bebidas"
                stock="32 uds"
                proveedor="Distribuidora Sur"
                costo="$ 890"
              />
              <TableRow
                producto="Cerveza lata 350cc"
                categoria="Alcohol"
                stock="120 uds"
                proveedor="Cervecería Norte"
                costo="$ 650"
              />
            </tbody>
          </table>

          <div className="mt-3 text-right">
            <button className="text-xs text-primaryLight hover:underline">
              Ver inventario completo →
            </button>
          </div>
        </div>

        {/* Panel IA */}
        <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col">
          <h3 className="font-semibold mb-1 text-primary">Asistente IA</h3>
          <p className="text-xs text-gray-500 mb-3">
            Recomendaciones inteligentes para tu negocio.
          </p>

          <ul className="text-xs space-y-2 flex-1">
            <li className="bg-softGray rounded-xl px-3 py-2">
              ✅ Compra más <strong>pan de molde</strong>: tu stock se agota en
              2 días al ritmo actual.
            </li>
            <li className="bg-softGray rounded-xl px-3 py-2">
              ⚠️ Evita sobrestock de <strong>bebidas cola</strong>: tienes
              inventario para 45 días.
            </li>
            <li className="bg-softGray rounded-xl px-3 py-2">
              🧾 Tu mejor proveedor este mes:{" "}
              <strong>Distribuidora Sur</strong> (mejor margen promedio).
            </li>
          </ul>

          <button className="mt-3 text-xs w-full bg-primary text-white py-2 rounded-xl hover:opacity-90 transition">
            Ver predicciones de demanda
          </button>
        </div>
      </section>
    </>
  );
}

/* -----------------------------------------------------------
   PÁGINA DE INVENTARIO
----------------------------------------------------------- */

type InventoryPageProps = {
  products: Product[];
  onAddProduct: (product: Omit<Product, "id">) => Promise<void>;
  loading: boolean;
};

function InventoryPage({ products, onAddProduct, loading }: InventoryPageProps) {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const nombre = (formData.get("nombre") as string) || "";
    const categoria = (formData.get("categoria") as string) || "";
    const proveedor = (formData.get("proveedor") as string) || "";
    const stock = Number(formData.get("stock") || 0);
    const costo = Number(formData.get("costo") || 0);

    if (!nombre.trim()) {
      alert("El nombre del producto es obligatorio.");
      return;
    }

    await onAddProduct({
      nombre,
      categoria,
      proveedor,
      stock,
      costo,
    });

    form.reset();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* FORMULARIO */}
      <div className="bg-white rounded-2xl shadow-sm p-4 lg:col-span-1">
        <h3 className="font-semibold mb-1 text-primary">Agregar producto</h3>
        <p className="text-xs text-gray-500 mb-3">
          Registra un nuevo producto en tu inventario (guardado en la nube 🔐).
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block mb-1 text-gray-600">Nombre *</label>
            <input
              name="nombre"
              type="text"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primaryLight/80"
              placeholder="Ej: Pan de molde 1kg"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-gray-600">Categoría</label>
            <input
              name="categoria"
              type="text"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primaryLight/80"
              placeholder="Ej: Alimentos, Bebidas..."
            />
          </div>

          <div>
            <label className="block mb-1 text-gray-600">Proveedor</label>
            <input
              name="proveedor"
              type="text"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primaryLight/80"
              placeholder="Ej: Distribuidora Sur"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-gray-600">Stock</label>
              <input
                name="stock"
                type="number"
                min={0}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primaryLight/80"
                placeholder="Ej: 10"
              />
            </div>

            <div>
              <label className="block mb-1 text-gray-600">Costo (CLP)</label>
              <input
                name="costo"
                type="number"
                min={0}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primaryLight/80"
                placeholder="Ej: 1200"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 bg-success text-white py-2 rounded-xl text-xs font-semibold hover:opacity-90 transition"
          >
            Guardar producto
          </button>
        </form>
      </div>

      {/* TABLA DE PRODUCTOS */}
      <div className="bg-white rounded-2xl shadow-sm p-4 lg:col-span-2 overflow-auto">
        <h3 className="font-semibold mb-1 text-primary">
          Listado de productos
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Vista general del inventario actual.
        </p>

        {loading ? (
          <p className="text-xs text-gray-500">Cargando productos...</p>
        ) : products.length === 0 ? (
          <p className="text-xs text-gray-500">
            Aún no hay productos. Agrega el primero con el formulario de la
            izquierda.
          </p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">Producto</th>
                <th className="py-2">Categoría</th>
                <th className="py-2">Stock</th>
                <th className="py-2">Proveedor</th>
                <th className="py-2 text-right">Costo</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {products.map((p) => (
                <TableRow
                  key={p.id}
                  producto={p.nombre}
                  categoria={p.categoria}
                  stock={`${p.stock} uds`}
                  proveedor={p.proveedor}
                  costo={`$ ${p.costo.toLocaleString("es-CL")}`}
                  stockCritico={p.stock > 0 && p.stock <= 5}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* -----------------------------------------------------------
   COMPONENTES REUTILIZABLES
----------------------------------------------------------- */

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
        active
          ? "bg-white text-primary font-semibold"
          : "text-white/90 hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}

type KpiCardProps = {
  title: string;
  value: string;
  subtitle: string;
  positive?: boolean;
};

function KpiCard({ title, value, subtitle, positive }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-1">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-xl font-semibold text-primary">{value}</p>
      <p className="text-[11px] text-gray-500">{subtitle}</p>

      {positive !== undefined && (
        <span
          className={`mt-1 inline-block text-[11px] px-2 py-1 rounded-full ${
            positive
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {positive ? "Tendencia positiva" : "Tendencia negativa"}
        </span>
      )}
    </div>
  );
}

type TableRowProps = {
  producto: string;
  categoria: string;
  stock: string;
  proveedor: string;
  costo: string;
  stockCritico?: boolean;
};

function TableRow({
  producto,
  categoria,
  stock,
  proveedor,
  costo,
  stockCritico,
}: TableRowProps) {
  return (
    <tr className="border-b last:border-b-0">
      <td className="py-2">{producto}</td>
      <td className="py-2">{categoria || "-"}</td>
      <td className={`py-2 ${stockCritico ? "text-red-500 font-semibold" : ""}`}>
        {stock}
      </td>
      <td className="py-2">{proveedor || "-"}</td>
      <td className="py-2 text-right">{costo}</td>
    </tr>
  );
}

export default App;
