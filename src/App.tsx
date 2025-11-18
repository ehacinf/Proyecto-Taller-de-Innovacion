import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import AuthPage from "./AuthPage";
import { auth, db } from "./firebase";
import logoMark from "./assets/simpligest-mark.svg";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

/* -----------------------------------------------------------
   TIPOS
----------------------------------------------------------- */

type ActivePage = "inicio" | "dashboard" | "inventario";

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
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  // Escuchar cambios en Firestore (realtime)
  useEffect(() => {
    if (!user) {
      setProducts([]);
      setLoadingProducts(false);
      return;
    }

    setLoadingProducts(true);
    const q = query(collection(db, "products"), orderBy("nombre", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Product[] = snapshot.docs.map((docSnapshot) => {
        const d = docSnapshot.data() as Omit<Product, "id">;
        return {
          id: docSnapshot.id,
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
  }, [user]);

  async function handleAddProduct(product: Omit<Product, "id">) {
    await addDoc(collection(db, "products"), product);
  }

  async function handleUpdateProduct(
    id: string,
    product: Omit<Product, "id">
  ) {
    const productRef = doc(db, "products", id);
    await updateDoc(productRef, product);
  }

  async function handleDeleteProduct(id: string) {
    const productRef = doc(db, "products", id);
    await deleteDoc(productRef);
  }

  function handleOpenDemo() {
    setActivePage("dashboard");
  }

  async function handleSignOut() {
    try {
      await signOut(auth);
      setActivePage("dashboard");
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-softGray">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500">Cargando SimpliGest...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
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
            label="Inicio"
            active={activePage === "inicio"}
            onClick={() => setActivePage("inicio")}
          />
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
        <header className="h-16 bg-white flex flex-wrap gap-3 items-center justify-between px-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-primary">
              {activePage === "inicio"
                ? "Tu cockpit central"
                : activePage === "dashboard"
                ? "Dashboard General"
                : "Inventario"}
            </h2>
            <p className="text-xs text-gray-500">
              {activePage === "inicio"
                ? "Accede a resúmenes clave y sigue optimizando tu operación."
                : activePage === "dashboard"
                ? "Controla inventario, finanzas y ventas desde un solo lugar."
                : "Administra tus productos, stock y proveedores."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activePage === "inicio" ? (
              <>
                <button
                  onClick={handleOpenDemo}
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
                />
                <button className="text-sm bg-primaryLight text-white px-4 py-2 rounded-xl shadow-sm hover:opacity-90 transition">
                  + Venta rápida
                </button>
              </>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="text-right hidden sm:block">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">
                  Sesión activa
                </p>
                <p className="font-semibold text-primary">{user.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-softGray"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </header>

        {/* CONTENT AREA */}
        <main className="flex-1 p-6 space-y-6">
          {activePage === "inicio" ? (
            <HomePage onShowDemo={handleOpenDemo} />
          ) : activePage === "dashboard" ? (
            <Dashboard />
          ) : (
            <InventoryPage
              products={products}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              loading={loadingProducts}
            />
          )}
        </main>
      </div>
    </div>
  );
}

/* -----------------------------------------------------------
   HOME PAGE
----------------------------------------------------------- */

type HomePageProps = {
  onShowDemo: () => void;
};

function HomePage({ onShowDemo }: HomePageProps) {
  const quickStats = [
    {
      title: "Inventario sincronizado",
      description: "Conecta tus bodegas y sucursales en tiempo real.",
    },
    {
      title: "Finanzas claras",
      description: "Cruza compras, ventas y gastos automáticamente.",
    },
    {
      title: "Copiloto de IA",
      description: "Recibe alertas de stock crítico y márgenes negativos.",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-3xl shadow-sm p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">
            Bienvenido a SimpliGest
          </p>
          <h2 className="text-3xl font-semibold text-primary">
            Toda tu operación, alineada.
          </h2>
          <p className="text-sm text-gray-600">
            Visualiza ventas, inventario y tesorería desde un solo lugar. Usa el menú
            lateral para explorar módulos o salta directo al dashboard general.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onShowDemo}
              className="bg-primary text-white px-6 py-3 rounded-2xl text-sm font-semibold hover:opacity-90 transition"
            >
              Ir al dashboard
            </button>
            <button className="border border-gray-200 px-6 py-3 rounded-2xl text-sm text-gray-600 hover:bg-softGray">
              Ver historial de cambios
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-softGray rounded-2xl p-4">
            <p className="text-xs text-gray-500">Ventas hoy</p>
            <p className="text-2xl font-semibold text-primary">$ 452.300</p>
            <p className="text-[11px] text-green-600">+12% vs. ayer</p>
          </div>
          <div className="bg-softGray rounded-2xl p-4">
            <p className="text-xs text-gray-500">Productos con stock crítico</p>
            <p className="text-2xl font-semibold text-primary">7</p>
            <p className="text-[11px] text-gray-500">Revísalos en Inventario</p>
          </div>
          <div className="bg-softGray rounded-2xl p-4">
            <p className="text-xs text-gray-500">Tickets abiertos</p>
            <p className="text-2xl font-semibold text-primary">3</p>
            <p className="text-[11px] text-gray-500">Soporte responde en 2h</p>
          </div>
          <div className="bg-softGray rounded-2xl p-4">
            <p className="text-xs text-gray-500">Última sincronización</p>
            <p className="text-2xl font-semibold text-primary">Hace 5 min</p>
            <p className="text-[11px] text-gray-500">Todo funcionando ✅</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickStats.map((benefit) => (
          <BenefitCard key={benefit.title} {...benefit} />
        ))}
      </section>
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
  onUpdateProduct: (id: string, product: Omit<Product, "id">) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  loading: boolean;
};

function InventoryPage({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  loading,
}: InventoryPageProps) {
  const initialFormState = {
    nombre: "",
    categoria: "",
    proveedor: "",
    stock: "",
    costo: "",
  };

  const [formValues, setFormValues] = useState(initialFormState);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [stockFilter, setStockFilter] = useState("todos");

  useEffect(() => {
    if (editingProduct) {
      setFormValues({
        nombre: editingProduct.nombre,
        categoria: editingProduct.categoria,
        proveedor: editingProduct.proveedor,
        stock: editingProduct.stock.toString(),
        costo: editingProduct.costo.toString(),
      });
    } else {
      setFormValues(initialFormState);
    }
  }, [editingProduct]);

  const categories = Array.from(new Set(products.map((p) => p.categoria)));

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.nombre
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "todos" || p.categoria === categoryFilter;
    const matchesStock =
      stockFilter === "todos"
        ? true
        : stockFilter === "critico"
        ? p.stock > 0 && p.stock <= 5
        : p.stock === 0;

    return matchesSearch && matchesCategory && matchesStock;
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nombre = formValues.nombre.trim();
    const categoria = formValues.categoria.trim();
    const proveedor = formValues.proveedor.trim();
    const stock = Number(formValues.stock || 0);
    const costo = Number(formValues.costo || 0);

    if (!nombre) {
      alert("El nombre del producto es obligatorio.");
      return;
    }

    if (editingProduct) {
      await onUpdateProduct(editingProduct.id, {
        nombre,
        categoria,
        proveedor,
        stock,
        costo,
      });
      setEditingProduct(null);
    } else {
      await onAddProduct({
        nombre,
        categoria,
        proveedor,
        stock,
        costo,
      });
    }

    setFormValues(initialFormState);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* FORMULARIO */}
      <div className="bg-white rounded-2xl shadow-sm p-4 lg:col-span-1">
        <h3 className="font-semibold mb-1 text-primary">
          {editingProduct ? "Editar producto" : "Agregar producto"}
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          {editingProduct
            ? "Actualiza los datos del producto seleccionado."
            : "Registra un nuevo producto en tu inventario (guardado en la nube 🔐)."}
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
              value={formValues.nombre}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block mb-1 text-gray-600">Categoría</label>
            <input
              name="categoria"
              type="text"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primaryLight/80"
              placeholder="Ej: Alimentos, Bebidas..."
              value={formValues.categoria}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block mb-1 text-gray-600">Proveedor</label>
            <input
              name="proveedor"
              type="text"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primaryLight/80"
              placeholder="Ej: Distribuidora Sur"
              value={formValues.proveedor}
              onChange={handleChange}
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
                value={formValues.stock}
                onChange={handleChange}
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
                value={formValues.costo}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 mt-2 bg-success text-white py-2 rounded-xl text-xs font-semibold hover:opacity-90 transition"
            >
              {editingProduct ? "Actualizar producto" : "Guardar producto"}
            </button>
            {editingProduct && (
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 mt-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-softGray"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* TABLA DE PRODUCTOS */}
      <div className="bg-white rounded-2xl shadow-sm p-4 lg:col-span-2 overflow-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div>
            <h3 className="font-semibold mb-1 text-primary">
              Inventario completo
            </h3>
            <p className="text-xs text-gray-500">
              Control total de productos, stock y costos en tiempo real.
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-2 text-xs">
            <input
              type="text"
              placeholder="Buscar por nombre"
              className="px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primaryLight/80"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="px-3 py-2 rounded-xl border border-gray-200"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="todos">Todas las categorías</option>
              {categories.map((category) => (
                <option key={category || "sin-categoria"} value={category}>
                  {category || "Sin categoría"}
                </option>
              ))}
            </select>
            <select
              className="px-3 py-2 rounded-xl border border-gray-200"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
            >
              <option value="todos">Todo el stock</option>
              <option value="critico">Stock crítico (&lt;=5)</option>
              <option value="sin-stock">Sin stock</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-gray-500">Cargando productos...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-xs text-gray-500">
            {products.length === 0
              ? "Aún no hay productos. Agrega el primero con el formulario de la izquierda."
              : "No encontramos productos que coincidan con tu búsqueda."}
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
                <th className="py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="border-b last:border-b-0">
                  <td className="py-2">{p.nombre}</td>
                  <td className="py-2">{p.categoria || "-"}</td>
                  <td
                    className={`py-2 ${
                      p.stock > 0 && p.stock <= 5
                        ? "text-red-500 font-semibold"
                        : ""
                    }`}
                  >
                    {p.stock} uds
                  </td>
                  <td className="py-2">{p.proveedor || "-"}</td>
                  <td className="py-2 text-right">
                    $ {p.costo.toLocaleString("es-CL")}
                  </td>
                  <td className="py-2 text-right space-x-2">
                    <button
                      className="text-primaryLight hover:underline"
                      onClick={() => setEditingProduct(p)}
                    >
                      Editar
                    </button>
                    <button
                      className="text-red-500 hover:underline"
                      onClick={async () => {
                        const confirmDelete = window.confirm(
                          `¿Eliminar ${p.nombre}?`
                        );
                        if (confirmDelete) {
                          await onDeleteProduct(p.id);
                          if (editingProduct?.id === p.id) {
                            setEditingProduct(null);
                          }
                        }
                      }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
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

type BenefitCardProps = {
  title: string;
  description: string;
};

function BenefitCard({ title, description }: BenefitCardProps) {
  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
      <h4 className="text-base font-semibold text-primary mb-2">{title}</h4>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

export default App;
