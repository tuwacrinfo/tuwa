import { useState } from "react";
import { Sheet } from "../../components/Sheet";
import { PriceCategoryPicker } from "../../components/PriceCategoryPicker";
import type { Client, PriceCategory } from "../../types";

export function ClienteForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Client;
  onSave: (data: {
    name: string;
    idNumber: string;
    address: string;
    contact: string;
    priceCategory: PriceCategory;
  }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [idNumber, setIdNumber] = useState(initial?.idNumber ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [contact, setContact] = useState(initial?.contact ?? "");
  const [priceCategory, setPriceCategory] = useState<PriceCategory>(
    initial?.priceCategory ?? "distribuidor"
  );
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const idn = idNumber.trim();
    const a = address.trim();
    const c = contact.trim();
    if (!n || !idn || !a || !c) {
      setError("Completá nombre, cédula, dirección y contacto.");
      return;
    }
    onSave({ name: n, idNumber: idn, address: a, contact: c, priceCategory });
  }

  return (
    <Sheet title={initial ? "Editar cliente" : "Nuevo cliente"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del cliente"
            autoFocus
          />
        </div>
        <div className="field">
          <label>Cédula</label>
          <input
            type="text"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            placeholder="Cédula física o jurídica"
          />
        </div>
        <div className="field">
          <label>Dirección</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Dirección"
          />
        </div>
        <div className="field">
          <label>Contacto</label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Teléfono o correo"
          />
        </div>

        <PriceCategoryPicker value={priceCategory} onChange={setPriceCategory} />

        {error && (
          <p style={{ color: "var(--tuwa-danger)", fontSize: 13, fontWeight: 600 }}>{error}</p>
        )}
        <div className="row-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            Guardar
          </button>
        </div>
      </form>
    </Sheet>
  );
}
