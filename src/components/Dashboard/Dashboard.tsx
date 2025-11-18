import { useMemo } from "react";
import type { Product, Sale } from "../../types";

type DashboardProps = {
  products: Product[];
  sales: Sale[];
  latestSales: Sale[];
  loadingProducts: boolean;
  loadingSales: boolean;
};

const Dashboard = ({
  products,
  sales,
  latestSales,
  loadingProducts,
  loadingSales,
}: DashboardProps) => {
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

  const chartData = useMemo(() => {
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
  }, [sales]);

  const chartMax = Math.max(...chartData.map((item) => item.value), 1);

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

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-primary">Ventas recientes</h3>
              <p className="text-xs text-gray-500">
                Últimos movimientos registrados en tu punto de venta.
              </p>
            </div>
          </div>

          {loadingSales ? (
            <p className="text-xs text-gray-500">Cargando ventas...</p>
          ) : latestSales.length === 0 ? (
            <p className="text-xs text-gray-500">
              Aún no registras ventas. Usa “+ Venta rápida” para comenzar.
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2">Producto</th>
                  <th className="py-2">Cantidad</th>
                  <th className="py-2">Total</th>
                  <th className="py-2">Fecha</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {latestSales.map((sale) => (
                  <tr key={sale.id} className="border-b last:border-none">
                    <td className="py-2">{sale.productName}</td>
                    <td className="py-2">{sale.quantity}</td>
                    <td className="py-2">{formatCurrency(sale.total)}</td>
                    <td className="py-2">
                      {sale.date.toLocaleDateString("es-CL", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-semibold text-primary">Ventas por día</h3>
          <p className="text-xs text-gray-500 mb-3">
            Total facturado durante los últimos 7 días.
          </p>
          <div className="flex items-end gap-2 h-40">
            {chartData.map((item) => (
              <div key={item.label} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-primary/10 rounded-full overflow-hidden h-full flex items-end">
                  <div
                    className="w-full bg-primary rounded-full transition-all"
                    style={{ height: `${(item.value / chartMax) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] uppercase text-gray-500">{item.label}</p>
                <p className="text-[11px] text-gray-600">{formatCurrency(item.value)}</p>
              </div>
            ))}
          </div>
        </div>
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

function KpiCard({ title, value, subtitle, positive }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-primaryLight">{title}</p>
      <h3 className="text-xl font-semibold text-primary">{value}</h3>
      <p className={`text-xs ${positive ? "text-green-600" : "text-gray-500"}`}>{subtitle}</p>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}
