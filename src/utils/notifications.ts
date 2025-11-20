import type { BusinessSettings, Product, Sale } from "../types";

type TwilioConfig = {
  accountSid: string;
  authToken: string;
  fromNumber: string;
};

function getTwilioConfig(settings?: BusinessSettings | null): TwilioConfig | null {
  const accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID as string | undefined;
  const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN as string | undefined;
  const fromNumber =
    settings?.whatsappFrom || (import.meta.env.VITE_TWILIO_WHATSAPP_FROM as string | undefined);

  if (!accountSid || !authToken || !fromNumber) {
    return null;
  }

  return { accountSid, authToken, fromNumber };
}

async function sendWhatsAppMessage(
  toNumber: string,
  body: string,
  settings?: BusinessSettings | null
) {
  const twilioConfig = getTwilioConfig(settings);
  if (!twilioConfig) {
    throw new Error("Faltan credenciales de Twilio para enviar mensajes de WhatsApp");
  }

  const { accountSid, authToken, fromNumber } = twilioConfig;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const payload = new URLSearchParams({
    From: `whatsapp:${fromNumber}`,
    To: `whatsapp:${toNumber}`,
    Body: body,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: payload,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twilio respondió con error: ${errorText}`);
  }

  return response.json();
}

function formatCurrency(amount: number, currency = "CLP") {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function sendLowStockAlert(
  product: Product,
  settings: BusinessSettings,
  businessName: string
) {
  const body =
    `⚠️ Alerta de stock bajo (${businessName})\n` +
    `Producto: ${product.name}\n` +
    `Stock restante: ${product.stock} ${product.unit || "unidades"}\n` +
    `Stock mínimo definido: ${product.stockMin}`;

  const destination = settings.whatsappNumber || settings.phone;
  if (!destination) {
    throw new Error("No hay un número de WhatsApp configurado para alertas");
  }

  return sendWhatsAppMessage(destination, body, settings);
}

export async function sendDailySalesSummary(
  sales: Sale[],
  settings: BusinessSettings,
  currency = "CLP",
  businessName?: string
) {
  const today = new Date();
  const todaysSales = sales.filter((sale) => isSameDay(sale.date, today));
  if (todaysSales.length === 0) {
    throw new Error("No hay ventas para resumir hoy");
  }

  const total = todaysSales.reduce((acc, sale) => acc + sale.total, 0);
  const units = todaysSales.reduce((acc, sale) => acc + sale.quantity, 0);

  const sortedProducts = Object.entries(
    todaysSales.reduce<Record<string, number>>((acc, sale) => {
      acc[sale.productName] = (acc[sale.productName] || 0) + sale.total;
      return acc;
    }, {})
  ).sort(([, a], [, b]) => b - a);

  const bestSeller = sortedProducts[0];

  const lines = [
    `📊 Resumen de ventas ${businessName ? `- ${businessName}` : ""}`.trim(),
    `Fecha: ${today.toLocaleDateString("es-CL")}`,
    `Total vendido: ${formatCurrency(total, currency)}`,
    `Unidades vendidas: ${units}`,
  ];

  if (bestSeller) {
    lines.push(`Más vendido: ${bestSeller[0]} (${formatCurrency(bestSeller[1], currency)})`);
  }

  lines.push("Gracias por usar SimpliGest. 🧾");

  const destination = settings.whatsappNumber || settings.phone;
  if (!destination) {
    throw new Error("No hay un número de WhatsApp configurado para enviar el resumen");
  }

  return sendWhatsAppMessage(destination, lines.join("\n"), settings);
}

export function isSameDay(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

export function shouldSendDailySummary(now: Date, targetTime?: string) {
  if (!targetTime) return true;
  const [hours, minutes] = targetTime.split(":").map((value) => Number(value) || 0);
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  return now.getTime() >= target.getTime();
}
