import type { BusinessSettings, SiiDocumentRequest, SiiDocumentResponse, SiiDocumentStatus } from "../types";

type SiiConfig = {
  apiUrl: string;
  apiKey: string;
  environment: "produccion" | "certificacion";
  resolutionNumber?: string;
  office?: string;
};

function buildConfig(settings?: BusinessSettings | null): SiiConfig | null {
  const apiUrl = settings?.siiApiUrl || (import.meta.env.VITE_SII_API_URL as string | undefined);
  const apiKey = settings?.siiApiKey || (import.meta.env.VITE_SII_API_KEY as string | undefined);
  const environment = settings?.siiEnvironment || "certificacion";

  if (!apiUrl || !apiKey) {
    return null;
  }

  return {
    apiUrl,
    apiKey,
    environment,
    resolutionNumber: settings?.siiResolutionNumber,
    office: settings?.siiOffice,
  };
}

export async function sendElectronicDocument(
  request: SiiDocumentRequest,
  settings?: BusinessSettings | null
): Promise<SiiDocumentResponse> {
  const config = buildConfig(settings);
  if (!config) {
    throw new Error("Faltan credenciales de SII para emitir documentos electrónicos");
  }

  const response = await fetch(`${config.apiUrl}/documents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "x-sii-env": config.environment,
      ...(config.resolutionNumber ? { "x-sii-resolucion": config.resolutionNumber } : {}),
      ...(config.office ? { "x-sii-office": config.office } : {}),
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SII respondió con error: ${errorText}`);
  }

  return response.json();
}

export async function checkElectronicDocumentStatus(
  trackId: string,
  settings?: BusinessSettings | null
): Promise<SiiDocumentStatus> {
  const config = buildConfig(settings);
  if (!config) {
    throw new Error("Faltan credenciales de SII para consultar el estado de un documento");
  }

  const response = await fetch(`${config.apiUrl}/documents/${trackId}/status`, {
    headers: {
      "x-api-key": config.apiKey,
      "x-sii-env": config.environment,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`No pudimos consultar el estado: ${errorText}`);
  }

  return response.json();
}
