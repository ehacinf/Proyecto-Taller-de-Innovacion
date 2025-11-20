import { useMemo, useState } from "react";
import type React from "react";
import type { BusinessSettings, InvoiceRecord, Sale, Transaction, TransactionPayload } from "../../types";
import { sendDailySalesSummary } from "../../utils/notifications";
import SiiIntegrationPanel from "./SiiIntegrationPanel";
import InvoiceScanner from "./InvoiceScanner";

type FinancePageProps = {
  sales: Sale[];
  transactions: Transaction[];
  loadingSales: boolean;
  loadingTransactions: boolean;
  onAddTransaction: (payload: TransactionPayload) => Promise<void>;
  onProcessInvoice: (invoice: InvoiceRecord) => Promise<void>;
  errorMessage?: string | null;
  defaultTaxRate?: number;
  currency?: string;
  settings?: BusinessSettings | null;
  canManageFinances?: boolean;
};

type Movement = {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  date: Date;
  source: string;
};

const FinancePage = ({
  sales,
  transactions,
  loadingSales,
  loadingTransactions,
  onAddTransaction,
  onProcessInvoice,
  errorMessage,
  defaultTaxRate = 19,
  currency = "CLP",
  settings,
  canManageFinances = true,
}: FinancePageProps) => {
  const [formValues, setFormValues] = useState({
    type: "income",
    amount: "",
    description: "",
    category: "",
    date: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [summarySending, setSummarySending] = useState(false);
  const [summaryFeedback, setSummaryFeedback] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const salesIncome = useMemo(
    () => sales.reduce((acc, sale) => acc + sale.total, 0),
    [sales]
  );

  const manualIncome = useMemo(
    () =>
      transactions.reduce((acc, transaction) => {
        if (transaction.type === "income") {
          return acc + transaction.amount;
        }
        return acc;
      }, 0),
    [transactions]
  );

  const manualExpense = useMemo(
    () =>
      transactions.reduce((acc, transaction) => {
        if (transaction.type === "expense") {
          return acc + transaction.amount;
        }
        return acc;
      }, 0),
    [transactions]
  );

  const totalIncome = salesIncome + manualIncome;
  const balance = totalIncome - manualExpense;
  const estimatedVat = totalIncome * (defaultTaxRate / 100);

  const movements = useMemo<Movement[]>(() => {
    const saleMovements: Movement[] = sales.map((sale) => ({
      id: sale.id,
      type: "income",
      amount: sale.total,
      description: sale.productName,
      category: "Venta rápida",
      date: sale.date,
      source: "Venta",
    }));

    const transactionMovements: Movement[] = transactions.map((transaction) => ({
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      category: transaction.category,
      date: transaction.date,
      source: "Manual",
    }));

    return [...saleMovements, ...transactionMovements].sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
  }, [sales, transactions]);

  async function handleSendSummary() {
    if (!canManageFinances) {
      setSummaryError("No tienes permisos para enviar resúmenes");
      return;
    }
    if (!settings || !settings.whatsappEnabled) {
      setSummaryError("Activa WhatsApp y configura un número en Configuración.");
      return;
    }

    setSummarySending(true);
    setSummaryError(null);
    setSummaryFeedback(null);

    try {
      await sendDailySalesSummary(
        sales,
        settings,
        currency,
        settings.businessName || "SimpliGest"
      );
      setSummaryFeedback("Resumen de ventas enviado por WhatsApp.");
    } catch (error: any) {
      console.error("Error enviando resumen diario", error);
      setSummaryError(error?.message || "No pudimos enviar el resumen");
    } finally {
      setSummarySending(false);
      setTimeout(() => setSummaryFeedback(null), 4000);
    }
  }

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (!canManageFinances) {
      setFormError("Tu rol no puede registrar movimientos");
      return;
    }

    const amount = Number(formValues.amount);
    if (!amount) {
      setFormError("Ingresa un monto válido");
      return;
    }

    const payload: TransactionPayload = {
      type: formValues.type as "income" | "expense",
      amount,
      description: formValues.description || "Movimiento",
      category: formValues.category || "General",
      date: formValues.date ? new Date(formValues.date) : undefined,
    };

    setSubmitting(true);
    setFormError(null);

    try {
      await onAddTransaction(payload);
      setFormValues({ type: "income", amount: "", description: "", category: "", date: "" });
      setSuccessMessage("Movimiento registrado");
    } catch (error) {
      console.error("Error creando movimiento", error);
      setFormError("No pudimos registrar el movimiento");
    } finally {
      setSubmitting(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard title="Ingresos" value={formatCurrency(totalIncome, currency)} accent="text-green-600" />
        <SummaryCard title="Egresos" value={formatCurrency(manualExpense, currency)} accent="text-red-500" />
        <SummaryCard title="Saldo" value={formatCurrency(balance, currency)} accent="text-primary" />
        <SummaryCard
          title="IVA estimado"
          value={formatCurrency(estimatedVat, currency)}
          accent="text-amber-600"
          helper={`${defaultTaxRate}%`}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-primary">Movimientos</h3>
              <p className="text-xs text-gray-500">
                {loadingSales || loadingTransactions
                  ? "Sincronizando..."
                  : `${movements.length} movimientos`}
              </p>
            </div>
          </div>

          {errorMessage && <p className="text-xs text-red-500 mb-2">{errorMessage}</p>}

          {loadingSales && loadingTransactions ? (
            <p className="text-xs text-gray-500">Cargando información financiera...</p>
          ) : movements.length === 0 ? (
            <p className="text-xs text-gray-500">Aún no tienes movimientos registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2">Fecha</th>
                    <th className="py-2">Descripción</th>
                    <th className="py-2">Categoría</th>
                    <th className="py-2">Origen</th>
                    <th className="py-2 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {movements.map((movement) => (
                    <tr key={`${movement.source}-${movement.id}`} className="border-b last:border-none">
                      <td className="py-2">
                        {movement.date.toLocaleDateString("es-CL", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </td>
                      <td className="py-2">{movement.description}</td>
                      <td className="py-2">{movement.category}</td>
                      <td className="py-2">{movement.source}</td>
                      <td
                        className={`py-2 text-right font-semibold ${
                          movement.type === "income" ? "text-green-600" : "text-red-500"
                        }`}
                      >
                        {movement.type === "income" ? "+" : "-"} {formatCurrency(movement.amount, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary">Nuevo movimiento</p>
            <h3 className="text-xl font-semibold text-primary">Registro manual</h3>
            <p className="text-xs text-gray-500">Ingresa ingresos adicionales o egresos para completar tu flujo.</p>
            <p className="text-[11px] text-gray-500">IVA por defecto configurado: {defaultTaxRate}%</p>
            {!canManageFinances && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-2">
                Solo tienes acceso de lectura. Solicita a un administrador registrar movimientos por ti.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-gray-600">Tipo</label>
                <select
                  name="type"
                  value={formValues.type}
                  onChange={handleChange}
                  disabled={!canManageFinances}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 disabled:bg-gray-100"
                >
                  <option value="income">Ingreso</option>
                  <option value="expense">Egreso</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 text-gray-600">Fecha</label>
                <input
                  type="date"
                  name="date"
                  value={formValues.date}
                  onChange={handleChange}
                  disabled={!canManageFinances}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 disabled:bg-gray-100"
                />
              </div>
            </div>
            <div>
              <label className="block mb-1 text-gray-600">Monto</label>
              <input
                type="number"
                name="amount"
                value={formValues.amount}
                onChange={handleChange}
                disabled={!canManageFinances}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 disabled:bg-gray-100"
                min={0}
              />
            </div>
            <div>
              <label className="block mb-1 text-gray-600">Descripción</label>
              <input
                type="text"
                name="description"
                value={formValues.description}
                onChange={handleChange}
                disabled={!canManageFinances}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 disabled:bg-gray-100"
                placeholder="Ej: Pago proveedor"
              />
            </div>
            <div>
              <label className="block mb-1 text-gray-600">Categoría</label>
              <input
                type="text"
                name="category"
                value={formValues.category}
                onChange={handleChange}
                disabled={!canManageFinances}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 disabled:bg-gray-100"
                placeholder="Operaciones"
              />
            </div>

            {formError && <p className="text-xs text-red-500">{formError}</p>}
            {successMessage && <p className="text-xs text-green-600">{successMessage}</p>}

            <button
              type="submit"
              disabled={submitting || !canManageFinances}
              className="w-full bg-primary text-white py-2 rounded-xl text-sm hover:opacity-90 disabled:opacity-50"
            >
              Registrar
            </button>
          </form>
        </div>
      </div>

      {canManageFinances ? (
        <InvoiceScanner defaultCurrency={currency} onProcessInvoice={onProcessInvoice} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-4 text-xs text-gray-600">
          <p className="text-sm font-semibold text-primary">Escaneo de facturas</p>
          <p>No tienes permisos para ingresar facturas o modificar inventario desde esta vista.</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-primary">Notificaciones</p>
                <h3 className="text-xl font-semibold text-primary">Resumen diario por WhatsApp</h3>
                <p className="text-xs text-gray-500">
                Envía el resumen de ventas del día al número configurado en Twilio.
              </p>
              <p className="text-[11px] text-gray-500">
                Estado: {settings?.whatsappEnabled ? "Activado" : "Desactivado"}
              </p>
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>Ventas registradas: {sales.length}</p>
              <p>Moneda: {currency}</p>
            </div>
          </div>

            <div className="flex flex-col sm:flex-row gap-3 text-xs">
              <button
                type="button"
                disabled={summarySending || !settings?.whatsappEnabled || !canManageFinances}
                onClick={handleSendSummary}
                className="sm:w-auto bg-primary text-white px-4 py-2 rounded-xl text-sm hover:opacity-90 disabled:opacity-50"
              >
                {summarySending ? "Enviando..." : "Enviar resumen ahora"}
              </button>
            <div className="flex-1 text-gray-600 bg-softGray rounded-xl px-3 py-2">
              <p>Destino: {settings?.whatsappNumber || settings?.phone || "Sin número"}</p>
              <p>Proveedor: {settings?.whatsappProvider || "twilio"}</p>
            </div>
          </div>

          {summaryFeedback && <p className="text-green-600 text-xs">{summaryFeedback}</p>}
          {summaryError && <p className="text-red-500 text-xs">{summaryError}</p>}

          <div className="text-[11px] text-gray-500">
            Consejo: programa un Cron o Cloud Function para ejecutar este envío automático al cierre de jornada.
          </div>
        </div>

        <SiiIntegrationPanel settings={settings} currency={currency} sales={sales} />
      </div>
    </div>
  );
};

export default FinancePage;

type SummaryCardProps = {
  title: string;
  value: string;
  accent: string;
  helper?: string;
};

function SummaryCard({ title, value, accent, helper }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-primaryLight">{title}</p>
      <p className={`text-2xl font-semibold ${accent}`}>{value}</p>
      <p className="text-xs text-gray-500">
        {helper ? `Referencia: ${helper}` : "Actualizado en tiempo real"}
      </p>
    </div>
  );
}

function formatCurrency(value: number, currency = "CLP") {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
