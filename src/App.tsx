import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import AuthPage from "./AuthPage";
import { auth, db } from "./firebase";
import MainLayout from "./components/Layout/MainLayout";
import Dashboard from "./components/Dashboard/Dashboard";
import InventoryPage from "./components/Inventory/InventoryPage";
import QuickSaleModal from "./components/Sales/QuickSaleModal";
import FinancePage from "./components/Finance/FinancePage";
import SettingsPage from "./components/Settings/SettingsPage";
import ReportsPage from "./components/Reports/ReportsPage";
import type {
  ActivePage,
  BusinessSettings,
  Product,
  ProductPayload,
  QuickSalePayload,
  Sale,
  Transaction,
  TransactionPayload,
  ProductInsight,
} from "./types";
import { calculateProductInsights } from "./utils/insights";

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
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<string | null>(null);

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
    const q = query(collection(db, "products"), where("userId", "==", user.uid));

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
            unit: raw.unit ?? raw.unidad ?? undefined,
            purchasePrice: Number(raw.purchasePrice ?? raw.costo ?? 0),
            salePrice: Number(raw.salePrice ?? raw.precioVenta ?? raw.costo ?? 0),
            supplier: raw.supplier ?? raw.proveedor ?? "",
            createdAt,
            userId: raw.userId,
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
      setSettings(null);
      setSettingsLoading(false);
      setSettingsError(null);
      setSettingsFeedback(null);
      setSettingsSaving(false);
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

  useEffect(() => {
    if (!user) {
      return;
    }

    const currentUser = user;
    setSettingsLoading(true);
    const settingsRef = doc(db, "settings", currentUser.uid);
    let unsubscribe: (() => void) | null = null;

    async function bootstrapSettings() {
      try {
        const existing = await getDoc(settingsRef);
        if (!existing.exists()) {
          await setDoc(
            settingsRef,
            buildDefaultSettingsDoc(currentUser.email || "", currentUser.uid)
          );
        }

        unsubscribe = onSnapshot(
          settingsRef,
          (docSnapshot) => {
            const data = docSnapshot.data();
            setSettings(normalizeSettings(data, currentUser.email || ""));
            setSettingsLoading(false);
            setSettingsError(null);
          },
          (error) => {
            console.error("Error cargando configuración", error);
            setSettingsError("No pudimos cargar tu configuración.");
            setSettingsLoading(false);
          }
        );
      } catch (error) {
        console.error("Error preparando configuración", error);
        setSettingsError("No pudimos cargar tu configuración.");
        setSettingsLoading(false);
      }
    }

    bootstrapSettings();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  useEffect(() => {
    const theme = settings?.uiTheme ?? "light";
    document.body.classList.toggle("theme-dark", theme === "dark");
  }, [settings?.uiTheme]);

  useEffect(() => {
    document.body.classList.toggle("text-large", settings?.uiFontSize === "large");
  }, [settings?.uiFontSize]);

  async function handleAddProduct(payload: ProductPayload) {
    if (!user) {
      throw new Error("Usuario no autenticado");
    }
    const createdAtValue = payload.createdAt
      ? Timestamp.fromDate(payload.createdAt)
      : serverTimestamp();
    const unitToSave = payload.unit || settings?.defaultUnit || "unidades";

    await addDoc(collection(db, "products"), {
      name: payload.name,
      nombre: payload.name,
      category: payload.category,
      categoria: payload.category,
      stock: payload.stock,
      stockMin: payload.stockMin,
      unit: unitToSave,
      purchasePrice: payload.purchasePrice,
      salePrice: payload.salePrice,
      supplier: payload.supplier,
      proveedor: payload.supplier,
      createdAt: createdAtValue,
      userId: user.uid,
    });
  }

  async function handleUpdateProduct(id: string, payload: ProductPayload) {
    if (!user) {
      throw new Error("Usuario no autenticado");
    }
    const productRef = doc(db, "products", id);
    const unitToSave = payload.unit || settings?.defaultUnit || "unidades";
    await updateDoc(productRef, {
      name: payload.name,
      nombre: payload.name,
      category: payload.category,
      categoria: payload.category,
      stock: payload.stock,
      stockMin: payload.stockMin,
      unit: unitToSave,
      purchasePrice: payload.purchasePrice,
      salePrice: payload.salePrice,
      supplier: payload.supplier,
      proveedor: payload.supplier,
      userId: user.uid,
    });
  }

  async function handleDeleteProduct(id: string) {
    if (!user) {
      throw new Error("Usuario no autenticado");
    }
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

    if (!settings?.allowNegativeStock && product.stock < payload.quantity) {
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

  async function handleSaveSettings(payload: Partial<BusinessSettings>) {
    if (!user) {
      return;
    }
    setSettingsSaving(true);
    setSettingsError(null);
    try {
      const settingsRef = doc(db, "settings", user.uid);
      await updateDoc(settingsRef, {
        ...payload,
        categories: payload.categories ?? settings?.categories ?? [],
        updatedAt: serverTimestamp(),
      });
      setSettingsFeedback("Configuración guardada correctamente");
      setTimeout(() => setSettingsFeedback(null), 4000);
    } catch (error) {
      console.error("Error guardando configuración", error);
      setSettingsError("No pudimos guardar tu configuración. Intenta nuevamente.");
    } finally {
      setSettingsSaving(false);
    }
  }

  const lastFiveSales = useMemo(() => sales.slice(0, 5), [sales]);
  const productInsights = useMemo<ProductInsight[]>(
    () => calculateProductInsights(products, sales),
    [products, sales]
  );

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
            insights={productInsights}
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
            defaultStockMin={settings?.defaultStockMin}
            defaultUnit={settings?.defaultUnit}
            currency={settings?.currency}
            productInsights={productInsights}
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
            defaultTaxRate={settings?.defaultTaxRate}
            currency={settings?.currency}
          />
        )}
        {activePage === "reportes" && (
          <ReportsPage
            products={products}
            sales={sales}
            loadingProducts={loadingProducts}
            loadingSales={loadingSales}
            currency={settings?.currency}
          />
        )}
        {activePage === "configuracion" && (
          <SettingsPage
            settings={settings}
            loading={settingsLoading}
            saving={settingsSaving}
            onSave={handleSaveSettings}
            feedbackMessage={settingsFeedback}
            errorMessage={settingsError}
            userEmail={user.email || ""}
            onSignOut={handleSignOut}
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
        allowPriceOverride={settings?.allowCustomPriceOnSale ?? true}
      />
    </>
  );
}

export default App;

function buildDefaultSettingsDoc(email: string, userId: string) {
  return {
    businessName: "",
    businessType: "",
    taxId: "",
    address: "",
    city: "",
    country: "",
    phone: "",
    contactEmail: email,
    defaultStockMin: 0,
    defaultUnit: "unidades",
    categories: [],
    defaultTaxRate: 19,
    currency: "CLP",
    allowNegativeStock: false,
    allowCustomPriceOnSale: true,
    alertStockEnabled: false,
    alertLevel: "normal",
    alertEmail: email,
    uiTheme: "light",
    uiFontSize: "normal",
    planName: "Beta gratuita – sin costo",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    userId,
  };
}

function normalizeSettings(
  data: Record<string, any> | undefined,
  fallbackEmail: string
): BusinessSettings {
  const createdAtValue = data?.createdAt
    ? data.createdAt instanceof Timestamp
      ? data.createdAt.toDate()
      : new Date(data.createdAt)
    : null;
  const updatedAtValue = data?.updatedAt
    ? data.updatedAt instanceof Timestamp
      ? data.updatedAt.toDate()
      : new Date(data.updatedAt)
    : null;
  const categories: string[] = Array.isArray(data?.categories)
    ? (data?.categories as unknown[]).filter((item): item is string => typeof item === "string")
    : [];
  const alertLevelRaw = data?.alertLevel;
  const normalizedAlertLevel: BusinessSettings["alertLevel"] =
    alertLevelRaw === "estricto" || alertLevelRaw === "relajado"
      ? alertLevelRaw
      : "normal";
  const theme: BusinessSettings["uiTheme"] = data?.uiTheme === "dark" ? "dark" : "light";
  const fontSize: BusinessSettings["uiFontSize"] =
    data?.uiFontSize === "large" ? "large" : "normal";
  const contactEmail = data?.contactEmail ?? fallbackEmail;
  const alertEmail = data?.alertEmail ?? contactEmail;

  return {
    businessName: data?.businessName ?? "",
    businessType: data?.businessType ?? "",
    taxId: data?.taxId ?? "",
    address: data?.address ?? "",
    city: data?.city ?? "",
    country: data?.country ?? "",
    phone: data?.phone ?? "",
    contactEmail,
    defaultStockMin: Number(data?.defaultStockMin ?? 0),
    defaultUnit: data?.defaultUnit ?? "unidades",
    categories,
    defaultTaxRate: Number(data?.defaultTaxRate ?? 19),
    currency: data?.currency ?? "CLP",
    allowNegativeStock: Boolean(data?.allowNegativeStock),
    allowCustomPriceOnSale:
      data?.allowCustomPriceOnSale === undefined ? true : Boolean(data.allowCustomPriceOnSale),
    alertStockEnabled: Boolean(data?.alertStockEnabled),
    alertLevel: normalizedAlertLevel,
    alertEmail,
    uiTheme: theme,
    uiFontSize: fontSize,
    planName: data?.planName ?? "Beta gratuita – sin costo",
    createdAt: createdAtValue,
    updatedAt: updatedAtValue,
  };
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
