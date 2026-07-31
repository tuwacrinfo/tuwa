import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db";
import type { Client, PriceCategory } from "../../types";
import { EmptyState } from "../../components/EmptyState";
import { ConfirmSheet } from "../../components/Sheet";
import { ClienteForm } from "./ClienteForm";
import { useToast } from "../../components/Toast";
import { getPriceCategoryInfo } from "../../lib/priceCategories";

export function ClientesScreen() {
  const clients = useLiveQuery(() => db.clients.toArray(), []);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Client | null | undefined>(undefined);
  const [toDelete, setToDelete] = useState<Client | null>(null);
  const [selected, setSelected] = useState<Client | null>(null);
  const showToast = useToast();

  const sorted = useMemo(() => {
    if (!clients) return [];
    const term = search.trim().toLowerCase();
    const filtered = term
      ? clients.filter((c) => c.name.toLowerCase().includes(term))
      : clients;
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, search]);

  async function handleSave(data: {
    name: string;
    idNumber: string;
    address: string;
    contact: string;
    priceCategory: PriceCategory;
  }) {
    if (editing && editing.id) {
      await db.clients.update(editing.id, data);
      showToast("Cliente actualizado");
      if (selected?.id === editing.id) setSelected({ ...selected, ...data });
    } else {
      await db.clients.add({ ...data, createdAt: Date.now() });
      showToast("Cliente agregado");
    }
    setEditing(undefined);
  }

  async function handleDelete() {
    if (toDelete?.id) {
      await db.clients.delete(toDelete.id);
      showToast("Cliente eliminado");
      if (selected?.id === toDelete.id) setSelected(null);
    }
    setToDelete(null);
  }

  if (selected) {
    return (
      <div>
        <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)} style={{ marginBottom: 12 }}>
          ← Volver a clientes
        </button>
        <h2 className="screen-title" style={{ marginBottom: 4 }}>
          {selected.name}
        </h2>
        <div className="card">
          <div style={{ fontSize: 13, color: "var(--tuwa-gray-700)", marginBottom: 4 }}>
            🪪 {selected.idNumber}
          </div>
          <div style={{ fontSize: 13, color: "var(--tuwa-gray-700)", marginBottom: 4 }}>
            📍 {selected.address}
          </div>
          <div style={{ fontSize: 13, color: "var(--tuwa-gray-700)" }}>📞 {selected.contact}</div>
          <div style={{ marginTop: 8 }}>
            <span className="pill">{getPriceCategoryInfo(selected.priceCategory).label}</span>
          </div>
          <div className="row-actions" style={{ marginTop: 12 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setEditing(selected)}>
              Editar
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => setToDelete(selected)}>
              Borrar cliente
            </button>
          </div>
        </div>

        {editing !== undefined && (
          <ClienteForm
            initial={editing ?? undefined}
            onClose={() => setEditing(undefined)}
            onSave={handleSave}
          />
        )}
        {toDelete && (
          <ConfirmSheet
            title="Eliminar cliente"
            message={`¿Seguro que querés eliminar a "${toDelete.name}"? Esta acción no se puede deshacer.`}
            onCancel={() => setToDelete(null)}
            onConfirm={handleDelete}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 className="screen-title">Clientes</h2>

      <input
        className="search-bar"
        type="text"
        placeholder="Buscar cliente..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="card" style={{ marginBottom: 14 }}>
        {sorted.length === 0 ? (
          <EmptyState
            icon="👥"
            text={
              clients && clients.length === 0
                ? "Aún no hay clientes. Agregá el primero."
                : "No se encontraron clientes."
            }
          />
        ) : (
          sorted.map((c) => (
            <div className="list-row" key={c.id} onClick={() => setSelected(c)} style={{ cursor: "pointer" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "var(--tuwa-gray-700)", marginTop: 2 }}>
                  {c.contact} · {getPriceCategoryInfo(c.priceCategory).shortLabel}
                </div>
              </div>
              <span style={{ color: "var(--tuwa-gray-500)", fontSize: 18 }}>›</span>
            </div>
          ))
        )}
      </div>

      <button className="btn btn-primary" onClick={() => setEditing(null)}>
        + Agregar cliente
      </button>

      {editing !== undefined && (
        <ClienteForm
          initial={editing ?? undefined}
          onClose={() => setEditing(undefined)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
