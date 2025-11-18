export type ActivePage = "inicio" | "dashboard" | "inventario" | "finanzas";

export type Product = {
  id: string;
  name: string;
  category: string;
  stock: number;
  stockMin: number;
  purchasePrice: number;
  salePrice: number;
  supplier?: string;
  createdAt?: Date | null;
};

export type ProductPayload = {
  name: string;
  category: string;
  stock: number;
  stockMin: number;
  purchasePrice: number;
  salePrice: number;
  supplier: string;
  createdAt?: Date | null;
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
