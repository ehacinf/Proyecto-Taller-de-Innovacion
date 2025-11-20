import { useMemo, useState, type ChangeEvent } from "react";
import type { InvoiceLineItem, InvoiceRecord } from "../../types";
import { buildSiiXml, buildValidationWarnings, downloadXml, fileToDataUrl, parseInvoiceText } from "../../utils/invoice";

type InvoiceScannerProps = {
  defaultCurrency?: string;
  onProcessInvoice: (invoice: InvoiceRecord) => Promise<void>;
};

type TesseractModule = typeof import("tesseract.js");

let tesseractModule: TesseractModule | null = null;

async function loadTesseract() {
  if (!tesseractModule) {
    const mod = await import("tesseract.js");
    tesseractModule = mod.default ? (mod.default as TesseractModule) : (mod as TesseractModule);
  }
  return tesseractModule as TesseractModule;
}

type UploadState = {
  file: File;
  previewUrl?: string;
  status: "pendiente" | "procesando" | "listo" | "error";
  progress: number;
  parsed?: InvoiceRecord;
  error?: string;
};

const InvoiceScanner = ({ defaultCurrency = "CLP", onProcessInvoice }: InvoiceScannerProps) => {
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files?.length) return;

    const nextUploads = await Promise.all(
      Array.from(files).map(async (file) => ({
        file,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
        status: "pendiente" as const,
        progress: 0,
      }))
    );

    setUploads((prev) => [...prev, ...nextUploads]);
    setSelectedIndex(uploads.length);
  }

  async function handleProcess(uploadIndex: number) {
    const upload = uploads[uploadIndex];
    if (!upload) return;

    setUploads((prev) =>
      prev.map((item, idx) =>
        idx === uploadIndex
          ? {
              ...item,
              status: "procesando",
              progress: 5,
              error: undefined,
            }
          : item
      )
    );

    try {
      const Tesseract = await loadTesseract();
      const { data } = await Tesseract.recognize(upload.file, "spa+eng", {
        logger: (message) => {
          if (message.status === "recognizing text" && message.progress) {
            setUploads((prev) =>
              prev.map((item, idx) =>
                idx === uploadIndex
                  ? { ...item, progress: Math.round(message.progress * 100) }
                  : item
              )
            );
          }
        },
      });

      const parsed = parseInvoiceText(data.text || "", defaultCurrency);
      const fileContent = await fileToDataUrl(upload.file);
      const complete: InvoiceRecord = {
        ...parsed,
        fileName: upload.file.name,
        fileType: upload.file.type,
        previewUrl: upload.previewUrl || fileContent,
      };

      setUploads((prev) =>
        prev.map((item, idx) =>
          idx === uploadIndex
            ? {
                ...item,
                status: "listo",
                progress: 100,
                parsed: complete,
              }
            : item
        )
      );
      setSelectedIndex(uploadIndex);
    } catch (processingError: any) {
      console.error("Error procesando factura", processingError);
      setUploads((prev) =>
        prev.map((item, idx) =>
          idx === uploadIndex
            ? {
                ...item,
                status: "error",
                error: processingError?.message || "No pudimos leer el archivo",
              }
            : item
        )
      );
    }
  }

  function handleFieldChange(
    field: keyof InvoiceRecord,
    value: string,
    uploadIndex: number
  ) {
    setUploads((prev) =>
      prev.map((item, idx) => {
        if (idx !== uploadIndex || !item.parsed) return item;
        const updated: InvoiceRecord = {
          ...item.parsed,
          [field]: field === "issueDate" ? new Date(value) : field === "total" ? Number(value) : value,
        } as InvoiceRecord;
        updated.validationWarnings = buildValidationWarnings(updated);
        return { ...item, parsed: updated };
      })
    );
  }

  function handleItemChange(
    uploadIndex: number,
    itemIndex: number,
    field: keyof InvoiceLineItem,
    value: string
  ) {
    setUploads((prev) =>
      prev.map((upload, idx) => {
        if (idx !== uploadIndex || !upload.parsed) return upload;
        const items = upload.parsed.items.map((item, i) =>
          i === itemIndex
            ? {
                ...item,
                [field]: field === "description" ? value : Number(value),
                total:
                  field === "quantity" || field === "unitPrice"
                    ? Number(value) * (field === "quantity" ? item.unitPrice : item.quantity)
                    : field === "total"
                    ? Number(value)
                    : item.total,
              }
            : item
        );
        const parsed: InvoiceRecord = { ...upload.parsed, items };
        parsed.validationWarnings = buildValidationWarnings(parsed);
        return { ...upload, parsed };
      })
    );
  }

  async function handleSave(uploadIndex: number) {
    const upload = uploads[uploadIndex];
    if (!upload?.parsed) return;
    setSaving(true);
    setFeedback(null);
    setError(null);

    try {
      await onProcessInvoice(upload.parsed);
      setFeedback(`Factura ${upload.parsed.invoiceNumber} integrada en inventario y finanzas.`);
    } catch (savingError: any) {
      console.error("Error guardando factura", savingError);
      setError(savingError?.message || "No pudimos guardar la factura");
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  }

  const selectedUpload = useMemo(() => (selectedIndex === null ? null : uploads[selectedIndex]), [
    selectedIndex,
    uploads,
  ]);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Digitalización contable</p>
          <h3 className="text-lg font-semibold text-primary">Escanear facturas con OCR</h3>
          <p className="text-xs text-gray-500">Carga múltiples archivos, extrae campos y valida los montos antes de guardarlos.</p>
        </div>
        <label className="cursor-pointer bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:opacity-90">
          + Cargar facturas
          <input
            type="file"
            accept="image/*,.pdf"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
          />
        </label>
      </div>

      {uploads.length === 0 && (
        <div className="border border-dashed border-primary/30 rounded-xl p-6 text-center text-sm text-gray-500">
          <p>Arrastra tus facturas aquí o usa el botón "Cargar facturas".</p>
          <p className="text-xs text-gray-400 mt-2">Formatos soportados: JPG, PNG, PDF. Procesamos varios archivos a la vez.</p>
        </div>
      )}

      {uploads.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-2">
            {uploads.map((upload, index) => (
              <button
                key={upload.file.name + index}
                onClick={() => setSelectedIndex(index)}
                className={`w-full text-left p-3 rounded-xl border transition ${
                  selectedIndex === index ? "border-primary bg-primary/5" : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-primary">{upload.file.name}</p>
                    <p className="text-[11px] text-gray-500">{upload.file.type || "Archivo"}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                    {upload.status === "pendiente" && "Pendiente"}
                    {upload.status === "procesando" && `${upload.progress}%`}
                    {upload.status === "listo" && "Listo"}
                    {upload.status === "error" && "Error"}
                  </span>
                </div>
                {upload.status === "pendiente" && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      handleProcess(index);
                    }}
                    className="mt-2 text-xs bg-primary text-white px-3 py-2 rounded-lg"
                  >
                    Procesar con OCR
                  </button>
                )}
                {upload.status === "procesando" && (
                  <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-primary"
                      style={{ width: `${Math.min(upload.progress, 100)}%` }}
                    />
                  </div>
                )}
                {upload.error && <p className="text-xs text-red-500 mt-2">{upload.error}</p>}
              </button>
            ))}
          </div>

          <div className="lg:col-span-2 space-y-4">
            {!selectedUpload && <p className="text-sm text-gray-500">Selecciona una factura para revisarla.</p>}

            {selectedUpload?.parsed && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-3 items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-primary">Revisión de datos extraídos</p>
                    <p className="text-xs text-gray-500">Corrige si algo no coincide antes de integrarlo.</p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button
                      className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600"
                      onClick={() => {
                        if (!selectedUpload.parsed) return;
                        const xml = buildSiiXml(selectedUpload.parsed);
                        const numberForExport = selectedUpload.parsed.invoiceNumber || "sii";
                        downloadXml(xml, `factura-${numberForExport}.xml`);
                      }}
                    >
                      Exportar XML SII
                    </button>
                    {selectedUpload.parsed.previewUrl && (
                      <a
                        href={selectedUpload.parsed.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 rounded-lg border border-primary text-primary"
                      >
                        Ver original
                      </a>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="text-xs text-gray-600 space-y-1">
                    Proveedor
                    <input
                      type="text"
                      value={selectedUpload.parsed.supplier}
                      onChange={(event) => handleFieldChange("supplier", event.target.value, selectedIndex || 0)}
                      className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200"
                    />
                  </label>
                  <label className="text-xs text-gray-600 space-y-1">
                    Número de factura
                    <input
                      type="text"
                      value={selectedUpload.parsed.invoiceNumber}
                      onChange={(event) => handleFieldChange("invoiceNumber", event.target.value, selectedIndex || 0)}
                      className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200"
                    />
                  </label>
                  <label className="text-xs text-gray-600 space-y-1">
                    Fecha de emisión
                    <input
                      type="date"
                      value={selectedUpload.parsed.issueDate.toISOString().split("T")[0]}
                      onChange={(event) => handleFieldChange("issueDate", event.target.value, selectedIndex || 0)}
                      className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200"
                    />
                  </label>
                  <label className="text-xs text-gray-600 space-y-1">
                    Monto total
                    <input
                      type="number"
                      value={selectedUpload.parsed.total}
                      onChange={(event) => handleFieldChange("total", event.target.value, selectedIndex || 0)}
                      className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200"
                    />
                  </label>
                </div>

                {selectedUpload.parsed.validationWarnings?.length ? (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3 space-y-1">
                    <p className="font-semibold">Validación</p>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedUpload.parsed.validationWarnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg p-3">
                    Totales verificados. La suma de ítems coincide con el monto total.
                  </div>
                )}

                <div className="overflow-auto border border-gray-100 rounded-xl">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-3 py-2 text-left">Descripción</th>
                        <th className="px-3 py-2 text-left">Cantidad</th>
                        <th className="px-3 py-2 text-left">Precio unitario</th>
                        <th className="px-3 py-2 text-left">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedUpload.parsed.items.map((item, itemIndex) => (
                        <tr key={`${item.description}-${itemIndex}`} className="border-t">
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(event) =>
                                handleItemChange(selectedIndex || 0, itemIndex, "description", event.target.value)
                              }
                              className="w-full text-xs px-2 py-1 rounded border border-gray-200"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(event) =>
                                handleItemChange(selectedIndex || 0, itemIndex, "quantity", event.target.value)
                              }
                              className="w-full text-xs px-2 py-1 rounded border border-gray-200"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(event) =>
                                handleItemChange(selectedIndex || 0, itemIndex, "unitPrice", event.target.value)
                              }
                              className="w-full text-xs px-2 py-1 rounded border border-gray-200"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={item.total}
                              onChange={(event) =>
                                handleItemChange(selectedIndex || 0, itemIndex, "total", event.target.value)
                              }
                              className="w-full text-xs px-2 py-1 rounded border border-gray-200"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                  <button
                    onClick={() => handleSave(selectedIndex || 0)}
                    disabled={saving}
                    className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                  >
                    {saving ? "Guardando..." : "Guardar e integrar"}
                  </button>
                  {feedback && <span className="text-xs text-emerald-600">{feedback}</span>}
                  {error && <span className="text-xs text-red-500">{error}</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceScanner;
