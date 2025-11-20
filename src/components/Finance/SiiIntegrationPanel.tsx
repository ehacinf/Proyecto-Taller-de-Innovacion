import { useMemo, useState } from "react";
import type { BusinessSettings, Sale, SiiDocumentRequest, SiiDocumentStatus } from "../../types";
import { checkElectronicDocumentStatus, sendElectronicDocument } from "../../utils/sii";

type SiiIntegrationPanelProps = {
  settings?: BusinessSettings | null;
  currency?: string;
  sales: Sale[];
};

const initialDocForm = {
  type: "boleta" as const,
  customerName: "",
  customerTaxId: "",
  customerEmail: "",
  description: "",
  quantity: "1",
  unitPrice: "",
};

const SiiIntegrationPanel = ({ settings, currency = "CLP", sales }: SiiIntegrationPanelProps) => {
  const [docForm, setDocForm] = useState(initialDocForm);
  const [statusForm, setStatusForm] = useState({ trackId: "" });
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [statusResult, setStatusResult] = useState<SiiDocumentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const todayTotals = useMemo(() => {
    const today = new Date();
    const todaysSales = sales.filter((sale) =>
      sale.date.getFullYear() === today.getFullYear() &&
      sale.date.getMonth() === today.getMonth() &&
      sale.date.getDate() === today.getDate()
    );

    const total = todaysSales.reduce((acc, sale) => acc + sale.total, 0);
    const qty = todaysSales.reduce((acc, sale) => acc + sale.quantity, 0);

    return { count: todaysSales.length, total, qty };
  }, [sales]);

  const siiEnabled = Boolean(settings?.siiEnabled);
  const formattedTotal = new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(todayTotals.total);

  function handleDocChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setDocForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleStatusChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { value } = event.target;
    setStatusForm({ trackId: value });
  }

  async function handleSendDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;

    const quantity = Number(docForm.quantity) || 0;
    const unitPrice = Number(docForm.unitPrice) || 0;

    if (!quantity || !unitPrice || !docForm.customerName || !docForm.customerTaxId) {
      setError("Completa los campos obligatorios (cliente, RUT, cantidad y valor).");
      return;
    }

    const payload: SiiDocumentRequest = {
      type: docForm.type,
      customerName: docForm.customerName,
      customerTaxId: docForm.customerTaxId,
      customerEmail: docForm.customerEmail || undefined,
      items: [
        {
          description: docForm.description || "Venta registrada en SimpliGest",
          quantity,
          unitPrice,
        },
      ],
      total: quantity * unitPrice,
      issueDate: new Date(),
    };

    setSending(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await sendElectronicDocument(payload, settings);
      setFeedback(
        `Documento enviado al SII. Track ID: ${response.trackId} ${response.siiFolio ? `· Folio ${response.siiFolio}` : ""}`
      );
      setStatusResult(null);
      setDocForm(initialDocForm);
    } catch (err: any) {
      console.error("Error enviando documento electrónico", err);
      setError(err?.message || "No pudimos enviar el documento al SII");
    } finally {
      setSending(false);
    }
  }

  async function handleCheckStatus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (checking) return;

    const trackId = statusForm.trackId.trim();
    if (!trackId) {
      setError("Ingresa un Track ID para consultar");
      return;
    }

    setChecking(true);
    setFeedback(null);
    setError(null);

    try {
      const status = await checkElectronicDocumentStatus(trackId, settings);
      setStatusResult(status);
      setFeedback("Estado actualizado desde SII");
    } catch (err: any) {
      console.error("Error consultando estado SII", err);
      setError(err?.message || "No pudimos consultar el estado en SII");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Facturación electrónica</p>
          <h3 className="text-xl font-semibold text-primary">SII Chile</h3>
          <p className="text-xs text-gray-500">
            Genera boletas y facturas electrónicas cumpliendo la normativa chilena.
          </p>
          <p className="text-[11px] text-gray-500">
            {siiEnabled
              ? `Ambiente: ${settings?.siiEnvironment || "certificación"}`
              : "Activa la integración en Configuración para habilitar envíos"}
          </p>
        </div>
        <div className="text-right text-xs text-gray-500">
          <p>Ventas de hoy: {todayTotals.count}</p>
          <p>Total del día: {formattedTotal}</p>
          <p>Unidades: {todayTotals.qty}</p>
        </div>
      </div>

      <form onSubmit={handleSendDocument} className="space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Tipo de documento</span>
            <select
              name="type"
              value={docForm.type}
              onChange={handleDocChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
              disabled={!siiEnabled}
            >
              <option value="boleta">Boleta electrónica</option>
              <option value="factura">Factura electrónica</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Correo del receptor (opcional)</span>
            <input
              type="email"
              name="customerEmail"
              value={docForm.customerEmail}
              onChange={handleDocChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
              placeholder="cliente@empresa.cl"
              disabled={!siiEnabled}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Razón social / Cliente</span>
            <input
              type="text"
              name="customerName"
              value={docForm.customerName}
              onChange={handleDocChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
              disabled={!siiEnabled}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">RUT / ID tributario</span>
            <input
              type="text"
              name="customerTaxId"
              value={docForm.customerTaxId}
              onChange={handleDocChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
              placeholder="77.777.777-7"
              disabled={!siiEnabled}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Descripción</span>
            <input
              type="text"
              name="description"
              value={docForm.description}
              onChange={handleDocChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
              placeholder="Ej: Venta mostrador"
              disabled={!siiEnabled}
            />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Cantidad</span>
            <input
              type="number"
              name="quantity"
              value={docForm.quantity}
              onChange={handleDocChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
              min={1}
              disabled={!siiEnabled}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Precio unitario ({currency})</span>
            <input
              type="number"
              name="unitPrice"
              value={docForm.unitPrice}
              onChange={handleDocChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
              min={0}
              disabled={!siiEnabled}
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={!siiEnabled || sending}
              className="w-full bg-primary text-white py-2 rounded-xl text-sm hover:opacity-90 disabled:opacity-50"
            >
              {sending ? "Enviando..." : "Generar documento"}
            </button>
          </div>
        </div>
      </form>

      <div className="border-t border-gray-100 pt-3 space-y-2 text-xs">
        <p className="font-semibold text-primary">Consultar estado en SII</p>
        <form onSubmit={handleCheckStatus} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
          <input
            type="text"
            name="trackId"
            value={statusForm.trackId}
            onChange={handleStatusChange}
            className="px-3 py-2 rounded-xl border border-gray-200"
            placeholder="Track ID entregado por SII"
            disabled={!siiEnabled}
          />
          <button
            type="submit"
            disabled={!siiEnabled || checking}
            className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm hover:opacity-90 disabled:opacity-50"
          >
            {checking ? "Consultando..." : "Consultar"}
          </button>
        </form>

        {statusResult && (
          <div className="bg-softGray rounded-xl p-3 text-gray-700">
            <p className="font-semibold text-primary">Resultado</p>
            <p>Estado: {statusResult.status}</p>
            {statusResult.siiFolio && <p>Folio: {statusResult.siiFolio}</p>}
            {statusResult.receivedAt && <p>Recepción: {statusResult.receivedAt}</p>}
            {statusResult.accepted !== undefined && (
              <p>Aceptado por SII: {statusResult.accepted ? "Sí" : "Pendiente"}</p>
            )}
          </div>
        )}

        {feedback && <p className="text-green-600">{feedback}</p>}
        {error && <p className="text-red-500">{error}</p>}
      </div>
    </div>
  );
};

export default SiiIntegrationPanel;
