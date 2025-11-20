import type { InvoiceLineItem, InvoiceRecord } from "../types";

function normalizeNumber(value: string | number | undefined): number {
  if (value === undefined) return 0;
  if (typeof value === "number") return value;
  const cleaned = value
    .replace(/[\$CLPclp]/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function tryParseDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const normalized = raw.replace(/-/g, "/");
  const [day, month, year] = normalized.split("/").map(Number);
  if (!day || !month || !year) return null;
  const iso = `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseInvoiceText(text: string, defaultCurrency = "CLP"): InvoiceRecord {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const supplier =
    lines.find((line) => /raz[oó]n|proveedor|empresa/i.test(line)) ||
    lines[0] ||
    "Proveedor sin nombre";

  const invoiceNumberMatch = text.match(/(N[°o]|Factura)\s*[:#]?\s*([A-Za-z0-9-]+)/i);
  const invoiceNumber = invoiceNumberMatch?.[2] ?? "Sin número";

  const dateMatch =
    text.match(/(\d{2}[\/-]\d{2}[\/-]\d{4})/) ||
    text.match(/(\d{4}[\/-]\d{2}[\/-]\d{2})/);
  const issueDate = tryParseDate(dateMatch?.[1]) || new Date();

  const totalMatch =
    text.match(/total\s*[:]?\s*\$?\s*([0-9.,]+)/i) ||
    text.match(/monto\s*(bruto|total)?\s*[:]?\s*\$?\s*([0-9.,]+)/i);
  const total = normalizeNumber(totalMatch?.[1] || totalMatch?.[2]) || 0;

  const items: InvoiceLineItem[] = [];
  const itemRegex = /^(.+?)\s+(\d+(?:[.,]\d+)?)\s+\$?\s*(\d+(?:[.,]\d+)?)\s+\$?\s*(\d+(?:[.,]\d+)?)/;

  lines.forEach((line) => {
    const match = line.match(itemRegex);
    if (match) {
      const description = match[1].trim();
      const quantity = normalizeNumber(match[2]) || 1;
      const unitPrice = normalizeNumber(match[3]);
      const totalPrice = normalizeNumber(match[4]) || unitPrice * quantity;
      items.push({
        description,
        quantity,
        unitPrice,
        total: totalPrice,
      });
    }
  });

  if (!items.length && total) {
    items.push({
      description: "Total factura",
      quantity: 1,
      unitPrice: total,
      total,
    });
  }

  const parsed: InvoiceRecord = {
    supplier,
    invoiceNumber,
    issueDate,
    total,
    currency: defaultCurrency,
    items,
    fileName: "",
    fileType: "",
    rawText: text,
  };

  parsed.validationWarnings = buildValidationWarnings(parsed);
  return parsed;
}

export function buildValidationWarnings(invoice: InvoiceRecord): string[] {
  const warnings: string[] = [];
  const itemsTotal = invoice.items.reduce((acc, item) => acc + item.total, 0);

  if (invoice.total && Math.abs(itemsTotal - invoice.total) > 1) {
    warnings.push(
      `El total (${invoice.total.toLocaleString()}) no coincide con la suma de ítems (${itemsTotal.toLocaleString()}).`
    );
  }

  if (!invoice.supplier || invoice.supplier === "Proveedor sin nombre") {
    warnings.push("No pudimos detectar el proveedor. Complétalo manualmente.");
  }

  if (!invoice.invoiceNumber || invoice.invoiceNumber === "Sin número") {
    warnings.push("No encontramos el número de factura.");
  }

  return warnings;
}

export function buildSiiXml(invoice: InvoiceRecord): string {
  const issueDate = invoice.issueDate.toISOString().split("T")[0];
  const itemsXml = invoice.items
    .map(
      (item, index) => `    <Detalle>
      <NroLinDet>${index + 1}</NroLinDet>
      <NmbItem>${item.description}</NmbItem>
      <QtyItem>${item.quantity}</QtyItem>
      <PrcItem>${item.unitPrice}</PrcItem>
      <MontoItem>${item.total}</MontoItem>
    </Detalle>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Factura>
  <Encabezado>
    <IdDoc>
      <TipoDTE>33</TipoDTE>
      <Folio>${invoice.invoiceNumber}</Folio>
      <FchEmis>${issueDate}</FchEmis>
    </IdDoc>
    <Emisor>
      <RznSoc>${invoice.supplier}</RznSoc>
    </Emisor>
    <Totales>
      <MntTotal>${invoice.total}</MntTotal>
    </Totales>
  </Encabezado>
  <DetalleItems>
${itemsXml}
  </DetalleItems>
</Factura>`;
}

export function downloadXml(xml: string, filename: string) {
  const blob = new Blob([xml], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("No se pudo leer el archivo"));
      }
    };
    reader.onerror = () => reject(reader.error || new Error("Error leyendo archivo"));
    reader.readAsDataURL(file);
  });
}
