import React, { useMemo, useState } from "react";
import type {
  DashboardMetric,
  DashboardViewType,
  DashboardWidgetConfig,
  Product,
  ProductInsight,
  Sale,
} from "../../types";
import {
  buildLowStock,
  buildSalesByCategory,
  buildTopProducts,
  buildWeeklySalesSeries,
  formatCurrency,
  getDefaultDashboardLayout,
} from "../../utils/dashboard";

type DashboardProps = {
  products: Product[];
  sales: Sale[];
  latestSales: Sale[];
  loadingProducts: boolean;
  loadingSales: boolean;
  insights: ProductInsight[];
  layout: DashboardWidgetConfig[];
  onLayoutChange: (layout: DashboardWidgetConfig[]) => void;
  onSaveLayout: () => void;
  savingLayout: boolean;
  layoutLoading?: boolean;
  layoutFeedback?: string | null;
};

const Dashboard = ({
  products,
  sales,
  latestSales,
  loadingProducts,
  loadingSales,
  insights,
  layout,
  onLayoutChange,
  onSaveLayout,
  savingLayout,
  layoutLoading,
  layoutFeedback,
}: DashboardProps) => {
  const [newMetric, setNewMetric] = useState<DashboardMetric>("weeklySales");
  const [newView, setNewView] = useState<DashboardViewType>("chart");
  const [newWidth, setNewWidth] = useState<DashboardWidgetConfig["width"]>(2);

  const totalInventoryValue = useMemo(
    () =>
      products.reduce(
        (acc, product) => acc + product.salePrice * (product.stock || 0),
        0
      ),
    [products]
  );

  const lowStockCount = useMemo(
    () => products.filter((product) => product.stock <= product.stockMin).length,
    [products]
  );

  const totalProducts = products.length;

  const thirtyDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  }, []);

  const salesLast30Days = useMemo(
    () =>
      sales.reduce((acc, sale) => {
        if (sale.date >= thirtyDaysAgo) {
          return acc + sale.total;
        }
        return acc;
      }, 0),
    [sales, thirtyDaysAgo]
  );

  const chartData = useMemo(() => buildWeeklySalesSeries(sales), [sales]);
  const chartMax = Math.max(...chartData.map((item) => item.value), 1);

  const topPredictions = useMemo(
    () =>
      [...insights]
        .sort((a, b) => b.predictedWeeklyDemand - a.predictedWeeklyDemand)
        .slice(0, 3),
    [insights]
  );

  const stockoutRisks = useMemo(
    () =>
      insights
        .filter((item) => typeof item.stockoutInDays === "number")
        .sort((a, b) => (a.stockoutInDays ?? Infinity) - (b.stockoutInDays ?? Infinity))
        .slice(0, 3),
    [insights]
  );

  const suggestedPurchases = useMemo(
    () =>
      insights
        .filter((item) => item.purchaseSuggestion > 0)
        .sort((a, b) => b.purchaseSuggestion - a.purchaseSuggestion)
        .slice(0, 3),
    [insights]
  );

  const criticalProducts = useMemo(() => buildLowStock(products), [products]);
  const topSellingProducts = useMemo(() => buildTopProducts(sales), [sales]);
  const categorySales = useMemo(() => buildSalesByCategory(products, sales), [products, sales]);

  const widgets = layout.length ? layout : getDefaultDashboardLayout();

  const handleAddWidget = () => {
    const widget: DashboardWidgetConfig = {
      id: crypto.randomUUID ? crypto.randomUUID() : `widget-${Date.now()}`,
      metric: newMetric,
      view: newView,
      width: newWidth,
      title: metricOptions.find((item) => item.value === newMetric)?.label,
    };

    onLayoutChange([...widgets, widget]);
  };

  const handleRemoveWidget = (id: string) => {
    onLayoutChange(widgets.filter((item) => item.id !== id));
  };

  const handleMove = (id: string, direction: "up" | "down") => {
    const currentIndex = widgets.findIndex((item) => item.id === id);
    if (currentIndex === -1) return;
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= widgets.length) return;

    const next = [...widgets];
    const [removed] = next.splice(currentIndex, 1);
    next.splice(newIndex, 0, removed);
    onLayoutChange(next);
  };

  const handleUpdateWidget = (
    id: string,
    changes: Partial<Pick<DashboardWidgetConfig, "metric" | "view" | "width" | "title">>
  ) => {
    onLayoutChange(
      widgets.map((widget) =>
        widget.id === id
          ? {
              ...widget,
              ...changes,
              title:
                changes.title ||
                changes.metric
                  ? metricOptions.find((item) => item.value === (changes.metric ?? widget.metric))?.label
                  : widget.title,
            }
          : widget
      )
    );
  };

  const renderWidgetContent = (widget: DashboardWidgetConfig) => {
    if (widget.metric === "inventoryValue") {
      return (
        <NumberWidget
          title={widget.title || "Valor del inventario"}
          description="Precio de venta multiplicado por el stock disponible."
          loading={loadingProducts}
          value={formatCurrency(totalInventoryValue)}
        />
      );
    }

    if (widget.metric === "weeklySales") {
      if (widget.view === "chart") {
        return (
          <ChartWidget
            title={widget.title || "Ventas por día"}
            description="Total facturado durante los últimos 7 días."
            data={chartData}
            chartMax={chartMax}
            loading={loadingSales}
          />
        );
      }

      return (
        <NumberWidget
          title={widget.title || "Ventas de la semana"}
          description="Ingresos de los últimos 7 días."
          loading={loadingSales}
          value={formatCurrency(chartData.reduce((acc, item) => acc + item.value, 0))}
        />
      );
    }

    if (widget.metric === "latestSales") {
      return (
        <TableWidget
          title={widget.title || "Ventas recientes"}
          description="Últimos movimientos registrados."
          loading={loadingSales}
          emptyLabel="Aún no registras ventas. Usa “+ Venta rápida” para comenzar."
          headers={["Producto", "Cantidad", "Total", "Fecha"]}
          rows={latestSales.map((sale) => [
            sale.productName,
            sale.quantity,
            formatCurrency(sale.total),
            sale.date.toLocaleDateString("es-CL", {
              day: "2-digit",
              month: "short",
            }),
          ])}
        />
      );
    }

    if (widget.metric === "criticalStock") {
      return (
        <TableWidget
          title={widget.title || "Stock crítico"}
          description="Productos en riesgo de quiebre."
          loading={loadingProducts}
          emptyLabel="No hay productos en nivel crítico."
          headers={["Producto", "Stock", "Mínimo"]}
          rows={criticalProducts.map((product) => [product.name, product.stock, product.stockMin])}
        />
      );
    }

    if (widget.metric === "topProducts") {
      if (widget.view === "chart") {
        return (
          <ChartWidget
            title={widget.title || "Productos con más ventas"}
            description="Ranking de los últimos movimientos."
            data={topSellingProducts.map((product) => ({
              label: product.name,
              value: product.total,
            }))}
            chartMax={Math.max(...topSellingProducts.map((item) => item.total), 1)}
            loading={loadingSales}
            dense
          />
        );
      }

      return (
        <TableWidget
          title={widget.title || "Productos con más ventas"}
          description="Ranking por monto vendido."
          loading={loadingSales}
          emptyLabel="Aún no hay ventas registradas."
          headers={["Producto", "Cantidad", "Total"]}
          rows={topSellingProducts.map((product) => [
            product.name,
            product.quantity,
            formatCurrency(product.total),
          ])}
        />
      );
    }

    if (widget.metric === "categorySales") {
      if (widget.view === "chart") {
        return (
          <ChartWidget
            title={widget.title || "Ventas por categoría"}
            description="Distribución de ingresos por familia de productos."
            data={categorySales.map((item) => ({ label: item.category, value: item.total }))}
            chartMax={Math.max(...categorySales.map((item) => item.total), 1)}
            loading={loadingSales}
            dense
          />
        );
      }

      return (
        <TableWidget
          title={widget.title || "Ventas por categoría"}
          description="Detalle de ventas agrupadas."
          loading={loadingSales}
          emptyLabel="No hay ventas para las categorías registradas."
          headers={["Categoría", "Total"]}
          rows={categorySales.map((item) => [item.category, formatCurrency(item.total)])}
        />
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="SKUs en inventario"
          value={loadingProducts ? "…" : totalProducts.toString()}
          subtitle="Documentos sincronizados"
        />
        <KpiCard
          title="Valor del inventario"
          value={loadingProducts ? "…" : formatCurrency(totalInventoryValue)}
          subtitle="Precio de venta x stock"
        />
        <KpiCard
          title="Ventas últimos 30 días"
          value={loadingSales ? "…" : formatCurrency(salesLast30Days)}
          subtitle="Incluye venta rápida"
          positive
        />
        <KpiCard
          title="Alertas de stock"
          value={loadingProducts ? "…" : lowStockCount.toString()}
          subtitle="Productos en nivel crítico"
        />
      </section>

      <section className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primaryLight">Personaliza tu panel</p>
            <h3 className="text-lg font-semibold text-primary">Elige qué tarjetas quieres ver</h3>
            <p className="text-xs text-gray-500">
              Arrastra el orden con los botones, cambia su tamaño y guarda tu distribución favorita.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="text-[11px] text-gray-500 block">Métrica</label>
              <select
                className="text-sm border rounded-lg px-3 py-2 bg-white"
                value={newMetric}
                onChange={(event) => setNewMetric(event.target.value as DashboardMetric)}
              >
                {metricOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-gray-500 block">Visualización</label>
              <select
                className="text-sm border rounded-lg px-3 py-2 bg-white"
                value={newView}
                onChange={(event) => setNewView(event.target.value as DashboardViewType)}
              >
                <option value="chart">Gráfico</option>
                <option value="number">Número</option>
                <option value="table">Tabla</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-gray-500 block">Tamaño</label>
              <select
                className="text-sm border rounded-lg px-3 py-2 bg-white"
                value={newWidth}
                onChange={(event) =>
                  setNewWidth(Number(event.target.value) as DashboardWidgetConfig["width"])
                }
              >
                <option value={1}>1 columna</option>
                <option value={2}>2 columnas</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleAddWidget}
              className="text-sm bg-primaryLight text-white px-4 py-2 rounded-xl shadow-sm hover:opacity-90 transition"
            >
              + Agregar tarjeta
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-gray-500">
            Reordena con las flechas, ajusta tamaños y elimina lo que no necesites.
          </p>
          <div className="flex items-center gap-2">
            {layoutFeedback && <p className="text-xs text-primary">{layoutFeedback}</p>}
            <button
              type="button"
              disabled={savingLayout || layoutLoading}
              onClick={onSaveLayout}
              className="text-sm bg-primary text-white px-4 py-2 rounded-xl shadow-sm hover:opacity-90 transition disabled:opacity-60"
            >
              {savingLayout ? "Guardando..." : "Guardar diseño"}
            </button>
          </div>
        </div>
      </section>

      {layoutLoading ? (
        <p className="text-xs text-gray-500">Cargando tu panel...</p>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-min">
          {widgets.map((widget) => (
            <article
              key={widget.id}
              className={`bg-white rounded-2xl shadow-sm p-4 ${
                widget.width === 2 ? "md:col-span-8" : "md:col-span-4"
              }`}
            >
              <header className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.25em] text-primaryLight">Tarjeta</p>
                  <h4 className="text-lg font-semibold text-primary">{widget.title || "Tarjeta"}</h4>
                </div>

                <div className="flex flex-wrap gap-1">
                  <IconButton label="Mover arriba" onClick={() => handleMove(widget.id, "up")}>↑</IconButton>
                  <IconButton label="Mover abajo" onClick={() => handleMove(widget.id, "down")}>↓</IconButton>
                  <IconButton label="Eliminar" onClick={() => handleRemoveWidget(widget.id)}>✕</IconButton>
                </div>
              </header>

              <div className="flex flex-wrap gap-2 mb-3 text-xs">
                <label className="flex items-center gap-1">
                  <span className="text-gray-500">Métrica</span>
                  <select
                    className="border rounded-lg px-2 py-1"
                    value={widget.metric}
                    onChange={(event) =>
                      handleUpdateWidget(widget.id, {
                        metric: event.target.value as DashboardMetric,
                        title: metricOptions.find((item) => item.value === event.target.value)?.label,
                      })
                    }
                  >
                    {metricOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-1">
                  <span className="text-gray-500">Vista</span>
                  <select
                    className="border rounded-lg px-2 py-1"
                    value={widget.view}
                    onChange={(event) =>
                      handleUpdateWidget(widget.id, { view: event.target.value as DashboardViewType })
                    }
                  >
                    <option value="chart">Gráfico</option>
                    <option value="number">Número</option>
                    <option value="table">Tabla</option>
                  </select>
                </label>

                <label className="flex items-center gap-1">
                  <span className="text-gray-500">Tamaño</span>
                  <select
                    className="border rounded-lg px-2 py-1"
                    value={widget.width}
                    onChange={(event) =>
                      handleUpdateWidget(widget.id, {
                        width: Number(event.target.value) as DashboardWidgetConfig["width"],
                      })
                    }
                  >
                    <option value={1}>1 columna</option>
                    <option value={2}>2 columnas</option>
                  </select>
                </label>
              </div>

              {renderWidgetContent(widget)}
            </article>
          ))}
        </section>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <InsightCard
          title="Predicción de demanda"
          description="Top productos que tendrán mayor movimiento la próxima semana."
          emptyLabel="Aún no hay datos suficientes para predecir demanda."
        >
          {topPredictions.map((item) => (
            <InsightRow
              key={item.productId}
              label={item.productName}
              value={`${item.demandLevel.toUpperCase()} · ≈${item.predictedWeeklyDemand.toFixed(
                1
              )} uds/sem`}
              helper={formatDemandHelper(item)}
            />
          ))}
        </InsightCard>

        <InsightCard
          title="Próximo quiebre de stock"
          description="Riesgo estimado con base en la velocidad de venta."
          emptyLabel="Sin riesgo de quiebre detectado."
        >
          {stockoutRisks.map((item) => (
            <InsightRow
              key={item.productId}
              label={item.productName}
              value={item.stockoutInDays ? `${item.stockoutInDays} días` : "Sin riesgo"}
              helper={`Stock actual alcanza para ${
                item.stockoutInDays ? `${item.stockoutInDays} días` : "más de un mes"
              }`}
            />
          ))}
        </InsightCard>

        <InsightCard
          title="Sugerencias de compra"
          description="Órdenes recomendadas para evitar desabastecimiento."
          emptyLabel="No hay compras sugeridas en este momento."
        >
          {suggestedPurchases.map((item) => (
            <InsightRow
              key={item.productId}
              label={item.productName}
              value={`Pedir ${item.purchaseSuggestion} uds`}
              helper={`Cobertura de ${SAFETY_LABEL} días más stock mínimo`}
            />
          ))}
        </InsightCard>
      </section>
    </div>
  );
};

export default Dashboard;

type KpiCardProps = {
  title: string;
  value: string;
  subtitle: string;
  positive?: boolean;
};

type InsightCardProps = {
  title: string;
  description: string;
  emptyLabel: string;
  children: React.ReactNode;
};

type InsightRowProps = {
  label: string;
  value: string;
  helper?: string;
};

const SAFETY_LABEL = "14";

function KpiCard({ title, value, subtitle, positive }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-primaryLight">{title}</p>
      <h3 className="text-xl font-semibold text-primary">{value}</h3>
      <p className={`text-xs ${positive ? "text-green-600" : "text-gray-500"}`}>{subtitle}</p>
    </div>
  );
}

function InsightCard({ title, description, emptyLabel, children }: InsightCardProps) {
  const hasItems = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-primaryLight">{title}</p>
        <h3 className="text-lg font-semibold text-primary">{description}</h3>
      </div>
      <div className="space-y-2">
        {hasItems ? children : <p className="text-xs text-gray-500">{emptyLabel}</p>}
      </div>
    </div>
  );
}

function InsightRow({ label, value, helper }: InsightRowProps) {
  return (
    <div className="bg-softGray rounded-2xl px-3 py-2 text-xs flex items-center justify-between">
      <div>
        <p className="font-semibold text-primary">{label}</p>
        {helper && <p className="text-[11px] text-gray-500">{helper}</p>}
      </div>
      <p className="text-gray-700 font-semibold">{value}</p>
    </div>
  );
}

function formatDemandHelper(item: ProductInsight) {
  if (item.stockoutInDays === null) {
    return "Sin ventas recientes, monitorea este SKU.";
  }
  const demandText =
    item.demandLevel === "alta"
      ? "demanda alta"
      : item.demandLevel === "media"
      ? "demanda estable"
      : "demanda baja";
  return `${demandText}; proyectado ${item.stockoutInDays} días de stock.`;
}

function NumberWidget({
  title,
  description,
  loading,
  value,
}: {
  title: string;
  description: string;
  loading: boolean;
  value: string;
}) {
  return (
    <div>
      <h4 className="text-lg font-semibold text-primary">{title}</h4>
      <p className="text-xs text-gray-500 mb-1">{description}</p>
      <p className="text-3xl font-bold text-primary">{loading ? "…" : value}</p>
    </div>
  );
}

function ChartWidget({
  title,
  description,
  data,
  chartMax,
  loading,
  dense,
}: {
  title: string;
  description: string;
  data: { label: string; value: number }[];
  chartMax: number;
  loading: boolean;
  dense?: boolean;
}) {
  return (
    <div>
      <h4 className="text-lg font-semibold text-primary">{title}</h4>
      <p className="text-xs text-gray-500 mb-3">{description}</p>
      {loading ? (
        <p className="text-xs text-gray-500">Cargando...</p>
      ) : (
        <div className={`flex items-end gap-2 ${dense ? "h-48" : "h-40"}`}>
          {data.map((item) => (
            <div key={item.label} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-primary/10 rounded-full overflow-hidden h-full flex items-end">
                <div
                  className="w-full bg-primary rounded-full transition-all"
                  style={{ height: `${(item.value / chartMax) * 100}%` }}
                />
              </div>
              <p className="text-[11px] uppercase text-gray-500 truncate w-full text-center">{item.label}</p>
              <p className="text-[11px] text-gray-600">{formatCurrency(item.value)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TableWidget({
  title,
  description,
  headers,
  rows,
  loading,
  emptyLabel,
}: {
  title: string;
  description: string;
  headers: (string | number)[];
  rows: (string | number)[][];
  loading: boolean;
  emptyLabel: string;
}) {
  return (
    <div>
      <h4 className="text-lg font-semibold text-primary">{title}</h4>
      <p className="text-xs text-gray-500 mb-3">{description}</p>
      {loading ? (
        <p className="text-xs text-gray-500">Cargando...</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-gray-500">{emptyLabel}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                {headers.map((header) => (
                  <th key={header} className="py-2 pr-2 whitespace-nowrap">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b last:border-none">
                  {row.map((cell, cellIndex) => (
                    <td key={`${rowIndex}-${cellIndex}`} className="py-2 pr-2 whitespace-nowrap">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-softGray"
      onClick={onClick}
      aria-label={label}
    >
      {children}
    </button>
  );
}

const metricOptions: { value: DashboardMetric; label: string }[] = [
  { value: "weeklySales", label: "Ventas de la semana" },
  { value: "inventoryValue", label: "Valor del inventario" },
  { value: "criticalStock", label: "Stock crítico" },
  { value: "topProducts", label: "Productos más vendidos" },
  { value: "categorySales", label: "Ventas por categoría" },
  { value: "latestSales", label: "Últimas ventas" },
];
