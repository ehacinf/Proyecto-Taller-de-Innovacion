import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import AuthPage from "./AuthPage";
import { auth, db } from "./firebase";
import MainLayout from "./components/Layout/MainLayout";
import Dashboard from "./components/Dashboard/Dashboard";
import InventoryPage from "./components/Inventory/InventoryPage";
import QuickSaleModal from "./components/Sales/QuickSaleModal";
import FinancePage from "./components/Finance/FinancePage";
import type {
  ActivePage,
  Product,
  ProductPayload,
  QuickSalePayload,
  Sale,
  Transaction,
  TransactionPayload,
} from "./types";

function App() {
  const [activePage, setActivePage] = useState<ActivePage>("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingSales, setLoadingSales] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [quickSaleOpen, setQuickSaleOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [financeError, setFinanceError] = useState<string | null>(null);
  const [saleError, setSaleError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setProducts([]);
      setLoadingProducts(false);
      return;
    }

    setLoadingProducts(true);
    const q = query(collection(db, "products"), orderBy("nombre", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const nextProducts: Product[] = snapshot.docs.map((docSnapshot) => {
          const raw = docSnapshot.data() as Record<string, any>;
          const createdAt = raw.createdAt
            ? raw.createdAt instanceof Timestamp
              ? raw.createdAt.toDate()
              : new Date(raw.createdAt)
            : null;

          return {
            id: docSnapshot.id,
            name: raw.name ?? raw.nombre ?? "Producto sin nombre",
            category: raw.category ?? raw.categoria ?? "",
            stock: Number(raw.stock ?? 0),
            stockMin: Number(raw.stockMin ?? raw.stock_min ?? 0),
            purchasePrice: Number(raw.purchasePrice ?? raw.costo ?? 0),
            salePrice: Number(raw.salePrice ?? raw.precioVenta ?? raw.costo ?? 0),
            supplier: raw.supplier ?? raw.proveedor ?? "",
            createdAt,
          };
        });

        setProducts(nextProducts);
        setInventoryError(null);
        setLoadingProducts(false);
      },
      (error) => {
        console.error("Error cargando productos", error);
        setInventoryError("No pudimos cargar el inventario. Reintenta en unos segundos.");
        setLoadingProducts(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSales([]);
      setLoadingSales(false);
      return;
    }

    setLoadingSales(true);
    const salesQuery = query(collection(db, "sales"), orderBy("date", "desc"));

    const unsubscribe = onSnapshot(
      salesQuery,
      (snapshot) => {
        const nextSales: Sale[] = snapshot.docs.map((docSnapshot) => {
          const raw = docSnapshot.data() as Record<string, any>;
          const dateValue = raw.date
            ? raw.date instanceof Timestamp
              ? raw.date.toDate()
              : new Date(raw.date)
            : new Date();

          return {
            id: docSnapshot.id,
            productId: raw.productId ?? "",
            productName: raw.productName ?? "Venta",
            quantity: Number(raw.quantity ?? 0),
            unitPrice: Number(raw.unitPrice ?? raw.salePrice ?? 0),
            total: Number(raw.total ?? 0),
            date: dateValue,
          };
        });

        setSales(nextSales);
        setLoadingSales(false);
      },
      (error) => {
        console.error("Error cargando ventas", error);
        setLoadingSales(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setLoadingTransactions(false);
      return;
    }

    setLoadingTransactions(true);
    const transactionsQuery = query(
      collection(db, "transactions"),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(
      transactionsQuery,
      (snapshot) => {
        const nextTransactions: Transaction[] = snapshot.docs.map((docSnapshot) => {
          const raw = docSnapshot.data() as Record<string, any>;
          const dateValue = raw.date
            ? raw.date instanceof Timestamp
              ? raw.date.toDate()
              : new Date(raw.date)
            : new Date();

          return {
            id: docSnapshot.id,
            type: raw.type === "expense" ? "expense" : "income",
            amount: Number(raw.amount ?? 0),
            description: raw.description ?? "Movimiento",
            category: raw.category ?? "General",
            date: dateValue,
          };
        });

        setTransactions(nextTransactions);
        setFinanceError(null);
        setLoadingTransactions(false);
      },
      (error) => {
        console.error("Error cargando transacciones", error);
        setFinanceError("No pudimos cargar tus finanzas.");
        setLoadingTransactions(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  async function handleAddProduct(payload: ProductPayload) {
    const createdAtValue = payload.createdAt
      ? Timestamp.fromDate(payload.createdAt)
      : serverTimestamp();

    await addDoc(collection(db, "products"), {
      name: payload.name,
      nombre: payload.name,
      category: payload.category,
      categoria: payload.category,
      stock: payload.stock,
      stockMin: payload.stockMin,
      purchasePrice: payload.purchasePrice,
      salePrice: payload.salePrice,
      supplier: payload.supplier,
      proveedor: payload.supplier,
      createdAt: createdAtValue,
    });
  }

  async function handleUpdateProduct(id: string, payload: ProductPayload) {
    const productRef = doc(db, "products", id);
    await updateDoc(productRef, {
      name: payload.name,
      nombre: payload.name,
      category: payload.category,
      categoria: payload.category,
      stock: payload.stock,
      stockMin: payload.stockMin,
      purchasePrice: payload.purchasePrice,
      salePrice: payload.salePrice,
      supplier: payload.supplier,
      proveedor: payload.supplier,
    });
  }

  async function handleDeleteProduct(id: string) {
    const productRef = doc(db, "products", id);
    await deleteDoc(productRef);
  }

  async function handleQuickSale(payload: QuickSalePayload) {
    setSaleError(null);
    const product = products.find((p) => p.id === payload.productId);

    if (!product) {
      throw new Error("Producto no encontrado");
    }

    if (payload.quantity <= 0) {
      throw new Error("Ingresa una cantidad válida");
    }

    if (product.stock < payload.quantity) {
      throw new Error("Stock insuficiente para esta venta");
    }

    const total = payload.quantity * payload.unitPrice;

    await addDoc(collection(db, "sales"), {
      productId: product.id,
      productName: product.name,
      quantity: payload.quantity,
      unitPrice: payload.unitPrice,
      total,
      date: serverTimestamp(),
    });

    const productRef = doc(db, "products", product.id);
    await updateDoc(productRef, {
      stock: product.stock - payload.quantity,
    });
  }

  async function handleAddTransaction(payload: TransactionPayload) {
    const dateValue = payload.date
      ? Timestamp.fromDate(payload.date)
      : serverTimestamp();

    await addDoc(collection(db, "transactions"), {
      type: payload.type,
      amount: payload.amount,
      description: payload.description,
      category: payload.category,
      date: dateValue,
    });
  }

  const lastFiveSales = useMemo(() => sales.slice(0, 5), [sales]);

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
    <>
      <MainLayout
        activePage={activePage}
        onChangePage={setActivePage}
        onOpenQuickSale={() => setQuickSaleOpen(true)}
        onSignOut={handleSignOut}
        userEmail={user.email || ""}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
      >
        {activePage === "inicio" && <HomePage onShowDemo={() => setActivePage("dashboard")} />}
        {activePage === "dashboard" && (
          <Dashboard
            products={products}
            sales={sales}
            loadingProducts={loadingProducts}
            loadingSales={loadingSales}
            latestSales={lastFiveSales}
          />
        )}
        {activePage === "inventario" && (
          <InventoryPage
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            loading={loadingProducts}
            searchTerm={searchTerm}
            errorMessage={inventoryError}
          />
        )}
        {activePage === "finanzas" && (
          <FinancePage
            sales={sales}
            transactions={transactions}
            loadingSales={loadingSales}
            loadingTransactions={loadingTransactions}
            onAddTransaction={handleAddTransaction}
            errorMessage={financeError}
          />
        )}
      </MainLayout>

      <QuickSaleModal
        open={quickSaleOpen}
        products={products}
        onClose={() => setQuickSaleOpen(false)}
        onSubmit={async (values) => {
          try {
            await handleQuickSale(values);
            setQuickSaleOpen(false);
          } catch (error: any) {
            setSaleError(error?.message || "No pudimos registrar la venta");
            throw error;
          }
        }}
        errorMessage={saleError}
      />
    </>
  );
}

export default App;

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

type BenefitCardProps = {
  title: string;
  description: string;
};

function BenefitCard({ title, description }: BenefitCardProps) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.3em] text-primaryLight">
        BENEFICIO
      </p>
      <h3 className="text-lg font-semibold text-primary">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
