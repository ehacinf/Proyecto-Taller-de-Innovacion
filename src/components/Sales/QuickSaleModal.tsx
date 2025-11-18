import { useEffect, useMemo, useState } from "react";
import type { Product, QuickSalePayload } from "../../types";

type QuickSaleModalProps = {
  open: boolean;
  products: Product[];
  onClose: () => void;
  onSubmit: (payload: QuickSalePayload) => Promise<void>;
  errorMessage?: string | null;
};

const QuickSaleModal = ({
  open,
  products,
  onClose,
  onSubmit,
  errorMessage,
}: QuickSaleModalProps) => {
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products]
  );

  useEffect(() => {
    if (!open) {
      setSelectedProduct("");
      setQuantity(1);
      setUnitPrice(0);
      setLocalError(null);
    }
  }, [open]);

  useEffect(() => {
    if (selectedProduct) {
      const product = products.find((p) => p.id === selectedProduct);
      if (product) {
        setUnitPrice(product.salePrice);
      }
    }
  }, [selectedProduct, products]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProduct) {
      setLocalError("Selecciona un producto");
      return;
    }

    if (quantity <= 0) {
      setLocalError("La cantidad debe ser mayor a 0");
      return;
    }

    setLocalError(null);
    setLoading(true);

    try {
      await onSubmit({ productId: selectedProduct, quantity, unitPrice });
      onClose();
    } catch (error: any) {
      setLocalError(error?.message || "No pudimos registrar la venta");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-3xl shadow-xl p-6 w-full max-w-lg text-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primaryLight">
              Nueva venta
            </p>
            <h3 className="text-2xl font-semibold text-primary">Venta rápida</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        {sortedProducts.length === 0 ? (
          <p className="text-xs text-gray-500">
            Aún no tienes productos disponibles para vender.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-gray-600 text-xs block mb-1">Producto</label>
              <select
                value={selectedProduct}
                onChange={(event) => setSelectedProduct(event.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200"
              >
                <option value="">Selecciona un producto</option>
                {sortedProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} · Stock: {product.stock}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-gray-600 text-xs block mb-1">Cantidad</label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200"
                />
              </div>
              <div>
                <label className="text-gray-600 text-xs block mb-1">Precio unitario</label>
                <input
                  type="number"
                  min={0}
                  value={unitPrice}
                  onChange={(event) => setUnitPrice(Number(event.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200"
                />
              </div>
            </div>

            <div className="bg-softGray rounded-2xl p-3 text-xs flex items-center justify-between">
              <p>Total</p>
              <p className="text-lg font-semibold text-primary">{formatCurrency(quantity * unitPrice)}</p>
            </div>

            {(localError || errorMessage) && (
              <p className="text-xs text-red-500">{localError || errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2 rounded-xl text-sm hover:opacity-90 disabled:opacity-50"
            >
              Registrar venta
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default QuickSaleModal;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}
