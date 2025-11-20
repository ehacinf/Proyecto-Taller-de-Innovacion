import type { Product, ProductInsight, Sale } from "../types";

const DAYS_WINDOW = 90;
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const SAFETY_DAYS = 14;

export function calculateProductInsights(
  products: Product[],
  sales: Sale[]
): ProductInsight[] {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - DAYS_WINDOW);

  const salesByProduct = new Map<string, Sale[]>();

  sales.forEach((sale) => {
    if (sale.date < windowStart) return;
    const list = salesByProduct.get(sale.productId) ?? [];
    list.push(sale);
    salesByProduct.set(sale.productId, list);
  });

  return products.map((product) => {
    const productSales = salesByProduct.get(product.id) ?? [];
    const totalQuantity = productSales.reduce((acc, sale) => acc + sale.quantity, 0);
    const elapsedDays = Math.max(
      1,
      (Date.now() - windowStart.getTime()) / MS_PER_DAY
    );
    const weeklyDemand = (totalQuantity / elapsedDays) * 7;
    const dailyDemand = weeklyDemand / 7;

    const last30 = windowedQuantity(productSales, 30);
    const previous30 = windowedQuantity(productSales, 60) - last30;
    const hasPreviousWindow = previous30 > 0;
    const trendRatio = hasPreviousWindow ? (last30 - previous30) / previous30 : 0;

    const demandLevel = resolveDemandLevel(weeklyDemand, product.stockMin);
    const stockoutInDays = dailyDemand > 0 ? Math.ceil(product.stock / dailyDemand) : null;

    const targetCoverage = dailyDemand * SAFETY_DAYS + product.stockMin;
    const purchaseSuggestion = Math.max(0, Math.ceil(targetCoverage - product.stock));

    const averageMargin = computeAverageMargin(productSales, product.purchasePrice);
    const demandAdjustment = demandLevel === "alta" ? 0.05 : demandLevel === "baja" ? -0.03 : 0;
    const marketAdjustment = trendRatio > 0.05 ? 0.03 : trendRatio < -0.05 ? -0.02 : 0.01;
    const recommendedPrice =
      product.purchasePrice * (1 + averageMargin + demandAdjustment + marketAdjustment);
    const safeRecommendedPrice = Number.isFinite(recommendedPrice)
      ? recommendedPrice
      : product.salePrice;
    const priceVariationPct = product.salePrice
      ? ((safeRecommendedPrice - product.salePrice) / product.salePrice) * 100
      : 0;

    return {
      productId: product.id,
      productName: product.name,
      predictedWeeklyDemand: weeklyDemand,
      predictedDailyDemand: dailyDemand,
      demandLevel,
      stockoutInDays,
      purchaseSuggestion,
      priceRecommendation: {
        recommendedPrice: safeRecommendedPrice,
        variationPercentage: priceVariationPct,
        rationale: buildRationale(demandLevel, averageMargin, trendRatio),
      },
    };
  });
}

function resolveDemandLevel(weeklyDemand: number, stockMin: number) {
  if (weeklyDemand >= Math.max(10, stockMin * 1.5)) return "alta" as const;
  if (weeklyDemand >= Math.max(3, stockMin * 0.8)) return "media" as const;
  return "baja" as const;
}

function windowedQuantity(sales: Sale[], days: number) {
  const start = new Date();
  start.setDate(start.getDate() - days);
  return sales.reduce((acc, sale) => (sale.date >= start ? acc + sale.quantity : acc), 0);
}

function computeAverageMargin(sales: Sale[], purchasePrice: number) {
  if (sales.length === 0 || purchasePrice <= 0) {
    return 0.25;
  }

  const margins = sales.map((sale) => (sale.unitPrice - purchasePrice) / purchasePrice);
  const validMargins = margins.filter((margin) => Number.isFinite(margin));
  if (validMargins.length === 0) return 0.25;

  const sum = validMargins.reduce((acc, margin) => acc + margin, 0);
  return sum / validMargins.length;
}

function buildRationale(
  demandLevel: ProductInsight["demandLevel"],
  averageMargin: number,
  trendRatio: number
) {
  const demandText =
    demandLevel === "alta"
      ? "la demanda proyectada es alta"
      : demandLevel === "media"
      ? "la demanda se mantiene estable"
      : "la demanda proyectada es baja";

  const marginText = averageMargin >= 0.35
    ? "históricamente vendes con buen margen"
    : averageMargin >= 0.2
    ? "el margen promedio es saludable"
    : "el margen histórico es ajustado";

  const trendText = trendRatio > 0.05
    ? "las ventas vienen creciendo"
    : trendRatio < -0.05
    ? "las ventas muestran desaceleración"
    : "el volumen se mantiene estable";

  return `${demandText}, ${marginText} y ${trendText}.`;
}
