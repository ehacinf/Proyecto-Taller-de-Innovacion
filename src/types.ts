export type ActivePage =
  | "inicio"
  | "dashboard"
  | "inventario"
  | "finanzas"
  | "configuracion";

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
  userId?: string;
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
  userId?: string;
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
