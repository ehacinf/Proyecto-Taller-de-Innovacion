export type ActivePage =
  | "inicio"
  | "dashboard"
  | "inventario"
  | "finanzas"
  | "reportes"
  | "configuracion";

export type RoleKey =
  | "admin"
  | "vendedor"
  | "contador"
  | "bodeguero"
  | "personalizado";

export type PermissionKey =
  | "viewInventory"
  | "editInventory"
  | "viewSales"
  | "createSales"
  | "viewFinance"
  | "manageTransactions"
  | "manageUsers";

export type PermissionSet = Record<PermissionKey, boolean>;

export type RoleDefinition = {
  key: RoleKey;
  name: string;
  description: string;
  permissions: PermissionSet;
};

export type UserRoleAssignment = {
  userId: string;
  role: RoleKey;
  permissions: PermissionSet;
  updatedAt?: Date | null;
  assignedBy?: string;
};

export type UserProfile = {
  id: string;
  nombre?: string;
  negocio?: string;
  tamano?: string;
  email?: string;
  companyId?: string;
};

export type AlertLevel = "estricto" | "normal" | "relajado";
export type UITheme = "light" | "dark";
export type UIFontSize = "normal" | "large";

export type BusinessSettings = {
  businessName: string;
  businessType: string;
  taxId: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  contactEmail: string;
  defaultStockMin: number;
  defaultUnit: string;
  categories: string[];
  defaultTaxRate: number;
  currency: string;
  allowNegativeStock: boolean;
  allowCustomPriceOnSale: boolean;
  alertStockEnabled: boolean;
  alertLevel: AlertLevel;
  alertEmail: string;
  whatsappEnabled: boolean;
  whatsappNumber: string;
  whatsappFrom?: string;
  whatsappProvider?: "twilio";
  whatsappDailySummaryEnabled: boolean;
  whatsappDailySummaryTime?: string;
  siiEnabled: boolean;
  siiEnvironment?: "produccion" | "certificacion";
  siiApiUrl?: string;
  siiApiKey?: string;
  siiResolutionNumber?: string;
  siiOffice?: string;
  uiTheme: UITheme;
  uiFontSize: UIFontSize;
  planName: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  stock: number;
  stockMin: number;
  unit?: string;
  purchasePrice: number;
  salePrice: number;
  supplier?: string;
  createdAt?: Date | null;
  userId: string;
};

export type ProductPayload = {
  name: string;
  category: string;
  stock: number;
  stockMin: number;
  unit?: string;
  purchasePrice: number;
  salePrice: number;
  supplier: string;
  createdAt?: Date | null;
  userId: string;
};

export type PriceRecommendation = {
  recommendedPrice: number;
  variationPercentage: number;
  rationale: string;
};

export type ProductInsight = {
  productId: string;
  productName: string;
  predictedWeeklyDemand: number;
  predictedDailyDemand: number;
  demandLevel: "alta" | "media" | "baja";
  stockoutInDays: number | null;
  purchaseSuggestion: number;
  priceRecommendation: PriceRecommendation;
};

export type Sale = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  date: Date;
};

export type QuickSalePayload = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

export type Transaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  date: Date;
};

export type TransactionPayload = {
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  date?: Date | null;
};

export type SiiDocumentItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  productId?: string;
};

export type SiiDocumentRequest = {
  type: "boleta" | "factura";
  folio?: string;
  customerName: string;
  customerTaxId: string;
  customerEmail?: string;
  items: SiiDocumentItem[];
  issueDate?: Date;
  total?: number;
};

export type SiiDocumentResponse = {
  trackId: string;
  status: string;
  pdfUrl?: string;
  siiFolio?: string;
};

export type SiiDocumentStatus = {
  trackId: string;
  status: string;
  receivedAt?: string;
  accepted?: boolean;
  siiFolio?: string;
};

export type DashboardMetric =
  | "weeklySales"
  | "inventoryValue"
  | "criticalStock"
  | "topProducts"
  | "categorySales"
  | "latestSales";

export type DashboardViewType = "chart" | "number" | "table";

export type DashboardWidgetConfig = {
  id: string;
  metric: DashboardMetric;
  view: DashboardViewType;
  width: 1 | 2;
  title?: string;
};

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  productId?: string;
};

export type InvoiceRecord = {
  id?: string;
  supplier: string;
  invoiceNumber: string;
  issueDate: Date;
  total: number;
  currency?: string;
  items: InvoiceLineItem[];
  fileName: string;
  fileType: string;
  previewUrl?: string;
  rawText?: string;
  validationWarnings?: string[];
};
