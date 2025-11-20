import { useEffect, useMemo, useState } from "react";
import type { Product, ProductInsight, ProductPayload } from "../../types";

type InventoryPageProps = {
  products: Product[];
  onAddProduct: (payload: ProductPayload) => Promise<void>;
  onUpdateProduct: (id: string, payload: ProductPayload) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  loading: boolean;
  searchTerm: string;
  errorMessage?: string | null;
  defaultStockMin?: number;
  defaultUnit?: string;
  currency?: string;
  productInsights: ProductInsight[];
  canEditInventory?: boolean;
};

type SortField = "name" | "salePrice" | "stock";

type FormState = {
  name: string;
  category: string;
  stock: string;
  stockMin: string;
  unit: string;
  purchasePrice: string;
  salePrice: string;
  supplier: string;
};

function createInitialFormState(stockMin = 0, unit = "unidades"): FormState {
  return {
    name: "",
    category: "",
    stock: "0",
    stockMin: stockMin.toString(),
    unit,
    purchasePrice: "0",
    salePrice: "0",
    supplier: "",
  };
}

const InventoryPage = ({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  loading,
  searchTerm,
  errorMessage,
  defaultStockMin = 0,
  defaultUnit = "unidades",
  currency = "CLP",
  productInsights,
  canEditInventory = true,
}: InventoryPageProps) => {
  const [formValues, setFormValues] = useState<FormState>(() =>
    createInitialFormState(defaultStockMin, defaultUnit)
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);

  useEffect(() => {
    if (!editingId) {
      setFormValues((prev) => ({
        ...prev,
        stockMin: (defaultStockMin ?? 0).toString(),
        unit: defaultUnit,
      }));
    }
  }, [defaultStockMin, defaultUnit, editingId]);

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category || "Sin categoría"))),
    [products]
  );

  const combinedSearch = `${searchTerm} ${localSearch}`.toLowerCase();

  const filteredProducts = useMemo(() => {
    const withFilters = products.filter((product) => {
      const matchesSearch = `${product.name} ${product.category}`
        .toLowerCase()
        .includes(combinedSearch.trim());
      const matchesCategory =
        categoryFilter === "todos" || product.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    const sorted = [...withFilters].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;

      if (sortField === "name") {
        return a.name.localeCompare(b.name) * direction;
      }

      if (sortField === "salePrice") {
        return (a.salePrice - b.salePrice) * direction;
      }

      return (a.stock - b.stock) * direction;
    });

    return sorted;
  }, [products, combinedSearch, categoryFilter, sortField, sortDirection]);

  useEffect(() => {
    if (filteredProducts.length === 0) {
      setDetailProductId(null);
      return;
    }

    const exists = filteredProducts.some((product) => product.id === detailProductId);
    if (!exists) {
      setDetailProductId(filteredProducts[0].id);
    }
  }, [filteredProducts, detailProductId]);

  const selectedProduct = useMemo(
    () => filteredProducts.find((product) => product.id === detailProductId) || null,
    [filteredProducts, detailProductId]
  );

  const selectedInsight = useMemo(
    () =>
      productInsights.find((insight) => insight.productId === selectedProduct?.id) || null,
    [productInsights, selectedProduct?.id]
  );

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (!canEditInventory) {
      setFormError("No tienes permisos para modificar el inventario");
      return;
    }

    const trimmedStockMin = formValues.stockMin.trim();
    const parsedStockMin = trimmedStockMin === "" ? NaN : Number(trimmedStockMin);
    const fallbackStockMin = defaultStockMin ?? 0;
    const resolvedStockMin = Number.isFinite(parsedStockMin) ? parsedStockMin : fallbackStockMin;

    const payload: ProductPayload = {
      name: formValues.name.trim(),
      category: formValues.category.trim(),
      stock: Number(formValues.stock) || 0,
      stockMin: resolvedStockMin,
      unit: formValues.unit || defaultUnit,
      purchasePrice: Number(formValues.purchasePrice) || 0,
      salePrice: Number(formValues.salePrice) || 0,
      supplier: formValues.supplier.trim(),
    };

    if (!payload.name) {
      setFormError("Ingresa un nombre para el producto");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      if (editingId) {
        await onUpdateProduct(editingId, payload);
        setFeedbackMessage("Producto actualizado correctamente");
      } else {
        await onAddProduct(payload);
        setFeedbackMessage("Producto agregado a tu inventario");
      }
      setFormValues(createInitialFormState(defaultStockMin, defaultUnit));
      setEditingId(null);
    } catch (error) {
      console.error("Error guardando producto", error);
      setFormError("No pudimos guardar el producto. Reintenta");
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!canEditInventory) {
      return;
    }
    const confirmDelete = window.confirm(`¿Eliminar ${name}?`);
    if (!confirmDelete) return;

    try {
      await onDeleteProduct(id);
      if (editingId === id) {
        setEditingId(null);
        setFormValues(createInitialFormState(defaultStockMin, defaultUnit));
      }
    } catch (error) {
      console.error("Error eliminando producto", error);
    }
  }

  function handleEdit(product: Product) {
    setEditingId(product.id);
    setFormValues({
      name: product.name,
      category: product.category,
      stock: product.stock.toString(),
      stockMin: product.stockMin.toString(),
      unit: product.unit || defaultUnit,
      purchasePrice: product.purchasePrice.toString(),
      salePrice: product.salePrice.toString(),
      supplier: product.supplier || "",
    });
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">{editingId ? "Editar" : "Agregar"} producto</p>
          <h3 className="text-xl font-semibold text-primary">Formulario</h3>
          <p className="text-xs text-gray-500">
            Completa los campos requeridos para mantener tu inventario sincronizado.
          </p>
          {!canEditInventory && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-2">
              Tu rol actual solo permite visualizar inventario. Contacta a un administrador para habilitar ediciones.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="text-gray-600 block mb-1">Nombre *</label>
            <input
              type="text"
              name="name"
              value={formValues.name}
              onChange={handleChange}
              disabled={!canEditInventory}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primaryLight/80 disabled:bg-gray-100"
              placeholder="Ej: Pan de molde"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-gray-600 block mb-1">Categoría</label>
              <input
                type="text"
                name="category"
                value={formValues.category}
                onChange={handleChange}
                disabled={!canEditInventory}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 disabled:bg-gray-100"
                placeholder="Abarrotes"
              />
            </div>
            <div>
              <label className="text-gray-600 block mb-1">Proveedor</label>
              <input
                type="text"
                name="supplier"
                value={formValues.supplier}
                onChange={handleChange}
                disabled={!canEditInventory}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 disabled:bg-gray-100"
                placeholder="Distribuidora Sur"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-600 block mb-1">Stock actual</label>
              <input
                type="number"
                name="stock"
                value={formValues.stock}
                onChange={handleChange}
                disabled={!canEditInventory}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 disabled:bg-gray-100"
                min={0}
              />
            </div>
            <div>
              <label className="text-gray-600 block mb-1">Stock mínimo</label>
              <input
                type="number"
                name="stockMin"
                value={formValues.stockMin}
                onChange={handleChange}
                disabled={!canEditInventory}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 disabled:bg-gray-100"
                min={0}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-600 block mb-1">Precio compra</label>
              <input
                type="number"
                name="purchasePrice"
                value={formValues.purchasePrice}
                onChange={handleChange}
                disabled={!canEditInventory}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 disabled:bg-gray-100"
                min={0}
              />
            </div>
            <div>
              <label className="text-gray-600 block mb-1">Precio venta</label>
              <input
                type="number"
                name="salePrice"
                value={formValues.salePrice}
                onChange={handleChange}
                disabled={!canEditInventory}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 disabled:bg-gray-100"
                min={0}
              />
            </div>
          </div>

          {formError && <p className="text-red-500 text-xs">{formError}</p>}
          {feedbackMessage && <p className="text-green-600 text-xs">{feedbackMessage}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !canEditInventory}
              className="flex-1 bg-primary text-white py-2 rounded-xl text-sm hover:opacity-90 disabled:opacity-50"
            >
              {editingId ? "Guardar cambios" : "Agregar producto"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setFormValues(createInitialFormState(defaultStockMin, defaultUnit));
                }}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600"
              >
                Cancelar
              </button>
            )}
          </div>
          <p className="text-[11px] text-gray-500">
            Unidad configurada: {formValues.unit || defaultUnit}. Para cambiarla ve a la sección de
            Configuración.
          </p>
        </form>
      </div>

      <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-semibold text-primary">Inventario</h3>
            <p className="text-xs text-gray-500">
              {loading ? "Cargando productos…" : `${filteredProducts.length} productos visibles`}
            </p>
          </div>
        <div className="flex flex-col md:flex-row gap-2 text-xs">
          <input
            type="text"
            placeholder="Buscar por nombre o categoría"
            className="px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primaryLight/80"
              value={localSearch}
              onChange={(event) => setLocalSearch(event.target.value)}
            />
            <select
              className="px-3 py-2 rounded-xl border border-gray-200"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="todos">Todas las categorías</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category || "Sin categoría"}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => toggleSort("name")}
              className="px-3 py-2 rounded-xl border border-gray-200"
            >
              Ordenar por nombre {sortField === "name" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
            </button>
            <button
              type="button"
              onClick={() => toggleSort("salePrice")}
              className="px-3 py-2 rounded-xl border border-gray-200"
            >
              Precio {sortField === "salePrice" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
            </button>
            <button
              type="button"
              onClick={() => toggleSort("stock")}
              className="px-3 py-2 rounded-xl border border-gray-200"
            >
              Stock {sortField === "stock" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
            </button>
          </div>
        </div>

        {selectedProduct && (
          <div className="bg-softGray rounded-2xl p-3 text-xs space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-primaryLight">
                  Ficha inteligente
                </p>
                <h4 className="text-sm font-semibold text-primary">{selectedProduct.name}</h4>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="detail-select" className="text-[11px] text-gray-600">
                  Ver detalles de
                </label>
                <select
                  id="detail-select"
                  value={detailProductId ?? ""}
                  onChange={(event) => setDetailProductId(event.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 bg-white"
                >
                  {filteredProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedInsight ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <InsightPill
                  title="Predicción de demanda"
                  value={`≈${selectedInsight.predictedWeeklyDemand.toFixed(1)} uds/sem`}
                  helper={`Tendencia ${selectedInsight.demandLevel}`}
                />
                <InsightPill
                  title="Quiebre estimado"
                  value={
                    selectedInsight.stockoutInDays
                      ? `${selectedInsight.stockoutInDays} días`
                      : "Sin riesgo inmediato"
                  }
                  helper="Calculado con velocidad de venta"
                />
                <InsightPill
                  title="Sugerencia de compra"
                  value={
                    selectedInsight.purchaseSuggestion > 0
                      ? `Pedir ${selectedInsight.purchaseSuggestion} uds`
                      : "Inventario suficiente"
                  }
                  helper="Cobertura recomendada de 14 días"
                />
                <InsightPill
                  title="Precio recomendado"
                  value={formatCurrency(selectedInsight.priceRecommendation.recommendedPrice, currency)}
                  helper={formatPriceHelper(selectedInsight)}
                />
              </div>
            ) : (
              <p className="text-[11px] text-gray-600">
                Aún no hay ventas suficientes para este producto. El sistema mostrará predicciones
                en cuanto registre algunos movimientos.
              </p>
            )}
          </div>
        )}

        {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}

        {loading ? (
          <p className="text-xs text-gray-500">Cargando productos...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-xs text-gray-500">
            {products.length === 0
              ? "Aún no hay productos. Agrega el primero con el formulario de la izquierda."
              : "No encontramos productos que coincidan con tu búsqueda."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2">Producto</th>
                  <th className="py-2">Categoría</th>
                  <th className="py-2">Stock</th>
                  <th className="py-2">Stock mínimo</th>
                  <th className="py-2">Precio venta</th>
                  <th className="py-2">Proveedor</th>
                  <th className="py-2">Creado</th>
                  <th className="py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {filteredProducts.map((product) => {
                  const lowStock = product.stock <= product.stockMin;
                  const unitLabel = product.unit || defaultUnit || "uds";
                  return (
                    <tr
                      key={product.id}
                      className={`border-b last:border-none ${
                        lowStock ? "bg-red-50/70" : ""
                      }`}
                    >
                      <td className="py-2 font-medium">
                        {product.name}
                        {lowStock && (
                          <span className="ml-2 text-[10px] text-red-600 font-semibold">
                            Stock crítico
                          </span>
                        )}
                      </td>
                      <td className="py-2">{product.category || "-"}</td>
                      <td className="py-2">
                        {product.stock} {unitLabel}
                      </td>
                      <td className="py-2">{product.stockMin}</td>
                      <td className="py-2">{formatCurrency(product.salePrice, currency)}</td>
                      <td className="py-2">{product.supplier || "-"}</td>
                      <td className="py-2">
                        {product.createdAt
                          ? product.createdAt.toLocaleDateString("es-CL")
                          : "-"}
                      </td>
                      <td className="py-2 text-right space-x-2">
                        <button
                          className="text-primaryLight hover:underline disabled:text-gray-400"
                          onClick={() => handleEdit(product)}
                          disabled={!canEditInventory}
                        >
                          Editar
                        </button>
                        <button
                          className="text-red-500 hover:underline disabled:text-gray-400"
                          onClick={() => handleDelete(product.id, product.name)}
                          disabled={!canEditInventory}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryPage;

type InsightPillProps = {
  title: string;
  value: string;
  helper?: string;
};

function InsightPill({ title, value, helper }: InsightPillProps) {
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
      <p className="text-[11px] uppercase tracking-[0.2em] text-primaryLight">{title}</p>
      <p className="text-sm font-semibold text-primary">{value}</p>
      {helper && <p className="text-[11px] text-gray-500">{helper}</p>}
    </div>
  );
}

function formatPriceHelper(insight: ProductInsight) {
  const variation = insight.priceRecommendation.variationPercentage;
  const prefix = variation >= 0 ? "+" : "";
  return `${prefix}${variation.toFixed(1)}% vs. precio actual · ${insight.priceRecommendation.rationale}`;
}

function formatCurrency(value: number, currency = "CLP") {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
