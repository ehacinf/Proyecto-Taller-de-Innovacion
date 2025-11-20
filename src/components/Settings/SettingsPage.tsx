import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type {
  BusinessSettings,
  PermissionKey,
  PermissionSet,
  RoleDefinition,
  RoleKey,
  UserProfile,
  UserRoleAssignment,
} from "../../types";
import { PERMISSION_LABELS, mergePermissions } from "../../utils/permissions";

export type SettingsPageProps = {
  settings: BusinessSettings | null;
  loading: boolean;
  saving: boolean;
  feedbackMessage?: string | null;
  errorMessage?: string | null;
  onSave: (payload: Partial<BusinessSettings>) => Promise<void>;
  userEmail: string;
  onSignOut: () => void;
  roleDefinitions: RoleDefinition[];
  userRoleAssignments: UserRoleAssignment[];
  userProfiles: UserProfile[];
  onUpdateUserRole: (
    userId: string,
    role: RoleKey,
    permissions: PermissionSet
  ) => Promise<void>;
  canManageUsers: boolean;
  currentUserId: string;
  currentRole: RoleKey;
  currentPermissions: PermissionSet;
  rolesError?: string | null;
  rolesLoading: boolean;
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
  whatsappEnabled: boolean;
  whatsappNumber: string;
  whatsappFrom: string;
  whatsappDailySummaryEnabled: boolean;
  whatsappDailySummaryTime: string;
  siiEnabled: boolean;
  siiEnvironment: BusinessSettings["siiEnvironment"];
  siiApiUrl: string;
  siiApiKey: string;
  siiResolutionNumber: string;
  siiOffice: string;
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
    whatsappEnabled: settings?.whatsappEnabled ?? false,
    whatsappNumber: settings?.whatsappNumber ?? settings?.phone ?? "",
    whatsappFrom: settings?.whatsappFrom ?? "",
    whatsappDailySummaryEnabled: settings?.whatsappDailySummaryEnabled ?? false,
    whatsappDailySummaryTime: settings?.whatsappDailySummaryTime ?? "21:00",
    siiEnabled: settings?.siiEnabled ?? false,
    siiEnvironment: settings?.siiEnvironment ?? "certificacion",
    siiApiUrl: settings?.siiApiUrl ?? "",
    siiApiKey: settings?.siiApiKey ?? "",
    siiResolutionNumber: settings?.siiResolutionNumber ?? "",
    siiOffice: settings?.siiOffice ?? "",
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
  roleDefinitions,
  userRoleAssignments,
  userProfiles,
  onUpdateUserRole,
  canManageUsers,
  currentUserId,
  currentRole,
  currentPermissions,
  rolesError,
  rolesLoading,
}: SettingsPageProps) => {
  const [formState, setFormState] = useState<FormState>(() => buildFormState(settings, userEmail));
  const [newCategory, setNewCategory] = useState("");
  const [roleState, setRoleState] = useState<Record<string, { role: RoleKey; permissions: PermissionSet }>>({});
  const [roleSavingId, setRoleSavingId] = useState<string | null>(null);
  const [roleMessage, setRoleMessage] = useState<string | null>(null);
  const [roleErrorMessage, setRoleErrorMessage] = useState<string | null>(null);

  const assignmentsByUser = useMemo(() => {
    const map = new Map<string, UserRoleAssignment>();
    userRoleAssignments.forEach((assignment) => {
      map.set(assignment.userId, assignment);
    });
    return map;
  }, [userRoleAssignments]);

  useEffect(() => {
    setFormState(buildFormState(settings, userEmail));
  }, [settings, userEmail]);

  useEffect(() => {
    const nextRoles: Record<string, { role: RoleKey; permissions: PermissionSet }> = {};

    userProfiles.forEach((profile) => {
      const assignment = assignmentsByUser.get(profile.id);
      const roleKey = assignment?.role || (profile.id === currentUserId ? currentRole : "vendedor");
      const permissions = mergePermissions(roleKey, assignment?.permissions);
      nextRoles[profile.id] = { role: roleKey, permissions };
    });

    setRoleState(nextRoles);
  }, [assignmentsByUser, userProfiles, currentRole, currentUserId]);

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

  function handleRoleSelection(userId: string, role: RoleKey) {
    setRoleState((prev) => ({
      ...prev,
      [userId]: {
        role,
        permissions: mergePermissions(role),
      },
    }));
  }

  function handlePermissionToggle(userId: string, permission: PermissionKey) {
    setRoleState((prev) => {
      const current = prev[userId] || { role: "personalizado" as RoleKey, permissions: mergePermissions("personalizado") };
      const nextPermissions: PermissionSet = {
        ...current.permissions,
        [permission]: !current.permissions[permission],
      };

      return {
        ...prev,
        [userId]: { role: "personalizado", permissions: nextPermissions },
      };
    });
  }

  async function handleSaveRole(userId: string) {
    const payload = roleState[userId];
    if (!payload) return;

    setRoleSavingId(userId);
    setRoleMessage(null);
    setRoleErrorMessage(null);

    try {
      await onUpdateUserRole(userId, payload.role, payload.permissions);
      setRoleMessage("Permisos actualizados correctamente");
    } catch (error: unknown) {
      console.error("Error guardando roles", error);
      const message =
        error instanceof Error ? error.message : "No pudimos actualizar los permisos";
      setRoleErrorMessage(message);
    } finally {
      setRoleSavingId(null);
      setTimeout(() => setRoleMessage(null), 4000);
    }
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
      whatsappEnabled: formState.whatsappEnabled,
      whatsappNumber: formState.whatsappNumber.trim(),
      whatsappFrom: formState.whatsappFrom.trim(),
      whatsappDailySummaryEnabled: formState.whatsappDailySummaryEnabled,
      whatsappDailySummaryTime: formState.whatsappDailySummaryTime,
      siiEnabled: formState.siiEnabled,
      siiEnvironment: formState.siiEnvironment,
      siiApiUrl: formState.siiApiUrl.trim(),
      siiApiKey: formState.siiApiKey.trim(),
      siiResolutionNumber: formState.siiResolutionNumber.trim(),
      siiOffice: formState.siiOffice.trim(),
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
          <p className="text-xs uppercase tracking-[0.3em] text-primary">WhatsApp</p>
          <h3 className="text-lg font-semibold text-primary">Alertas y resúmenes automáticos</h3>
          <p className="text-xs text-gray-500">
            Usa Twilio para notificar stock crítico y enviar el resumen de ventas diario.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <label className="flex items-center gap-2 text-gray-700">
            <input
              type="checkbox"
              name="whatsappEnabled"
              checked={formState.whatsappEnabled}
              onChange={handleFieldChange}
              className="rounded"
            />
            Activar notificaciones por WhatsApp
          </label>
          <label className="flex items-center gap-2 text-gray-700">
            <input
              type="checkbox"
              name="whatsappDailySummaryEnabled"
              checked={formState.whatsappDailySummaryEnabled}
              onChange={handleFieldChange}
              className="rounded"
              disabled={!formState.whatsappEnabled}
            />
            Enviar resumen diario automático
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Número de WhatsApp destino</span>
            <input
              type="text"
              name="whatsappNumber"
              value={formState.whatsappNumber}
              onChange={handleFieldChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
              placeholder="Ej: +56912345678"
              disabled={!formState.whatsappEnabled}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Número emisor (Twilio)</span>
            <input
              type="text"
              name="whatsappFrom"
              value={formState.whatsappFrom}
              onChange={handleFieldChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
              placeholder="whatsapp:+14155238886"
              disabled={!formState.whatsappEnabled}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Horario diario (HH:MM)</span>
            <input
              type="time"
              name="whatsappDailySummaryTime"
              value={formState.whatsappDailySummaryTime}
              onChange={handleFieldChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
              disabled={!formState.whatsappEnabled}
            />
          </label>
        </div>
        <p className="text-[11px] text-gray-500">
          Las credenciales de Twilio se leen desde variables de entorno de Vite. No almacenes tokens sensibles en
          el navegador.
        </p>
      </section>

      <section className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">SII Chile</p>
          <h3 className="text-lg font-semibold text-primary">Facturación electrónica</h3>
          <p className="text-xs text-gray-500">
            Configura las credenciales del Servicio de Impuestos Internos para emitir boletas y facturas.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <label className="flex items-center gap-2 text-gray-700">
            <input
              type="checkbox"
              name="siiEnabled"
              checked={formState.siiEnabled}
              onChange={handleFieldChange}
              className="rounded"
            />
            Habilitar integración con SII
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Ambiente</span>
            <select
              name="siiEnvironment"
              value={formState.siiEnvironment}
              onChange={handleFieldChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
              disabled={!formState.siiEnabled}
            >
              <option value="certificacion">Certificación</option>
              <option value="produccion">Producción</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">N° resolución</span>
            <input
              type="text"
              name="siiResolutionNumber"
              value={formState.siiResolutionNumber}
              onChange={handleFieldChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
              disabled={!formState.siiEnabled}
            />
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">API URL</span>
            <input
              type="text"
              name="siiApiUrl"
              value={formState.siiApiUrl}
              onChange={handleFieldChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
              placeholder="https://tu-funcion.cloud/sii"
              disabled={!formState.siiEnabled}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">API Key</span>
            <input
              type="text"
              name="siiApiKey"
              value={formState.siiApiKey}
              onChange={handleFieldChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
              disabled={!formState.siiEnabled}
            />
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Oficina / sucursal</span>
            <input
              type="text"
              name="siiOffice"
              value={formState.siiOffice}
              onChange={handleFieldChange}
              className="px-3 py-2 rounded-xl border border-gray-200"
              placeholder="Casa matriz"
              disabled={!formState.siiEnabled}
            />
          </label>
          <div className="text-[11px] text-gray-500 bg-softGray rounded-xl p-3">
            <p className="font-semibold text-primary">Recomendaciones</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Registra el certificado digital y CAF en tu backend seguro.</li>
              <li>Usa este API Key solo en funciones protegidas.</li>
              <li>Controla los folios emitidos para cada sucursal.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary">Usuarios y roles</p>
            <h3 className="text-lg font-semibold text-primary">Permisos personalizados</h3>
            <p className="text-xs text-gray-500">
              Asigna los perfiles sugeridos (Administrador, Vendedor, Contador o Bodeguero) y ajusta los permisos cuando el negocio lo requiera.
            </p>
          </div>
          <div className="text-right text-[11px] text-gray-500">
            <p>Rol activo: {roleDefinitions.find((role) => role.key === currentRole)?.name || currentRole}</p>
            <p>Permisos clave: {currentPermissions.createSales ? "Vende" : "Sin ventas"} · {currentPermissions.editInventory ? "Edita inventario" : "Solo lectura"}</p>
          </div>
        </div>

        {rolesError && <p className="text-xs text-red-500">{rolesError}</p>}
        {roleErrorMessage && <p className="text-xs text-red-500">{roleErrorMessage}</p>}
        {roleMessage && <p className="text-xs text-green-600">{roleMessage}</p>}

        {rolesLoading ? (
          <p className="text-xs text-gray-600">Cargando permisos y usuarios...</p>
        ) : !canManageUsers ? (
          <p className="text-xs text-gray-600 bg-softGray rounded-xl px-3 py-2">
            Solo los administradores pueden modificar roles. Solicita acceso a un administrador del negocio.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {roleDefinitions.map((role) => (
                <div key={role.key} className="border border-gray-100 rounded-xl p-3 bg-softGray">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-primaryLight">{role.name}</p>
                  <p className="font-semibold text-primary">{role.description}</p>
                  <ul className="list-disc list-inside text-gray-600 mt-1 space-y-1">
                    {Object.entries(role.permissions)
                      .filter(([, enabled]) => enabled)
                      .map(([permissionKey]) => (
                        <li key={permissionKey}>{PERMISSION_LABELS[permissionKey as PermissionKey]}</li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2">Usuario</th>
                    <th className="py-2">Rol asignado</th>
                    <th className="py-2">Permisos</th>
                    <th className="py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {userProfiles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-3 text-center text-gray-500">
                        Aún no hay usuarios registrados.
                      </td>
                    </tr>
                  ) : (
                    userProfiles.map((profile) => {
                      const currentRoleState = roleState[profile.id] || {
                        role: "vendedor" as RoleKey,
                        permissions: mergePermissions("vendedor"),
                      };
                      const isSaving = roleSavingId === profile.id;
                      const displayName = profile.nombre || profile.email || profile.id;
                      return (
                        <tr key={profile.id} className="border-b last:border-none align-top">
                          <td className="py-3">
                            <div className="font-semibold text-primary">{displayName}</div>
                            <p className="text-[11px] text-gray-500">{profile.negocio || "Sin negocio registrado"}</p>
                            {profile.id === currentUserId && (
                              <span className="inline-block text-[10px] text-primary bg-primary/10 px-2 py-[2px] rounded-full mt-1">
                                Tú
                              </span>
                            )}
                          </td>
                          <td className="py-3">
                            <select
                              className="px-3 py-2 rounded-xl border border-gray-200"
                              value={currentRoleState.role}
                              disabled={isSaving}
                              onChange={(event) => handleRoleSelection(profile.id, event.target.value as RoleKey)}
                            >
                              {roleDefinitions.map((role) => (
                                <option key={role.key} value={role.key}>
                                  {role.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {Object.entries(currentRoleState.permissions).map(([permissionKey, enabled]) => (
                                <label key={permissionKey} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={enabled}
                                    disabled={isSaving}
                                    onChange={() => handlePermissionToggle(profile.id, permissionKey as PermissionKey)}
                                  />
                                  <span>{PERMISSION_LABELS[permissionKey as PermissionKey]}</span>
                                </label>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleSaveRole(profile.id)}
                              disabled={isSaving}
                              className="bg-primary text-white px-4 py-2 rounded-xl text-xs hover:opacity-90 disabled:opacity-50"
                            >
                              {isSaving ? "Guardando..." : "Actualizar"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
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
