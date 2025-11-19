import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { BusinessSettings } from "../../types";

export type SettingsPageProps = {
  settings: BusinessSettings | null;
  loading: boolean;
  saving: boolean;
  feedbackMessage?: string | null;
  errorMessage?: string | null;
  onSave: (payload: Partial<BusinessSettings>) => Promise<void>;
  userEmail: string;
  onSignOut: () => void;
};

type FormState = {
  businessName: string;
  businessType: string;
  taxId: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  contactEmail: string;
  defaultStockMin: string;
  defaultUnit: string;
  categories: string[];
  defaultTaxRate: string;
  currency: string;
  allowNegativeStock: boolean;
  allowCustomPriceOnSale: boolean;
  alertStockEnabled: boolean;
  alertLevel: BusinessSettings["alertLevel"];
  alertEmail: string;
  uiTheme: BusinessSettings["uiTheme"];
  uiFontSize: BusinessSettings["uiFontSize"];
};

const inventoryUnitOptions = ["unidades", "kg", "litros", "cajas", "paquetes"];
const currencyOptions = ["CLP", "USD", "PEN", "ARS"];
const alertLevelOptions: { label: string; value: BusinessSettings["alertLevel"] }[] = [
  { label: "Estricto", value: "estricto" },
  { label: "Normal", value: "normal" },
  { label: "Relajado", value: "relajado" },
];

function buildFormState(settings: BusinessSettings | null, fallbackEmail: string): FormState {
  return {
    businessName: settings?.businessName ?? "",
    businessType: settings?.businessType ?? "",
    taxId: settings?.taxId ?? "",
    address: settings?.address ?? "",
    city: settings?.city ?? "",
    country: settings?.country ?? "",
    phone: settings?.phone ?? "",
    contactEmail: settings?.contactEmail || fallbackEmail,
    defaultStockMin: (settings?.defaultStockMin ?? 0).toString(),
    defaultUnit: settings?.defaultUnit ?? "unidades",
    categories: settings?.categories ?? [],
    defaultTaxRate: (settings?.defaultTaxRate ?? 19).toString(),
    currency: settings?.currency ?? "CLP",
    allowNegativeStock: settings?.allowNegativeStock ?? false,
    allowCustomPriceOnSale: settings?.allowCustomPriceOnSale ?? true,
    alertStockEnabled: settings?.alertStockEnabled ?? false,
    alertLevel: settings?.alertLevel ?? "normal",
    alertEmail: settings?.alertEmail || settings?.contactEmail || fallbackEmail,
    uiTheme: settings?.uiTheme ?? "light",
    uiFontSize: settings?.uiFontSize ?? "normal",
  };
}

const SettingsPage = ({
  settings,
  loading,
  saving,
  feedbackMessage,
  errorMessage,
  onSave,
  userEmail,
  onSignOut,
}: SettingsPageProps) => {
  const [formState, setFormState] = useState<FormState>(() => buildFormState(settings, userEmail));
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    setFormState(buildFormState(settings, userEmail));
  }, [settings, userEmail]);

  const categoriesPreview = useMemo(() => formState.categories, [formState.categories]);

  function handleFieldChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const target = event.target;
    const { name, value } = target;
    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      setFormState((prev) => ({ ...prev, [name]: target.checked }));
      return;
    }
    setFormState((prev) => ({ ...prev, [name]: value }));
  }

  function handleAddCategory() {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    setFormState((prev) => ({
      ...prev,
      categories: Array.from(new Set([...prev.categories, trimmed])),
    }));
    setNewCategory("");
  }

  function handleRemoveCategory(category: string) {
    setFormState((prev) => ({
      ...prev,
      categories: prev.categories.filter((item) => item !== category),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    await onSave({
      businessName: formState.businessName.trim(),
      businessType: formState.businessType.trim(),
      taxId: formState.taxId.trim(),
      address: formState.address.trim(),
      city: formState.city.trim(),
      country: formState.country.trim(),
      phone: formState.phone.trim(),
      contactEmail: formState.contactEmail.trim(),
      defaultStockMin: Number(formState.defaultStockMin) || 0,
      defaultUnit: formState.defaultUnit,
      categories: formState.categories,
      defaultTaxRate: Number(formState.defaultTaxRate) || 0,
      currency: formState.currency,
      allowNegativeStock: formState.allowNegativeStock,
      allowCustomPriceOnSale: formState.allowCustomPriceOnSale,
      alertStockEnabled: formState.alertStockEnabled,
      alertLevel: formState.alertLevel,
      alertEmail: formState.alertEmail.trim() || formState.contactEmail.trim(),
      uiTheme: formState.uiTheme,
      uiFontSize: formState.uiFontSize,
    });
  }

  if (loading && !settings) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 text-sm text-gray-600">
        Cargando configuración…
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-primary">Configuración general</h2>
          <p className="text-xs text-gray-500">
            Administra tus datos y preferencias. Los cambios se guardarán para tu usuario actual.
          </p>
          {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
          {feedbackMessage && <p className="text-xs text-green-600">{feedbackMessage}</p>}
        </div>
      </div>

      <section className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Datos del negocio</p>
          <h3 className="text-lg font-semibold text-primary">Identidad</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Nombre del negocio</span>
            <input
              type="text"
              name="businessName"
              value={formState.businessName}
              onChange={handleFieldChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Rubro</span>
            <input
              type="text"
              name="businessType"
              value={formState.businessType}
              onChange={handleFieldChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Rut / ID tributario</span>
            <input
              type="text"
              name="taxId"
              value={formState.taxId}
              onChange={handleFieldChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Correo de contacto</span>
            <input
              type="email"
              name="contactEmail"
              value={formState.contactEmail}
              onChange={handleFieldChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Dirección</span>
            <input
              type="text"
              name="address"
              value={formState.address}
              onChange={handleFieldChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Ciudad</span>
            <input
              type="text"
              name="city"
              value={formState.city}
              onChange={handleFieldChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">País</span>
            <input
              type="text"
              name="country"
              value={formState.country}
              onChange={handleFieldChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Teléfono</span>
            <input
              type="tel"
              name="phone"
              value={formState.phone}
              onChange={handleFieldChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
            />
          </label>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Preferencias de inventario</p>
          <h3 className="text-lg font-semibold text-primary">Stock y categorías</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Stock mínimo por defecto</span>
            <input
              type="number"
              min={0}
              name="defaultStockMin"
              value={formState.defaultStockMin}
              onChange={handleFieldChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Unidad por defecto</span>
            <select
              name="defaultUnit"
              value={formState.defaultUnit}
              onChange={handleFieldChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
            >
              {inventoryUnitOptions.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Moneda base</span>
            <select
              name="currency"
              value={formState.currency}
              onChange={handleFieldChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
            >
              {currencyOptions.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="flex flex-col gap-2">
            <label className="text-gray-600">Nueva categoría</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="px-4 py-2 rounded-xl bg-primary text-white text-sm"
              >
                Agregar
              </button>
            </div>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Categorías actuales</p>
            {categoriesPreview.length === 0 ? (
              <p className="text-xs text-gray-500">Aún no tienes categorías.</p>
            ) : (
              <div className="flex flex-wrap gap-2 mt-2">
                {categoriesPreview.map((category) => (
                  <span
                    key={category}
                    className="inline-flex items-center gap-1 bg-softGray text-gray-700 px-3 py-1 rounded-full text-[11px]"
                  >
                    {category}
                    <button
                      type="button"
                      className="text-red-500"
                      onClick={() => handleRemoveCategory(category)}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Ventas y finanzas</p>
          <h3 className="text-lg font-semibold text-primary">Impuestos y reglas</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">IVA por defecto (%)</span>
            <input
              type="number"
              min={0}
              name="defaultTaxRate"
              value={formState.defaultTaxRate}
              onChange={handleFieldChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
            />
          </label>
          <label className="flex items-center gap-2 text-gray-700">
            <input
              type="checkbox"
              name="allowCustomPriceOnSale"
              checked={formState.allowCustomPriceOnSale}
              onChange={handleFieldChange}
              className="rounded"
            />
            Permitir cambiar precio en venta rápida
          </label>
          <label className="flex items-center gap-2 text-gray-700">
            <input
              type="checkbox"
              name="allowNegativeStock"
              checked={formState.allowNegativeStock}
              onChange={handleFieldChange}
              className="rounded"
            />
            Permitir ventas con stock negativo
          </label>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Notificaciones</p>
          <h3 className="text-lg font-semibold text-primary">Alertas de stock</h3>
        </div>
        <label className="flex items-center gap-2 text-gray-700 text-sm">
          <input
            type="checkbox"
            name="alertStockEnabled"
            checked={formState.alertStockEnabled}
            onChange={handleFieldChange}
            className="rounded"
          />
          Activar alertas de stock crítico
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Nivel de alerta</span>
            <select
              name="alertLevel"
              value={formState.alertLevel}
              onChange={handleFieldChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
              disabled={!formState.alertStockEnabled}
            >
              {alertLevelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-gray-600">Correo para alertas</span>
            <input
              type="email"
              name="alertEmail"
              value={formState.alertEmail}
              onChange={handleFieldChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
              disabled={!formState.alertStockEnabled}
            />
          </label>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Interfaz</p>
          <h3 className="text-lg font-semibold text-primary">Personalización visual</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Tema</span>
            <select
              name="uiTheme"
              value={formState.uiTheme}
              onChange={handleFieldChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
            >
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Tamaño de texto</span>
            <select
              name="uiFontSize"
              value={formState.uiFontSize}
              onChange={handleFieldChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
            >
              <option value="normal">Normal</option>
              <option value="large">Grande</option>
            </select>
          </label>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Cuenta y plan</p>
          <h3 className="text-lg font-semibold text-primary">Estado</h3>
        </div>
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            <span className="font-semibold">Correo activo:</span> {userEmail}
          </p>
          <p>
            <span className="font-semibold">Plan:</span> {settings?.planName || "Beta gratuita – sin costo"}
          </p>
          <button
            type="button"
            onClick={onSignOut}
            className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-softGray text-xs"
          >
            Cerrar todas las sesiones
          </button>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="bg-primary text-white px-6 py-2 rounded-xl text-sm hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
};

export default SettingsPage;
