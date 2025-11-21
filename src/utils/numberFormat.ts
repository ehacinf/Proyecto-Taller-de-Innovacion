const thousandFormatter = new Intl.NumberFormat("es-CL");

export function formatNumberInput(rawValue: string | number): string {
  const stringValue = typeof rawValue === "number" ? rawValue.toString() : rawValue;
  const digitsOnly = stringValue.replace(/\D/g, "");
  if (!digitsOnly || digitsOnly === "0") {
    return "";
  }
  const normalized = digitsOnly.replace(/^0+(?=\d)/, "");
  const numericValue = Number(normalized);
  if (!Number.isFinite(numericValue)) {
    return "";
  }
  return thousandFormatter.format(numericValue);
}

export function parseNumberInput(rawValue: string): number {
  const digitsOnly = rawValue.replace(/\D/g, "");
  if (!digitsOnly) return 0;
  const normalized = digitsOnly.replace(/^0+(?=\d)/, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
