import { useMemo } from "react";
import type {
  BusinessSettings,
  Product,
  ProductInsight,
  Sale,
  Transaction,
} from "../../types";

type AIPanelProps = {
  products: Product[];
  sales: Sale[];
  transactions: Transaction[];
  insights: ProductInsight[];
  settings: BusinessSettings | null;
  loadingSales: boolean;
  loadingProducts: boolean;
  loadingTransactions: boolean;
  lastSyncAt: Date | null;
};

type ActionCard = {
  title: string;
  description: string;
  severity: "positivo" | "alerta" | "info";
};

const formatter = (currency?: string) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: currency || "CLP",
    maximumFractionDigits: 0,
  });

export default function AIPanel({
  products,
  sales,
  transactions,
  insights,
  settings,
  loadingSales,
  loadingProducts,
  loadingTransactions,
  lastSyncAt,
}: AIPanelProps) {
  const currency = settings?.currency || "CLP";
  const formatCurrency = formatter(currency).format;

  const lastSyncLabel = useMemo(() => {
    if (!lastSyncAt) return "Sincronizando en segundo plano";
    return `Última sincronización: ${lastSyncAt.toLocaleString()}`;
  }, [lastSyncAt]);

  const windowStart = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return start;
  }, []);

  const { revenue7d, salesCount7d, bestSeller } = useMemo(() => {
    const filtered = sales.filter((sale) => sale.date >= windowStart);
    const total = filtered.reduce((acc, sale) => acc + sale.total, 0);
    const counts = new Map<string, number>();
    filtered.forEach((sale) => {
      counts.set(sale.productId, (counts.get(sale.productId) || 0) + sale.quantity);
    });

    let champion: { productId: string; total: number } | null = null;
    counts.forEach((totalQuantity, productId) => {
      if (!champion || totalQuantity > champion.total) {
        champion = { productId, total: totalQuantity };
      }
    });

    const championProduct = champion
      ? products.find((product) => product.id === champion?.productId)
      : null;

    return {
      revenue7d: total,
      salesCount7d: filtered.length,
      bestSeller: championProduct,
    };
  }, [products, sales, windowStart]);

  const lowStockProducts = useMemo(() => {
    const fallback = settings?.defaultStockMin || 0;
    return products.filter((product) => {
      const min = product.stockMin || fallback;
      return min > 0 && product.stock <= min;
    });
  }, [products, settings?.defaultStockMin]);

  const cashBalance = useMemo(() => {
    return transactions.reduce(
      (acc, transaction) =>
        transaction.type === "income"
          ? acc + transaction.amount
          : acc - transaction.amount,
      0
    );
  }, [transactions]);

  const hygieneFindings = useMemo(() => {
    const missingPrice = products
      .filter((product) => !product.salePrice || product.salePrice <= 0)
      .slice(0, 3);
    const missingCategory = products
      .filter((product) => !product.category && !product.categoria)
      .slice(0, 3);
    const zeroStock = products.filter((product) => product.stock === 0).slice(0, 3);

    return {
      missingPrice,
      missingCategory,
      zeroStock,
    };
  }, [products]);

  const opportunities = useMemo(() => {
    return insights
      .filter((insight) => Math.abs(insight.priceRecommendation.variationPercentage) >= 8)
      .slice(0, 4);
  }, [insights]);

  const slowMovers = useMemo(() => {
    const window30d = new Date();
    window30d.setDate(window30d.getDate() - 30);
    const soldIds = new Set(
      sales
        .filter((sale) => sale.date >= window30d)
        .map((sale) => sale.productId)
    );

    return products
      .filter((product) => !soldIds.has(product.id))
      .slice(0, 3);
  }, [products, sales]);

  const guidanceSteps = useMemo(() => {
    const steps = [
      "1) Revisa que cada producto tenga precio y stock visible.",
      "2) Anota las ventas del día con el botón Vender Rápido.",
      "3) Cierra caja: registra ingresos y egresos en Finanzas.",
      "4) Activa alertas de stock para no quedarte sin tus favoritos.",
    ];

    if (lowStockProducts.length > 0) {
      steps.unshift(
        `⚠️ Hay ${lowStockProducts.length} productos con stock bajo. Repón o limita ventas antes de que se agoten.`
      );
    }

    if (hygieneFindings.missingPrice.length > 0) {
      steps.unshift("Corrige precios vacíos para que el sistema calcule márgenes.");
    }

    return steps.slice(0, 5);
  }, [hygieneFindings.missingPrice.length, lowStockProducts.length]);

  const correctionTips = useMemo(() => {
    const tips: string[] = [];

    if (hygieneFindings.missingPrice.length) {
      tips.push(
        "Algunos productos no tienen precio de venta. Agrégalo para evitar ventas con valor cero y mantener márgenes claros."
      );
    }

    if (hygieneFindings.zeroStock.length) {
      tips.push(
        "Detectamos productos con stock en cero. Puedes pausar su venta o activar preventa para no perder pedidos."
      );
    }

    if (hygieneFindings.missingCategory.length) {
      tips.push(
        "Hay fichas sin categoría. Asignar una ayuda a ordenar reportes y sugerencias automáticas."
      );
    }

    return tips;
  }, [hygieneFindings]);

  const conceptNotes = useMemo(
    () => [
      "Stock mínimo: es la cantidad de seguridad para no quedar en cero. Si llegas a ese número, repón o frena descuentos.",
      "Margen sano: precio de venta menos costo. Manténlo positivo para financiar envíos y campañas.",
      "Rotación: productos que se venden poco inmovilizan caja. Úsalos en kits o promociones rápidas.",
    ],
    []
  );

  const preventiveAlerts = useMemo(() => {
    const alerts: string[] = [];

    if (cashBalance < 0) {
      alerts.push(
        "El saldo de caja está en negativo. Revisa egresos grandes o aplaza compras hasta equilibrar."
      );
    }

    if (lowStockProducts.length > 0) {
      alerts.push(
        "Hay riesgo de quiebre de stock. Envía un aviso a clientes con tiempos de reposición claros."
      );
    }

    if (slowMovers.length > 0) {
      alerts.push(
        "Tienes productos con pocas salidas este mes. Muéstralos en combos o con envío gratis limitado."
      );
    }

    return alerts;
  }, [cashBalance, lowStockProducts.length, slowMovers.length]);

  const decisionMoves = useMemo(() => {
    const moves: { title: string; reason: string; action: string }[] = [];

    if (opportunities.length) {
      moves.push({
        title: "Ajusta precios sugeridos",
        reason: "La IA detectó variaciones relevantes en demanda y margen.",
        action: "Actualiza la lista con el precio recomendado para mantener coherencia entre tienda y web.",
      });
    }

    if (slowMovers.length) {
      moves.push({
        title: "Mueve inventario lento",
        reason: "Algunos productos no registran ventas en 30 días.",
        action: "Crea un pack con el más vendido o aplica un descuento corto con tope de stock para medir interés.",
      });
    }

    if (hygieneFindings.zeroStock.length > 2) {
      moves.push({
        title: "Prioriza reposición",
        reason: "Varias fichas quedaron en cero stock.",
        action: "Compra solo lo imprescindible y activa lista de espera para capturar correos sin prometer entregas irreales.",
      });
    }

    if (cashBalance > 0 && bestSeller) {
      moves.push({
        title: "Invierte en tu producto estrella",
        reason: `${bestSeller.name} concentra demanda reciente.`,
        action: "Reinvierta una parte del saldo de caja en inventario y anuncios simples destacando envío rápido.",
      });
    }

    return moves;
  }, [bestSeller, cashBalance, hygieneFindings.zeroStock.length, opportunities.length, slowMovers.length]);

  const webCopies = useMemo(() => {
    const heroProduct = bestSeller ?? products[0];
    const stockFocus = lowStockProducts[0];
    return [
      heroProduct
        ? `Destaca ${heroProduct.name} en la home: "${heroProduct.name} con entrega inmediata y soporte en español".`
        : "Destaca tu producto estrella con un titular claro y una promesa de entrega.",
      `Incluye un bloque de beneficios en la web: despacho rápido, seguimiento en tiempo real y soporte humano.`,
      stockFocus
        ? `Habilita preventa web para ${stockFocus.name} y captura correos mientras repones stock.`
        : "Activa un banner de confianza: stock en línea, precios claros y medios de pago locales.",
    ];
  }, [bestSeller, lowStockProducts, products]);

  const actionCards: ActionCard[] = useMemo(() => {
    const cards: ActionCard[] = [
      {
        title: "Checklist web listo",
        description: `Publica las fichas con precios en ${currency} y resalta medios de pago locales para reducir abandono de carrito.`,
        severity: "info",
      },
    ];

    if (lowStockProducts.length) {
      cards.push({
        title: "Previene quiebres en la tienda",
        description: `${lowStockProducts.length} productos están en stock crítico. Activa un mensaje de "últimas unidades" y abre lista de espera para no perder leads web.`,
        severity: "alerta",
      });
    }

    if (bestSeller) {
      cards.push({
        title: "Destaca tu gancho",
        description: `Agrega una sección hero en la landing con ${bestSeller.name} y una prueba social (reseñas o casos de uso).`,
        severity: "positivo",
      });
    }

    if (opportunities.length) {
      cards.push({
        title: "Optimiza precios en línea",
        description: `Hay ${opportunities.length} productos con ajuste sugerido. Alinea el catálogo web para mantener margen y coherencia.`,
        severity: "info",
      });
    }

    return cards;
  }, [bestSeller, currency, lowStockProducts.length, opportunities.length]);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <section className="xl:col-span-2 space-y-4">
        <div className="bg-white rounded-3xl shadow-sm p-6 flex flex-col gap-4">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-primary">Copiloto</p>
              <h2 className="text-2xl font-semibold text-primary">Panel de IA enfocado en web</h2>
              <p className="text-sm text-gray-600">Recomendaciones accionables usando tus ventas, inventario y márgenes.</p>
            </div>
            <span className="text-xs px-3 py-2 bg-softGray rounded-xl text-gray-500 border border-gray-200">{lastSyncLabel}</span>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <InsightCard
              label="Ingresos últimos 7 días"
              value={loadingSales ? "Calculando..." : formatCurrency(revenue7d)}
              helper={loadingSales ? "Sincronizando ventas" : `${salesCount7d} tickets emitidos`}
            />
            <InsightCard
              label="Producto estrella"
              value={loadingSales || loadingProducts ? "Cargando..." : bestSeller?.name ?? "Aún sin favoritos"}
              helper={bestSeller ? "Impúlsalo en tu portada" : "Promueve un kit de inicio"}
            />
            <InsightCard
              label="Saldo caja" 
              value={loadingTransactions ? "Cargando..." : formatCurrency(cashBalance)}
              helper={loadingTransactions ? "Conciliando" : "Incluye medios de pago claros en la web"}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-3xl shadow-sm p-5 space-y-3 border border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-primary">Acciones recomendadas</h3>
              <span className="text-[11px] text-gray-500">Prioriza las de impacto web</span>
            </div>
            <div className="space-y-3">
              {actionCards.map((card) => (
                <ActionCard key={card.title} {...card} />
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm p-5 space-y-3 border border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-primary">Ideas listas para publicar</h3>
              <span className="text-[11px] text-gray-500">Copias y ganchos web</span>
            </div>
            <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
              {webCopies.map((idea, index) => (
                <li key={index} className="leading-relaxed">{idea}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-5 space-y-3 border border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary">Oportunidades en el catálogo</h3>
            <span className="text-[11px] text-gray-500">Alinea precios y stock web</span>
          </div>
          {opportunities.length === 0 ? (
            <p className="text-sm text-gray-600">Aún no hay ajustes sugeridos. Mantén tus fichas web con fotos, stock y precio actualizado.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {opportunities.map((item) => (
                <div
                  key={item.productId}
                  className="border border-gray-200 rounded-2xl p-4 flex flex-col gap-2 bg-softGray/40"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-primary">{item.productName}</h4>
                    <span
                      className={`text-[11px] px-2 py-1 rounded-full ${
                        item.priceRecommendation.variationPercentage > 0
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {item.priceRecommendation.variationPercentage > 0 ? "Subir precio" : "Revisar descuento"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{item.priceRecommendation.rationale}</p>
                  <p className="text-xs text-gray-500">
                    Precio sugerido: {formatCurrency(item.priceRecommendation.recommendedPrice)} ({
                      item.priceRecommendation.variationPercentage.toFixed(1)
                    }
                    %)
                  </p>
                  <p className="text-xs text-gray-500">
                    Stock proyectado: {item.stockoutInDays ? `${item.stockoutInDays} días antes de quiebre` : "Sin riesgo a corto plazo"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-3xl shadow-sm p-5 space-y-3 border border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-primary">Guía inteligente</h3>
              <span className="text-[11px] text-gray-500">Pasos claros</span>
            </div>
            <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
              {guidanceSteps.map((step) => (
                <li key={step} className="leading-relaxed">
                  {step}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-3xl shadow-sm p-5 space-y-3 border border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-primary">Corrección amable</h3>
              <span className="text-[11px] text-gray-500">Errores y solución</span>
            </div>
            {correctionTips.length === 0 ? (
              <p className="text-sm text-gray-600">Sin errores visibles. Sigue cargando datos y la IA los mantendrá limpios.</p>
            ) : (
              <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                {correctionTips.map((tip) => (
                  <li key={tip} className="leading-relaxed">
                    {tip}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-3xl shadow-sm p-5 space-y-3 border border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-primary">Conceptos clave</h3>
              <span className="text-[11px] text-gray-500">Explicados simple</span>
            </div>
            <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
              {conceptNotes.map((note) => (
                <li key={note} className="leading-relaxed">
                  {note}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-3xl shadow-sm p-5 space-y-3 border border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-primary">Alertas preventivas</h3>
              <span className="text-[11px] text-gray-500">Nos adelantamos</span>
            </div>
            {preventiveAlerts.length === 0 ? (
              <p className="text-sm text-gray-600">Todo en orden. Seguimos monitoreando riesgos antes de que aparezcan.</p>
            ) : (
              <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                {preventiveAlerts.map((alert) => (
                  <li key={alert} className="leading-relaxed">
                    {alert}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-3xl shadow-sm p-5 space-y-3 border border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-primary">Decisiones propuestas</h3>
              <span className="text-[11px] text-gray-500">Con explicación</span>
            </div>
            {decisionMoves.length === 0 ? (
              <p className="text-sm text-gray-600">Aún sin decisiones críticas. La IA sugerirá ajustes cuando vea oportunidad.</p>
            ) : (
              <div className="space-y-3">
                {decisionMoves.map((move) => (
                  <div key={move.title} className="border border-gray-200 rounded-2xl p-3 bg-softGray/40">
                    <p className="text-sm font-semibold text-primary">{move.title}</p>
                    <p className="text-xs text-gray-600">{move.reason}</p>
                    <p className="text-xs text-gray-700 mt-1">{move.action}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="bg-primary text-white rounded-3xl shadow-sm p-5 space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-white/70">Enfocado en la web</p>
          <h3 className="text-2xl font-semibold">Checklist de conversión</h3>
          <ul className="space-y-2 text-sm text-white/90 list-disc list-inside">
            <li>Catálogo con stock y precio coherente con tienda física.</li>
            <li>Entrega estimada visible en cada ficha de producto.</li>
            <li>Sección FAQ con devoluciones, despacho y garantías.</li>
            <li>CTA de contacto humano y WhatsApp siempre visible.</li>
          </ul>
          <p className="text-xs text-white/80 bg-white/10 rounded-2xl px-3 py-2 inline-flex">
            Tip: reutiliza estos mensajes en tu landing, campañas y chat de soporte.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-5 space-y-3 border border-gray-100">
          <h3 className="text-lg font-semibold text-primary">Salud operativa</h3>
          <HealthRow
            label="Ventas sincronizadas"
            value={loadingSales ? "—" : `${sales.length} tickets`}
            status={loadingSales ? "sync" : sales.length > 0 ? "ok" : "review"}
          />
          <HealthRow
            label="Productos con stock crítico"
            value={loadingProducts ? "—" : `${lowStockProducts.length}`}
            status={loadingProducts ? "sync" : lowStockProducts.length === 0 ? "ok" : "review"}
          />
          <HealthRow
            label="Movimientos contables"
            value={loadingTransactions ? "—" : `${transactions.length}`}
            status={loadingTransactions ? "sync" : transactions.length > 0 ? "ok" : "review"}
          />
          <HealthRow
            label="Plan activo"
            value={settings?.planName || "Beta gratuita"}
            status="ok"
          />
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-5 space-y-2 border border-gray-100">
          <h3 className="text-lg font-semibold text-primary">Sugerencias rápidas</h3>
          <ul className="space-y-1 text-sm text-gray-700 list-disc list-inside">
            <li>Incluye un bloque de "Lo más vendido" en la home con badges de stock.</li>
            <li>Conecta tu catálogo a Google Merchant Center para captar tráfico gratuito.</li>
            <li>Usa el mensaje "Despacho hoy si compras antes de las 14:00" en campañas.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

function InsightCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="border border-gray-200 rounded-2xl p-4 bg-softGray/40">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold text-primary">{value}</p>
      <p className="text-[11px] text-gray-500">{helper}</p>
    </div>
  );
}

function ActionCard({ title, description, severity }: ActionCard) {
  const colors: Record<ActionCard["severity"], string> = {
    positivo: "bg-green-50 text-green-700",
    alerta: "bg-amber-50 text-amber-700",
    info: "bg-blue-50 text-blue-700",
  };

  return (
    <div className="border border-gray-200 rounded-2xl p-4 bg-softGray/40 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-primary">{title}</h4>
        <span className={`text-[11px] px-2 py-1 rounded-full ${colors[severity]}`}>
          {severity === "positivo"
            ? "Acción clave"
            : severity === "alerta"
              ? "Atención"
              : "Sugerencia"}
        </span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
    </div>
  );
}

function HealthRow({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: "ok" | "review" | "sync";
}) {
  const icon = status === "ok" ? "✅" : status === "sync" ? "⏳" : "⚠️";
  const color =
    status === "ok"
      ? "text-green-700"
      : status === "sync"
        ? "text-blue-700"
        : "text-amber-700";

  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-gray-700">
        <span>{icon}</span>
        <p>{label}</p>
      </div>
      <p className={`text-xs ${color}`}>{value}</p>
    </div>
  );
}
