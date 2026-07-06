import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db";
import type { Order, OrderItem, PriceCategory } from "../../types";
import { EmptyState } from "../../components/EmptyState";
import { useToast } from "../../components/Toast";
import { ShareOrderSheet } from "../../components/ShareOrderSheet";
import { PriceCategoryPicker } from "../../components/PriceCategoryPicker";
import { AddLineForm } from "./AddLineForm";
import { AddedLinesList } from "./AddedLinesList";
import { ClienteForm } from "../clientes/ClienteForm";
import { formatCRC, formatUSD } from "../../lib/format";
import { getPriceCategoryInfo } from "../../lib/priceCategories";
import { getNextOrderNumber } from "../../lib/orderNumber";

export function OrdenesScreen() {
  const clients = useLiveQuery(() => db.clients.toArray(), []);
  const products = useLiveQuery(() => db.products.toArray(), []);
  const showToast = useToast();

  const [clientId, setClientId] = useState("");
  const [categoryOverride, setCategoryOverride] = useState<PriceCategory | null>(null);
  const [changingCategory, setChangingCategory] = useState(false);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [generatedOrder, setGeneratedOrder] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);

  const selectedClient = clients?.find((c) => String(c.id) === clientId);
  const priceCategory: PriceCategory = categoryOverride ?? selectedClient?.priceCategory ?? "distribuidor";

  useEffect(() => {
    setCategoryOverride(null);
    setChangingCategory(false);
  }, [clientId]);

  async function handleNewClientSave(data: {
    name: string;
    address: string;
    contact: string;
    priceCategory: PriceCategory;
  }) {
    const id = await db.clients.add({ ...data, createdAt: Date.now() });
    showToast("Cliente agregado");
    setClientId(String(id));
    setShowNewClient(false);
  }

  const { totalCRC, totalUSD } = useMemo(() => {
    let crc = 0;
    let usd = 0;
    for (const item of items) {
      const subtotal = item.quantity * item.unitPrice;
      if (item.currency === "USD") usd += subtotal;
      else crc += subtotal;
    }
    return { totalCRC: crc, totalUSD: usd };
  }, [items]);

  function resetForm() {
    setClientId("");
    setItems([]);
    setEditingIndex(null);
    setError("");
  }

  function handleSaveLine(item: OrderItem) {
    if (editingIndex !== null) {
      setItems((prev) => prev.map((it, i) => (i === editingIndex ? item : it)));
      setEditingIndex(null);
    } else {
      setItems((prev) => [...prev, item]);
    }
  }

  function handleRemoveLine(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  }

  async function handleGenerar() {
    setError("");
    const client = clients?.find((c) => String(c.id) === clientId);
    if (!client) {
      setError("Seleccioná un cliente.");
      return;
    }
    if (items.length === 0) {
      setError("Agregá al menos un producto a la orden.");
      return;
    }

    setSaving(true);
    try {
      const existingOrders = await db.orders.toArray();
      const newOrder: Omit<Order, "id"> = {
        orderNumber: getNextOrderNumber(existingOrders),
        clientId: client.id!,
        clientName: client.name,
        clientAddress: client.address,
        clientContact: client.contact,
        priceCategory,
        date: new Date().toISOString(),
        items,
        totalCRC,
        totalUSD,
        createdAt: Date.now(),
      };
      const id = await db.orders.add(newOrder as Order);
      const saved = { ...newOrder, id } as Order;
      showToast("Orden generada y guardada");
      setGeneratedOrder(saved);
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  const noProducts = products && products.length === 0;
  const categoryInfo = getPriceCategoryInfo(priceCategory);

  return (
    <div>
      <h2 className="screen-title">Nueva Orden de Compra</h2>

      {noProducts && (
        <div className="card">
          <EmptyState icon="🧾" text="Primero agregá al menos un producto en el módulo Productos." />
        </div>
      )}

      {!noProducts && (
        <>
          <div className="card">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Cliente</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Seleccionar cliente...</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 10 }}
              onClick={() => setShowNewClient(true)}
            >
              + Ingresar cliente nuevo
            </button>
          </div>

          {selectedClient && (
            <div className="card">
              {!changingCategory ? (
                <div className="category-display-row">
                  <div>
                    <span className="field-label-inline">Categoría de precio</span>
                    <div className="category-display-value">
                      {categoryInfo.label} ({categoryInfo.currency === "USD" ? "$" : "₡"})
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setChangingCategory(true)}
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <>
                  <PriceCategoryPicker
                    value={priceCategory}
                    onChange={(next) => {
                      setCategoryOverride(next);
                      setChangingCategory(false);
                    }}
                  />
                  <p style={{ fontSize: 11, color: "var(--tuwa-gray-500)", margin: "4px 0 0" }}>
                    Este cambio es solo para esta orden, no modifica la categoría guardada del cliente.
                  </p>
                </>
              )}
            </div>
          )}

          {selectedClient && (
            <>
              <div className="order-builder">
                <div className="order-builder-form">
                  <AddLineForm
                    products={products ?? []}
                    priceCategory={priceCategory}
                    editItem={editingIndex !== null ? items[editingIndex] : null}
                    onSave={handleSaveLine}
                    onCancelEdit={() => setEditingIndex(null)}
                  />
                </div>
                <div className="order-builder-list">
                  <AddedLinesList
                    items={items}
                    editingIndex={editingIndex}
                    onEdit={setEditingIndex}
                    onRemove={handleRemoveLine}
                  />
                </div>
              </div>

              <div className="card">
                {totalCRC > 0 && (
                  <div className="total-bar">
                    <span>Total ₡</span>
                    <span className="amount">{formatCRC(totalCRC)}</span>
                  </div>
                )}
                {totalUSD > 0 && (
                  <div className="total-bar">
                    <span>Total $</span>
                    <span className="amount">{formatUSD(totalUSD)}</span>
                  </div>
                )}
              </div>

              {error && (
                <p style={{ color: "var(--tuwa-danger)", fontSize: 13, fontWeight: 600 }}>{error}</p>
              )}

              <button className="btn btn-primary" onClick={handleGenerar} disabled={saving}>
                {saving ? "Generando..." : "Generar Orden"}
              </button>
            </>
          )}
        </>
      )}

      {showNewClient && (
        <ClienteForm onClose={() => setShowNewClient(false)} onSave={handleNewClientSave} />
      )}

      {generatedOrder && (
        <ShareOrderSheet order={generatedOrder} onClose={() => setGeneratedOrder(null)} />
      )}
    </div>
  );
}
