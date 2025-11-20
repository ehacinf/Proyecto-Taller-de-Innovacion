import type { Product, Sale, DashboardWidgetConfig } from "../types";

export function getDefaultDashboardLayout(): DashboardWidgetConfig[] {
  return [
    {
      id: "inventory-value",
      metric: "inventoryValue",
      view: "number",
      width: 1,
      title: "Valor del inventario",
    },
    {
      id: "weekly-sales",
      metric: "weeklySales",
      view: "chart",
      width: 2,
      title: "Ventas de la semana",
    },
    {
      id: "critical-stock",
      metric: "criticalStock",
      view: "table",
      width: 1,
      title: "Stock crítico",
    },
    {
      id: "top-products",
      metric: "topProducts",
      view: "table",
      width: 2,
      title: "Productos con más movimiento",
    },
  ];
}

export function buildWeeklySalesSeries(sales: Sale[]) {
  const days = 7;
  const data: { label: string; value: number }[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const label = date.toLocaleDateString("es-CL", { weekday: "short" });
    const total = sales
      .filter((sale) => sale.date.toDateString() === date.toDateString())
      .reduce((acc, sale) => acc + sale.total, 0);

    data.push({ label, value: total });
  }

  return data;
}

export function buildSalesByCategory(products: Product[], sales: Sale[]) {
  const productsById = products.reduce<Record<string, Product>>((acc, product) => {
    acc[product.id] = product;
    return acc;
  }, {});

  const totals = sales.reduce<Record<string, number>>((acc, sale) => {
    const category = productsById[sale.productId]?.category || "Sin categoría";
    acc[category] = (acc[category] || 0) + sale.total;
    return acc;
  }, {});

  return Object.entries(totals)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export function buildTopProducts(sales: Sale[]) {
  const totals = sales.reduce<Record<string, { name: string; quantity: number; total: number }>>(
    (acc, sale) => {
      const current = acc[sale.productId] || { name: sale.productName, quantity: 0, total: 0 };
      current.quantity += sale.quantity;
      current.total += sale.total;
      acc[sale.productId] = current;
      return acc;
    },
    {}
  );

  return Object.values(totals).sort((a, b) => b.total - a.total).slice(0, 6);
}

export function buildLowStock(products: Product[]) {
  return products
    .filter((product) => product.stockMin > 0 && product.stock <= product.stockMin)
    .sort((a, b) => a.stock - b.stock);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}
