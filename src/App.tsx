import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
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
  DashboardMetric,
  DashboardViewType,
  DashboardWidgetConfig,
  InvoiceRecord,
  PermissionSet,
  RoleKey,
  UserProfile,
  UserRoleAssignment,
} from "./types";
import { getDefaultDashboardLayout } from "./utils/dashboard";
import { calculateProductInsights } from "./utils/insights";
import {
  isSameDay,
  sendDailySalesSummary,
  sendLowStockAlert,
  shouldSendDailySummary,
} from "./utils/notifications";
import {
  getAllowedPagesFromPermissions,
  mergePermissions,
  ROLE_DEFINITIONS,
} from "./utils/permissions";

type FirestoreUserData = {
  nombre?: string;
  negocio?: string;
  tamano?: string;
  email?: string;
};

type FirestoreRoleData = {
  role?: RoleKey;
  permissions?: Partial<PermissionSet>;
  assignedBy?: string;
  updatedAt?: Timestamp | Date | string | number | null;
};

type FirestoreProductData = {
  name?: string;
  nombre?: string;
  category?: string;
  categoria?: string;
  stock?: number | string;
  stockMin?: number | string;
  stock_min?: number | string;
  unit?: string;
  unidad?: string;
  purchasePrice?: number | string;
  costo?: number | string;
  salePrice?: number | string;
  precioVenta?: number | string;
  supplier?: string;
  proveedor?: string;
  createdAt?: Timestamp | Date | string | number | null;
  userId?: string;
};

type FirestoreSaleData = {
  productId?: string;
  productName?: string;
  quantity?: number | string;
  unitPrice?: number | string;
  salePrice?: number | string;
  total?: number | string;
  date?: Timestamp | Date | string | number | null;
};

type FirestoreTransactionData = {
  type?: string;
  amount?: number | string;
  description?: string;
  category?: string;
  date?: Timestamp | Date | string | number | null;
};

type RawDashboardLayoutItem = Partial<{
  metric: DashboardMetric | string;
  view: DashboardViewType | string;
  width: number;
  id: string;
  title?: string;
}>;

type RawSettingsDoc = Partial<{
  businessName: string;
  businessType: string;
  taxId: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  contactEmail: string;
  defaultStockMin: number | string;
  defaultUnit: string;
  categories: unknown[];
  defaultTaxRate: number | string;
  currency: string;
  allowNegativeStock: boolean;
  allowCustomPriceOnSale: boolean;
  alertStockEnabled: boolean;
  alertLevel: string;
  alertEmail: string;
  whatsappEnabled: boolean;
  whatsappNumber: string;
  whatsappFrom: string;
  whatsappProvider: string;
  whatsappDailySummaryEnabled: boolean;
  whatsappDailySummaryTime: string;
  siiEnabled: boolean;
  siiEnvironment: string;
  siiApiUrl: string;
  siiApiKey: string;
  siiResolutionNumber: string;
  siiOffice: string;
  uiTheme: string;
  uiFontSize: string;
  planName: string;
  createdAt: Timestamp | Date | string | number | null;
  updatedAt: Timestamp | Date | string | number | null;
  userId: string;
}>;

function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

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

  return <MainApp user={user} />;
}

function MainApp({ user }: { user: User }) {
  const [activePage, setActivePage] = useState<ActivePage>("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingSales, setLoadingSales] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [quickSaleOpen, setQuickSaleOpen] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [financeError, setFinanceError] = useState<string | null>(null);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<RoleKey>("admin");
  const [userPermissions, setUserPermissions] = useState<PermissionSet>(
    ROLE_DEFINITIONS[0].permissions
  );
  const [roleAssignments, setRoleAssignments] = useState<UserRoleAssignment[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [dashboardLayout, setDashboardLayout] = useState<DashboardWidgetConfig[]>(
    getDefaultDashboardLayout()
  );
  const [dashboardLayoutLoading, setDashboardLayoutLoading] = useState(true);
  const [dashboardLayoutSaving, setDashboardLayoutSaving] = useState(false);
  const [dashboardLayoutFeedback, setDashboardLayoutFeedback] = useState<string | null>(null);
  const lowStockAlertedRef = useRef<Set<string>>(new Set());
  const summarySentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      setUserRole("admin");
      setUserPermissions(ROLE_DEFINITIONS[0].permissions);
      setRoleAssignments([]);
      setUserProfiles([]);
      setRolesLoading(false);
      setRolesError(null);
      return;
    }

    setRolesLoading(true);
    const roleRef = doc(db, "userRoles", user.uid);

    const unsubscribe = onSnapshot(
      roleRef,
      (snapshot) => {
        const data = snapshot.data() as
          | { role?: RoleKey; permissions?: Partial<PermissionSet> }
          | undefined;
        const roleKey = data?.role || "admin";
        const merged = mergePermissions(roleKey, data?.permissions);
        setUserRole(roleKey);
        setUserPermissions(merged);
        setRolesError(null);
        setRolesLoading(false);

        if (!snapshot.exists()) {
          setDoc(
            roleRef,
            {
              role: roleKey,
              permissions: merged,
              assignedBy: user.uid,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          ).catch((error) => console.error("Error inicializando rol", error));
        }
      },
      (error) => {
        console.error("Error cargando roles", error);
        setRolesError("No pudimos cargar tus permisos.");
        setRolesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !userPermissions.manageUsers) {
      setRoleAssignments([]);
      setUserProfiles([]);
      return;
    }

    const usersRef = collection(db, "users");
    const rolesRef = collection(db, "userRoles");

    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
      const profiles: UserProfile[] = snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data() as FirestoreUserData;
        return {
          id: docSnapshot.id,
          nombre: data.nombre,
          negocio: data.negocio,
          tamano: data.tamano,
          email: data.email,
        };
      });

      if (!profiles.some((profile) => profile.id === user.uid)) {
        profiles.push({ id: user.uid, email: user.email || "" });
      }

      setUserProfiles(profiles);
    });

    const unsubscribeRoles = onSnapshot(rolesRef, (snapshot) => {
      const assignments: UserRoleAssignment[] = snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data() as FirestoreRoleData;
        const roleKey = (data.role as RoleKey) || "admin";
        const mergedPermissions = mergePermissions(roleKey, data.permissions);
        return {
          userId: docSnapshot.id,
          role: roleKey,
          permissions: mergedPermissions,
          assignedBy: data.assignedBy,
          updatedAt:
            data.updatedAt instanceof Timestamp
              ? data.updatedAt.toDate()
              : data.updatedAt
              ? new Date(data.updatedAt)
              : null,
        };
      });

      setRoleAssignments(assignments);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeRoles();
    };
  }, [user, userPermissions.manageUsers]);

  const allowedPages = useMemo(
    () => getAllowedPagesFromPermissions(userPermissions),
    [userPermissions]
  );

  useEffect(() => {
    if (!allowedPages.has(activePage)) {
      const fallback = (allowedPages.has("dashboard")
        ? "dashboard"
        : Array.from(allowedPages)[0]) as ActivePage | undefined;
      setActivePage(fallback || "inicio");
    }
  }, [activePage, allowedPages]);

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
          const raw = docSnapshot.data() as FirestoreProductData;
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
            userId: raw.userId ?? user.uid,
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
    if (!settings?.whatsappEnabled || !settings.alertStockEnabled) {
      return;
    }

    const multiplier = settings.alertLevel === "estricto" ? 1 : settings.alertLevel === "relajado" ? 1.8 : 1.4;

    products.forEach((product) => {
      const minStock = product.stockMin || settings.defaultStockMin || 0;
      if (!minStock) return;

      const threshold = Math.ceil(minStock * multiplier);
      if (product.stock <= threshold) {
        if (!lowStockAlertedRef.current.has(product.id)) {
          sendLowStockAlert(product, settings, settings.businessName || "SimpliGest")
            .then(() => lowStockAlertedRef.current.add(product.id))
            .catch((error) => console.error("Error enviando alerta de stock bajo", error));
        }
      } else {
        lowStockAlertedRef.current.delete(product.id);
      }
    });
  }, [products, settings]);

  useEffect(() => {
    if (!user) {
      setSales([]);
      setLoadingSales(false);
      return;
    }

    setLoadingSales(true);
    const salesQuery = query(
      collection(db, "sales"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      salesQuery,
      (snapshot) => {
        const nextSales: Sale[] = snapshot.docs
          .map((docSnapshot) => {
            const raw = docSnapshot.data() as FirestoreSaleData;
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
          })
          .sort((a, b) => b.date.getTime() - a.date.getTime());

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
      setDashboardLayout(getDefaultDashboardLayout());
      setDashboardLayoutLoading(false);
      setDashboardLayoutFeedback(null);
      return;
    }

    const layoutRef = doc(db, "dashboardLayouts", user.uid);
    setDashboardLayoutLoading(true);

    const unsubscribe = onSnapshot(
      layoutRef,
      async (snapshot) => {
        try {
          if (!snapshot.exists()) {
            const defaultLayout = getDefaultDashboardLayout();
            setDashboardLayout(defaultLayout);
            await setDoc(layoutRef, {
              layout: defaultLayout,
              updatedAt: serverTimestamp(),
              userId: user.uid,
            });
            setDashboardLayoutLoading(false);
            return;
          }

          const data = snapshot.data();
          const layoutFromDb = Array.isArray(data?.layout)
            ? normalizeLayout(data.layout)
            : getDefaultDashboardLayout();
          setDashboardLayout(layoutFromDb);
          setDashboardLayoutFeedback(null);
          setDashboardLayoutLoading(false);
        } catch (error) {
          console.error("Error cargando panel personalizado", error);
          setDashboardLayout(getDefaultDashboardLayout());
          setDashboardLayoutLoading(false);
        }
      },
      (error) => {
        console.error("Error suscribiendo al panel", error);
        setDashboardLayout(getDefaultDashboardLayout());
        setDashboardLayoutLoading(false);
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
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      transactionsQuery,
      (snapshot) => {
        const nextTransactions: Transaction[] = snapshot.docs
          .map((docSnapshot) => {
            const raw = docSnapshot.data() as FirestoreTransactionData;
            const dateValue = raw.date
              ? raw.date instanceof Timestamp
                ? raw.date.toDate()
                : new Date(raw.date)
              : new Date();

            const transactionType: Transaction["type"] =
              raw.type === "expense" ? "expense" : "income";

            return {
              id: docSnapshot.id,
              type: transactionType,
              amount: Number(raw.amount ?? 0),
              description: raw.description ?? "Movimiento",
              category: raw.category ?? "General",
              date: dateValue,
            };
          })
          .sort((a, b) => b.date.getTime() - a.date.getTime());

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

  useEffect(() => {
    if (!settings?.whatsappEnabled || !settings.whatsappDailySummaryEnabled) {
      return;
    }

    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);

    if (summarySentRef.current && summarySentRef.current !== todayKey) {
      summarySentRef.current = null;
    }

    if (summarySentRef.current === todayKey) {
      return;
    }

    const todaysSales = sales.filter((sale) => isSameDay(sale.date, now));
    if (!todaysSales.length) return;

    if (!shouldSendDailySummary(now, settings.whatsappDailySummaryTime)) {
      return;
    }

    sendDailySalesSummary(
      sales,
      settings,
      settings.currency || "CLP",
      settings.businessName || "SimpliGest"
    )
      .then(() => {
        summarySentRef.current = todayKey;
      })
      .catch((error) => console.error("Error enviando resumen diario automático", error));
  }, [sales, settings]);

  async function handleAddProduct(payload: ProductPayload) {
    if (!user) {
      throw new Error("Usuario no autenticado");
    }
    if (!userPermissions.editInventory) {
      throw new Error("No tienes permisos para modificar el inventario");
    }

    try {
      const createdAtValue = payload.createdAt
        ? Timestamp.fromDate(payload.createdAt)
        : serverTimestamp();
      const unitToSave = payload.unit || settings?.defaultUnit || "unidades";

      const docRef = await addDoc(collection(db, "products"), {
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

      console.info("Producto guardado en Firestore", { id: docRef.id });
    } catch (error) {
      console.error("Error agregando producto en Firestore", error);
      throw error;
    }
  }

  async function handleUpdateProduct(id: string, payload: ProductPayload) {
    if (!user) {
      throw new Error("Usuario no autenticado");
    }
    if (!userPermissions.editInventory) {
      throw new Error("No tienes permisos para modificar el inventario");
    }

    try {
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

      console.info("Producto actualizado en Firestore", { id });
    } catch (error) {
      console.error("Error actualizando producto en Firestore", error);
      throw error;
    }
  }

  async function handleDeleteProduct(id: string) {
    if (!user) {
      throw new Error("Usuario no autenticado");
    }
    if (!userPermissions.editInventory) {
      throw new Error("No tienes permisos para modificar el inventario");
    }

    try {
      const productRef = doc(db, "products", id);
      await deleteDoc(productRef);
    } catch (error) {
      console.error("Error eliminando producto en Firestore", error);
      throw error;
    }
  }

  async function handleQuickSale(payload: QuickSalePayload) {
    setSaleError(null);
    if (!user) {
      throw new Error("Usuario no autenticado");
    }
    if (!userPermissions.createSales) {
      throw new Error("No tienes permisos para registrar ventas");
    }
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

    try {
      const docRef = await addDoc(collection(db, "sales"), {
        productId: product.id,
        productName: product.name,
        quantity: payload.quantity,
        unitPrice: payload.unitPrice,
        total,
        date: serverTimestamp(),
        userId: user.uid,
      });

      console.info("Venta guardada en Firestore", { id: docRef.id });

      const productRef = doc(db, "products", product.id);
      await updateDoc(productRef, {
        stock: product.stock - payload.quantity,
      });
    } catch (error) {
      console.error("Error registrando venta rápida en Firestore", error);
      throw error;
    }
  }

  async function handleAddTransaction(payload: TransactionPayload) {
    if (!user) {
      throw new Error("Usuario no autenticado");
    }
    if (!userPermissions.manageTransactions) {
      throw new Error("No tienes permisos para registrar movimientos");
    }
    const dateValue = payload.date
      ? Timestamp.fromDate(payload.date)
      : serverTimestamp();

    try {
      const docRef = await addDoc(collection(db, "transactions"), {
        type: payload.type,
        amount: payload.amount,
        description: payload.description,
        category: payload.category,
        date: dateValue,
        userId: user.uid,
      });

      console.info("Movimiento guardado en Firestore", { id: docRef.id });
    } catch (error) {
      console.error("Error guardando movimiento en Firestore", error);
      throw error;
    }
  }

  async function handleProcessInvoice(invoice: InvoiceRecord) {
    if (!user) {
      throw new Error("Usuario no autenticado");
    }
    if (!userPermissions.manageTransactions) {
      throw new Error("No tienes permisos para procesar facturas");
    }

    const issueDate = invoice.issueDate ? new Date(invoice.issueDate) : new Date();
    const currencyToUse = invoice.currency || settings?.currency || "CLP";
    const normalizedItems = invoice.items.map((item) => {
      const quantity = Number(item.quantity) || 1;
      const unitPrice = item.unitPrice || (item.total && quantity ? item.total / quantity : 0);
      return {
        ...item,
        quantity,
        unitPrice,
        total: item.total || unitPrice * quantity,
      };
    });

    try {
      const transactionRef = await addDoc(collection(db, "transactions"), {
        type: "expense",
        amount: invoice.total,
        description: `Factura ${invoice.invoiceNumber} - ${invoice.supplier}`,
        category: "Factura proveedor",
        date: Timestamp.fromDate(issueDate),
        userId: user.uid,
      });

      console.info("Gasto de factura guardado en Firestore", { id: transactionRef.id });

      await Promise.all(
        normalizedItems.map(async (item) => {
          const existing = products.find(
            (product) => product.name.toLowerCase() === item.description.toLowerCase()
          );
          const productQuantity = item.quantity || 1;
          const unitPrice = item.unitPrice || 0;

          if (existing) {
            const productRef = doc(db, "products", existing.id);
            await updateDoc(productRef, {
              stock: existing.stock + productQuantity,
              purchasePrice: unitPrice || existing.purchasePrice,
              supplier: invoice.supplier || existing.supplier,
              proveedor: invoice.supplier || existing.supplier,
            });
          } else {
            const docRef = await addDoc(collection(db, "products"), {
              name: item.description,
              nombre: item.description,
              category: "Compras factura",
              categoria: "Compras factura",
              stock: productQuantity,
              stockMin: settings?.defaultStockMin ?? 0,
              unit: settings?.defaultUnit || "unidades",
              purchasePrice: unitPrice,
              salePrice: unitPrice ? unitPrice * 1.25 : 0,
              supplier: invoice.supplier,
              proveedor: invoice.supplier,
              createdAt: Timestamp.fromDate(issueDate),
              userId: user.uid,
            });

            console.info("Producto creado desde factura", { id: docRef.id });
          }
        })
      );

      const invoiceRef = await addDoc(collection(db, "invoices"), {
        supplier: invoice.supplier,
        invoiceNumber: invoice.invoiceNumber,
        issueDate: Timestamp.fromDate(issueDate),
        total: invoice.total,
        currency: currencyToUse,
        items: normalizedItems,
        fileName: invoice.fileName,
        fileType: invoice.fileType,
        previewUrl: invoice.previewUrl,
        rawText: invoice.rawText,
        validationWarnings: invoice.validationWarnings || [],
        createdAt: serverTimestamp(),
        userId: user.uid,
      });

      console.info("Factura almacenada en Firestore", { id: invoiceRef.id });
    } catch (error) {
      console.error("Error procesando factura en Firestore", error);
      throw error;
    }
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

      console.info("Configuración actualizada en Firestore", { id: settingsRef.id });
      setSettingsFeedback("Configuración guardada correctamente");
      setTimeout(() => setSettingsFeedback(null), 4000);
    } catch (error) {
      console.error("Error guardando configuración", error);
      setSettingsError("No pudimos guardar tu configuración. Intenta nuevamente.");
    } finally {
      setSettingsSaving(false);
    }
  }

  function handleDashboardLayoutChange(nextLayout: DashboardWidgetConfig[]) {
    setDashboardLayout(nextLayout);
    setDashboardLayoutFeedback("Tienes cambios sin guardar en tu dashboard.");
  }

  async function handleSaveDashboardLayout(nextLayout?: DashboardWidgetConfig[]) {
    if (!user) return;
    setDashboardLayoutSaving(true);
    setDashboardLayoutFeedback(null);
    const layoutToSave = normalizeLayout(nextLayout ?? dashboardLayout);
    try {
      const layoutRef = doc(db, "dashboardLayouts", user.uid);
      await setDoc(
        layoutRef,
        { layout: layoutToSave, updatedAt: serverTimestamp(), userId: user.uid },
        { merge: true }
      );
      setDashboardLayoutFeedback("Diseño guardado. Se cargará al volver a ingresar.");
    } catch (error) {
      console.error("Error guardando diseño del dashboard", error);
      setDashboardLayoutFeedback("No pudimos guardar tu diseño. Intenta nuevamente.");
    } finally {
      setDashboardLayoutSaving(false);
    }
  }

  function handleChangePage(page: ActivePage) {
    if (allowedPages.has(page)) {
      setActivePage(page);
    }
  }

  function handleOpenQuickSale() {
    if (!userPermissions.createSales) {
      setSaleError("Tu rol no tiene permiso para registrar ventas.");
      return;
    }
    setQuickSaleOpen(true);
  }

  async function handleUpdateUserRole(
    userId: string,
    role: RoleKey,
    permissions: PermissionSet
  ) {
    if (!user || !userPermissions.manageUsers) {
      throw new Error("No tienes permisos para asignar roles");
    }

    try {
      await setDoc(
        doc(db, "userRoles", userId),
        { role, permissions, updatedAt: serverTimestamp(), assignedBy: user.uid },
        { merge: true }
      );
    } catch (error) {
      console.error("Error actualizando rol de usuario en Firestore", error);
      throw error;
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

  return (
    <>
      <MainLayout
        activePage={activePage}
        onChangePage={handleChangePage}
        onOpenQuickSale={handleOpenQuickSale}
        onSignOut={handleSignOut}
        userEmail={user.email || ""}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        allowedPages={allowedPages}
        canCreateSale={userPermissions.createSales}
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
            layout={dashboardLayout}
            onLayoutChange={handleDashboardLayoutChange}
            onSaveLayout={() => handleSaveDashboardLayout()}
            savingLayout={dashboardLayoutSaving}
            layoutLoading={dashboardLayoutLoading}
            layoutFeedback={dashboardLayoutFeedback}
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
            canEditInventory={userPermissions.editInventory}
            userId={user.uid}
          />
        )}
        {activePage === "finanzas" && (
          <FinancePage
            sales={sales}
            transactions={transactions}
            loadingSales={loadingSales}
            loadingTransactions={loadingTransactions}
            onAddTransaction={handleAddTransaction}
            onProcessInvoice={handleProcessInvoice}
            errorMessage={financeError}
            defaultTaxRate={settings?.defaultTaxRate}
            currency={settings?.currency}
            settings={settings}
            canManageFinances={userPermissions.manageTransactions}
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
            roleDefinitions={ROLE_DEFINITIONS}
            userRoleAssignments={roleAssignments}
            userProfiles={userProfiles}
            onUpdateUserRole={handleUpdateUserRole}
            canManageUsers={userPermissions.manageUsers}
            currentUserId={user.uid}
            currentRole={userRole}
            currentPermissions={userPermissions}
            rolesError={rolesError}
            rolesLoading={rolesLoading}
          />
        )}
      </MainLayout>

      <QuickSaleModal
        open={quickSaleOpen && userPermissions.createSales}
        products={products}
        onClose={() => setQuickSaleOpen(false)}
        onSubmit={async (values) => {
          try {
            await handleQuickSale(values);
            setQuickSaleOpen(false);
          } catch (error: unknown) {
            const message =
              error instanceof Error ? error.message : "No pudimos registrar la venta";
            setSaleError(message);
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

function normalizeLayout(rawLayouts: unknown[]): DashboardWidgetConfig[] {
  const allowedMetrics: DashboardMetric[] = [
    "weeklySales",
    "inventoryValue",
    "criticalStock",
    "topProducts",
    "categorySales",
    "latestSales",
  ];

  return rawLayouts
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const data = item as RawDashboardLayoutItem;
      const metric = allowedMetrics.includes(data.metric) ? data.metric : null;
      if (!metric) return null;
      const view: DashboardViewType =
        data.view === "chart" || data.view === "table" || data.view === "number"
          ? data.view
          : "number";
      const width: DashboardWidgetConfig["width"] = data.width === 2 ? 2 : 1;
      const id: string = typeof data.id === "string"
        ? data.id
        : crypto.randomUUID
        ? crypto.randomUUID()
        : `widget-${Date.now()}`;
      const title = typeof data.title === "string" ? data.title : undefined;
      const widget: DashboardWidgetConfig = { id, metric, view, width };
      if (title) {
        widget.title = title;
      }

      return widget;
    })
    .filter((item): item is DashboardWidgetConfig => item !== null);
}

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
    whatsappEnabled: false,
    whatsappNumber: "",
    whatsappFrom: "",
    whatsappProvider: "twilio",
    whatsappDailySummaryEnabled: false,
    whatsappDailySummaryTime: "21:00",
    siiEnabled: false,
    siiEnvironment: "certificacion",
    siiApiUrl: "",
    siiApiKey: "",
    siiResolutionNumber: "",
    siiOffice: "",
    uiTheme: "light",
    uiFontSize: "normal",
    planName: "Beta gratuita – sin costo",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    userId,
  };
}

function normalizeSettings(
  data: RawSettingsDoc | undefined,
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
  const whatsappEnabled = Boolean(data?.whatsappEnabled);
  const whatsappDailySummaryEnabled = Boolean(data?.whatsappDailySummaryEnabled);
  const whatsappNumber = data?.whatsappNumber ?? data?.phone ?? "";
  const whatsappFrom = data?.whatsappFrom ?? data?.twilioFrom ?? "";
  const whatsappProvider: BusinessSettings["whatsappProvider"] = "twilio";
  const siiEnvironment =
    data?.siiEnvironment === "produccion" || data?.siiEnvironment === "certificacion"
      ? data.siiEnvironment
      : "certificacion";

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
    whatsappEnabled,
    whatsappNumber,
    whatsappFrom,
    whatsappProvider,
    whatsappDailySummaryEnabled,
    whatsappDailySummaryTime: data?.whatsappDailySummaryTime ?? "21:00",
    siiEnabled: Boolean(data?.siiEnabled),
    siiEnvironment,
    siiApiUrl: data?.siiApiUrl ?? "",
    siiApiKey: data?.siiApiKey ?? "",
    siiResolutionNumber: data?.siiResolutionNumber ?? "",
    siiOffice: data?.siiOffice ?? "",
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
