import React, { useMemo, useState } from "react";
import type { Product, Sale } from "../../types";

type ReportMetric = "ventas" | "stock" | "proveedores";
type TimeRange = "7d" | "30d" | "90d" | "all";

type SavedFilter = {
  id: string;
  name: string;
  metrics: ReportMetric[];
  timeRange: TimeRange;
};

type ReportsPageProps = {
  products: Product[];
  sales: Sale[];
  loadingProducts: boolean;
  loadingSales: boolean;
  currency?: string;
};

const metricOptions: { id: ReportMetric; label: string }[] = [
  {
    id: "ventas",
    label: "Ventas por producto, categoría y tiempo",
  },
  {
    id: "stock",
    label: "Quiebre de stock y niveles críticos",
  },
  {
    id: "proveedores",
    label: "Rendimiento por proveedor",
  },
];

const timeRangeOptions: { id: TimeRange; label: string; days?: number }[] = [
  { id: "7d", label: "Últimos 7 días", days: 7 },
  { id: "30d", label: "Últimos 30 días", days: 30 },
  { id: "90d", label: "Últimos 90 días", days: 90 },
  { id: "all", label: "Todo el historial" },
];

const LOCAL_STORAGE_KEY = "simpligest-reportes-filtros";

const ReportsPage = ({
  products,
  sales,
  loadingProducts,
  loadingSales,
  currency = "CLP",
}: ReportsPageProps) => {
  const [selectedMetrics, setSelectedMetrics] = useState<ReportMetric[]>([
    "ventas",
    "stock",
    "proveedores",
  ]);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) return [];

    try {
      const parsed = JSON.parse(stored) as SavedFilter[];
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [];
    } catch (error) {
      console.error("No se pudieron cargar los filtros guardados", error);
      return [];
    }
  });
  const [filterName, setFilterName] = useState("");

  const saveFilters = (filters: SavedFilter[]) => {
    setSavedFilters(filters);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filters));
    }
  };

  const filteredSales = useMemo(() => {
    const option = timeRangeOptions.find((opt) => opt.id === timeRange);
    if (!option?.days) return sales;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - option.days);

    return sales.filter((sale) => sale.date >= startDate);
  }, [sales, timeRange]);

  const productMap = useMemo(
    () =>
      products.reduce<Record<string, Product>>((acc, product) => {
        acc[product.id] = product;
        return acc;
      }, {}),
    [products]
  );

  const salesByProduct = useMemo(() => {
    const result: { name: string; total: number; units: number }[] = [];
    const accumulator = new Map<string, { total: number; units: number; name: string }>();

    filteredSales.forEach((sale) => {
      const productName = sale.productName || productMap[sale.productId]?.name || "Producto";
      const current = accumulator.get(sale.productId) ?? {
        total: 0,
        units: 0,
        name: productName,
      };

      current.total += sale.total;
      current.units += sale.quantity;
      accumulator.set(sale.productId, current);
    });

    accumulator.forEach((value) => {
      result.push({ name: value.name, total: value.total, units: value.units });
    });

    return result.sort((a, b) => b.total - a.total);
  }, [filteredSales, productMap]);

  const salesByCategory = useMemo(() => {
    const accumulator = new Map<string, { total: number; units: number }>();

    filteredSales.forEach((sale) => {
      const category = productMap[sale.productId]?.category || "Sin categoría";
      const current = accumulator.get(category) ?? { total: 0, units: 0 };
      current.total += sale.total;
      current.units += sale.quantity;
      accumulator.set(category, current);
    });

    return Array.from(accumulator.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [filteredSales, productMap]);

  const salesByPeriod = useMemo(() => {
    const daily = new Map<string, number>();
    const weekly = new Map<string, number>();
    const monthly = new Map<string, number>();

    filteredSales.forEach((sale) => {
      const dayLabel = sale.date.toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "2-digit",
      });
      const monthLabel = sale.date.toLocaleDateString("es-CL", {
        month: "short",
        year: "numeric",
      });

      const firstDayOfWeek = new Date(sale.date);
      const day = sale.date.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      firstDayOfWeek.setDate(sale.date.getDate() + diffToMonday);
      const weekLabel = `${firstDayOfWeek.toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "2-digit",
      })}`;

      daily.set(dayLabel, (daily.get(dayLabel) || 0) + sale.total);
      weekly.set(weekLabel, (weekly.get(weekLabel) || 0) + sale.total);
      monthly.set(monthLabel, (monthly.get(monthLabel) || 0) + sale.total);
    });

    const toSortedArray = (map: Map<string, number>) =>
      Array.from(map.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);

    return {
      daily: toSortedArray(daily),
      weekly: toSortedArray(weekly),
      monthly: toSortedArray(monthly),
    };
  }, [filteredSales]);

  const lowStockProducts = useMemo(
    () =>
      products
        .filter((product) => product.stock <= product.stockMin || product.stock <= (product.stockMin || 0) + 2)
        .sort((a, b) => a.stock - b.stock),
    [products]
  );

  const supplierPerformance = useMemo(() => {
    const accumulator = new Map<
      string,
      { supplier: string; totalSales: number; units: number; productCount: number }
    >();

    products.forEach((product) => {
      const supplier = product.supplier || "Sin proveedor";
      const current = accumulator.get(supplier) ?? {
        supplier,
        totalSales: 0,
        units: 0,
        productCount: 0,
      };

      current.productCount += 1;
      accumulator.set(supplier, current);
    });

    filteredSales.forEach((sale) => {
      const supplier = productMap[sale.productId]?.supplier || "Sin proveedor";
      const current = accumulator.get(supplier);
      if (!current) return;

      current.totalSales += sale.total;
      current.units += sale.quantity;
      accumulator.set(supplier, current);
    });

    return Array.from(accumulator.values()).sort((a, b) => b.totalSales - a.totalSales);
  }, [filteredSales, productMap, products]);

  const handleToggleMetric = (metric: ReportMetric) => {
    setSelectedMetrics((prev) =>
      prev.includes(metric) ? prev.filter((item) => item !== metric) : [...prev, metric]
    );
  };

  const handleSaveFilter = () => {
    const trimmed = filterName.trim();
    if (!trimmed) return;

    const newFilter: SavedFilter = {
      id: crypto.randomUUID(),
      name: trimmed,
      metrics: selectedMetrics,
      timeRange,
    };

    const nextFilters = [...savedFilters, newFilter];
    saveFilters(nextFilters);
    setFilterName("");
  };

  const handleApplyFilter = (filter: SavedFilter) => {
    setSelectedMetrics(filter.metrics);
    setTimeRange(filter.timeRange);
  };

  const handleDeleteFilter = (id: string) => {
    const remaining = savedFilters.filter((filter) => filter.id !== id);
    saveFilters(remaining);
  };

  const handleExportPdf = () => {
    const timeLabel = timeRangeOptions.find((opt) => opt.id === timeRange)?.label ?? "Personalizado";

    const salesSection = selectedMetrics.includes("ventas")
      ? `
        <h2>Ventas</h2>
        <p>Período: ${timeLabel}</p>
        <h3>Por producto</h3>
        <ul>
          ${salesByProduct
            .map((item) => `<li>${item.name}: ${formatCurrency(item.total, currency)} · ${item.units} uds</li>`)
            .join("")}
        </ul>
        <h3>Por categoría</h3>
        <ul>
          ${salesByCategory
            .map(
              (item) =>
                `<li>${item.category}: ${formatCurrency(item.total, currency)} · ${item.units} uds</li>`
            )
            .join("")}
        </ul>
        <h3>Por período</h3>
        <ul>
          ${salesByPeriod.monthly.map((item) => `<li>${item.label}: ${formatCurrency(item.value, currency)}</li>`).join("" )}
        </ul>
      `
      : "";

    const stockSection = selectedMetrics.includes("stock")
      ? `
        <h2>Quiebre de stock</h2>
        <ul>
          ${lowStockProducts
            .map(
              (product) =>
                `<li>${product.name}: ${product.stock} en stock (mínimo ${product.stockMin || 0})</li>`
            )
            .join("")}
        </ul>
      `
      : "";

    const supplierSection = selectedMetrics.includes("proveedores")
      ? `
        <h2>Rendimiento por proveedor</h2>
        <ul>
          ${supplierPerformance
            .map(
              (item) =>
                `<li>${item.supplier}: ${formatCurrency(item.totalSales, currency)} · ${item.units} uds · ${item.productCount} productos</li>`
            )
            .join("")}
        </ul>
      `
      : "";

    const reportContent = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Reporte automático</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { color: #4b5563; }
            h2 { margin-top: 18px; color: #0f172a; }
            h3 { margin-top: 12px; color: #1d4ed8; }
            ul { margin-left: 16px; }
          </style>
        </head>
        <body>
          <h1>Reporte automático</h1>
          <p>Generado el ${new Date().toLocaleString()}</p>
          ${salesSection}
          ${stockSection}
          ${supplierSection}
        </body>
      </html>`;

    const printWindow = window.open("", "_blank", "width=900,height=650");
    if (!printWindow) return;
    printWindow.document.write(reportContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleExportExcel = () => {
    const timeLabel = timeRangeOptions.find((opt) => opt.id === timeRange)?.label ?? "Personalizado";
    const rows: string[] = [];

    rows.push("Reporte automático");
    rows.push(`Periodo seleccionado;${timeLabel}`);

    if (selectedMetrics.includes("ventas")) {
      rows.push("Ventas por producto;;");
      rows.push("Producto;Unidades;Total");
      salesByProduct.forEach((item) => {
        rows.push(`${item.name};${item.units};${formatCurrency(item.total, currency)}`);
      });

      rows.push("Ventas por categoría;;");
      rows.push("Categoría;Unidades;Total");
      salesByCategory.forEach((item) => {
        rows.push(`${item.category};${item.units};${formatCurrency(item.total, currency)}`);
      });

      rows.push("Ventas por período;;");
      rows.push("Período;Total;Tipo");
      salesByPeriod.daily.forEach((item) => rows.push(`${item.label};${formatCurrency(item.value, currency)};Diario`));
      salesByPeriod.weekly.forEach((item) => rows.push(`${item.label};${formatCurrency(item.value, currency)};Semanal`));
      salesByPeriod.monthly.forEach((item) => rows.push(`${item.label};${formatCurrency(item.value, currency)};Mensual`));
    }

    if (selectedMetrics.includes("stock")) {
      rows.push("Quiebre de stock;;");
      rows.push("Producto;Stock actual;Stock mínimo");
      lowStockProducts.forEach((product) => {
        rows.push(`${product.name};${product.stock};${product.stockMin || 0}`);
      });
    }

    if (selectedMetrics.includes("proveedores")) {
      rows.push("Rendimiento por proveedor;;");
      rows.push("Proveedor;Productos;Unidades vendidas;Total vendido");
      supplierPerformance.forEach((supplier) => {
        rows.push(
          `${supplier.supplier};${supplier.productCount};${supplier.units};${formatCurrency(
            supplier.totalSales,
            currency
          )}`
        );
      });
    }

    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "reportes-automaticos.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Reportes Automáticos</h3>
            <p className="text-sm text-gray-500">
              Elige las métricas que quieres ver, guarda tus filtros favoritos y exporta en PDF o Excel.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportPdf}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm hover:opacity-90 transition"
            >
              Exportar PDF
            </button>
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 rounded-xl border border-primary/30 text-primary text-sm hover:bg-primary/5 transition"
            >
              Exportar Excel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Métricas</p>
            <div className="bg-softGray rounded-xl p-3 space-y-2">
              {metricOptions.map((metric) => (
                <label key={metric.id} className="flex items-center gap-2 text-sm text-primary">
                  <input
                    type="checkbox"
                    checked={selectedMetrics.includes(metric.id)}
                    onChange={() => handleToggleMetric(metric.id)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  {metric.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Período</p>
            <select
              value={timeRange}
              onChange={(event) => setTimeRange(event.target.value as TimeRange)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
            >
              {timeRangeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              Aplica a los cálculos de ventas. Stock y proveedores usan los datos actuales del inventario.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Filtros personalizados</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nombre del filtro (ej: Reporte semanal)"
                value={filterName}
                onChange={(event) => setFilterName(event.target.value)}
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
              />
              <button
                onClick={handleSaveFilter}
                className="px-4 py-2 rounded-xl bg-primaryLight text-white text-sm hover:opacity-90 transition"
              >
                Guardar
              </button>
            </div>
            {savedFilters.length > 0 ? (
              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                {savedFilters.map((filter) => (
                  <div
                    key={filter.id}
                    className="flex items-center justify-between bg-softGray rounded-xl px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-primary">{filter.name}</p>
                      <p className="text-xs text-gray-500">
                        {filter.metrics.length} métricas · {timeRangeOptions.find((opt) => opt.id === filter.timeRange)?.label}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApplyFilter(filter)}
                        className="text-xs px-3 py-1 rounded-lg bg-white text-primary border border-primary/20 hover:bg-primary/5"
                      >
                        Aplicar
                      </button>
                      <button
                        onClick={() => handleDeleteFilter(filter.id)}
                        className="text-xs px-3 py-1 rounded-lg text-red-600 hover:bg-white"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Aún no guardas filtros. Configura un reporte y presiona Guardar.</p>
            )}
          </div>
        </div>
      </section>

      {selectedMetrics.includes("ventas") && (
        <section className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <header className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-primary">Ventas por producto, categoría y tiempo</h4>
              <p className="text-xs text-gray-500">
                Resultados calculados para el período seleccionado.
              </p>
            </div>
            {loadingSales && <p className="text-xs text-gray-400">Actualizando ventas...</p>}
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ReportCard title="Top productos" helper="Ordenado por monto vendido.">
              {salesByProduct.length === 0 ? (
                <EmptyState message="Aún no hay ventas registradas para este período." />
              ) : (
                <ul className="space-y-2 text-sm text-primary">
                  {salesByProduct.slice(0, 5).map((item) => (
                    <li key={item.name} className="flex justify-between">
                      <span>{item.name}</span>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(item.total, currency)}</p>
                        <p className="text-[11px] text-gray-500">{item.units} uds</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </ReportCard>

            <ReportCard title="Ventas por categoría" helper="Incluye todas las ventas filtradas.">
              {salesByCategory.length === 0 ? (
                <EmptyState message="No hay ventas categorizadas para el período." />
              ) : (
                <ul className="space-y-2 text-sm text-primary">
                  {salesByCategory.slice(0, 5).map((item) => (
                    <li key={item.category} className="flex justify-between">
                      <span>{item.category}</span>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(item.total, currency)}</p>
                        <p className="text-[11px] text-gray-500">{item.units} uds</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </ReportCard>

            <ReportCard title="Por período" helper="Muestra totales diarios, semanales y mensuales.">
              {salesByPeriod.daily.length === 0 && salesByPeriod.monthly.length === 0 ? (
                <EmptyState message="No hay movimientos en el rango elegido." />
              ) : (
                <div className="space-y-2 text-sm text-primary">
                  <div>
                    <p className="text-xs text-gray-500">Mensual</p>
                    <ul className="space-y-1">
                      {salesByPeriod.monthly.slice(0, 3).map((item) => (
                        <li key={item.label} className="flex justify-between">
                          <span>{item.label}</span>
                          <span className="font-semibold">{formatCurrency(item.value, currency)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Semanal</p>
                    <ul className="space-y-1">
                      {salesByPeriod.weekly.slice(0, 3).map((item) => (
                        <li key={item.label} className="flex justify-between">
                          <span>Desde {item.label}</span>
                          <span className="font-semibold">{formatCurrency(item.value, currency)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Diario</p>
                    <ul className="space-y-1">
                      {salesByPeriod.daily.slice(0, 3).map((item) => (
                        <li key={item.label} className="flex justify-between">
                          <span>{item.label}</span>
                          <span className="font-semibold">{formatCurrency(item.value, currency)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </ReportCard>
          </div>
        </section>
      )}

      {selectedMetrics.includes("stock") && (
        <section className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <header className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-primary">Quiebre de stock</h4>
              <p className="text-xs text-gray-500">Productos con stock crítico o próximo a agotarse.</p>
            </div>
            {loadingProducts && <p className="text-xs text-gray-400">Actualizando inventario...</p>}
          </header>

          {lowStockProducts.length === 0 ? (
            <EmptyState message="Todo en orden, no hay productos en nivel crítico." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockProducts.slice(0, 9).map((product) => {
                const delta = product.stock - (product.stockMin || 0);
                const severity = delta <= 0 ? "text-red-600" : "text-amber-600";

                return (
                  <div key={product.id} className="border border-gray-100 rounded-xl p-3 bg-softGray">
                    <p className="font-semibold text-primary">{product.name}</p>
                    <p className={`text-sm ${severity}`}>
                      {product.stock} en stock · mínimo {product.stockMin || 0}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Categoría: {product.category || "Sin categoría"} · Proveedor: {product.supplier || "N/A"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {selectedMetrics.includes("proveedores") && (
        <section className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <header className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-primary">Rendimiento por proveedor</h4>
              <p className="text-xs text-gray-500">Comparativo entre proveedores según productos y ventas asociadas.</p>
            </div>
            {loadingProducts && <p className="text-xs text-gray-400">Actualizando datos...</p>}
          </header>

          {supplierPerformance.length === 0 ? (
            <EmptyState message="Agrega proveedores en tus productos para ver su rendimiento." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {supplierPerformance.slice(0, 9).map((supplier) => (
                <div key={supplier.supplier} className="border border-gray-100 rounded-xl p-3 bg-softGray">
                  <p className="font-semibold text-primary">{supplier.supplier}</p>
                  <p className="text-sm text-gray-600">{supplier.productCount} productos</p>
                  <p className="text-sm text-primary font-semibold">{formatCurrency(supplier.totalSales, currency)}</p>
                  <p className="text-[11px] text-gray-500">{supplier.units} unidades vendidas</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default ReportsPage;

type ReportCardProps = {
  title: string;
  helper?: string;
  children: React.ReactNode;
};

function ReportCard({ title, helper, children }: ReportCardProps) {
  return (
    <div className="border border-gray-100 rounded-2xl p-4 bg-softGray">
      <div className="flex items-center justify-between mb-3">
        <h5 className="font-semibold text-primary">{title}</h5>
        {helper && <p className="text-[11px] text-gray-500">{helper}</p>}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-gray-500">{message}</p>;
}

function formatCurrency(value: number, currency = "CLP") {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

