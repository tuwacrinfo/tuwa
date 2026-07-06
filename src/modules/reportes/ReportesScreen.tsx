import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db";
import type { Order } from "../../types";
import { EmptyState } from "../../components/EmptyState";
import { Sheet } from "../../components/Sheet";
import { ShareOrderSheet } from "../../components/ShareOrderSheet";
import { formatCRC, formatUSD, formatDate } from "../../lib/format";

export function ReportesScreen() {
  const orders = useLiveQuery(() => db.orders.orderBy("createdAt").reverse().toArray(), []);
  const clients = useLiveQuery(() => db.clients.toArray(), []);
  const [clientFilter, setClientFilter] = useState("");
  const [detail, setDetail] = useState<Order | null>(null);
  const [sharing, setSharing] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    if (!orders) return [];
    if (!clientFilter) return orders;
    return orders.filter((o) => String(o.clientId) === clientFilter);
  }, [orders, clientFilter]);

  const summary = useMemo(() => {
    return filtered.reduce(
      (acc, o) => {
        acc.count += 1;
        acc.crc += o.totalCRC;
        acc.usd += o.totalUSD;
        return acc;
      },
      { count: 0, crc: 0, usd: 0 }
    );
  }, [filtered]);

  return (
    <div>
      <h2 className="screen-title">Reportes</h2>

      <div className="card">
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Filtrar por cliente</label>
          <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
            <option value="">Todos los clientes</option>
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="list-row">
          <span style={{ fontSize: 13, color: "var(--tuwa-gray-700)" }}>Órdenes</span>
          <strong>{summary.count}</strong>
        </div>
        {summary.crc > 0 && (
          <div className="list-row">
            <span style={{ fontSize: 13, color: "var(--tuwa-gray-700)" }}>Total ₡</span>
            <strong>{formatCRC(summary.crc)}</strong>
          </div>
        )}
        {summary.usd > 0 && (
          <div className="list-row">
            <span style={{ fontSize: 13, color: "var(--tuwa-gray-700)" }}>Total $</span>
            <strong>{formatUSD(summary.usd)}</strong>
          </div>
        )}
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState
            icon="📊"
            text="No hay órdenes generadas todavía."
          />
        ) : (
          filtered.map((o) => (
            <div className="list-row" key={o.id} style={{ cursor: "pointer" }} onClick={() => setDetail(o)}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{o.clientName}</div>
                <div style={{ fontSize: 12, color: "var(--tuwa-gray-700)", marginTop: 2 }}>
                  {formatDate(o.date)} · Orden {o.orderNumber}
                </div>
              </div>
              <div style={{ textAlign: "right", fontSize: 12, fontWeight: 700 }}>
                {o.totalCRC > 0 && <div>{formatCRC(o.totalCRC)}</div>}
                {o.totalUSD > 0 && <div style={{ color: "var(--tuwa-orange-dark)" }}>{formatUSD(o.totalUSD)}</div>}
              </div>
            </div>
          ))
        )}
      </div>

      {detail && (
        <Sheet title={`Orden ${detail.orderNumber}`} onClose={() => setDetail(null)}>
          <p style={{ fontSize: 13, color: "var(--tuwa-gray-700)", marginTop: 0 }}>
            {detail.clientName} · {formatDate(detail.date)}
          </p>
          {detail.items.map((item, idx) => (
            <div className="list-row" key={idx}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>
                  <span className="pill" style={{ marginRight: 6 }}>{item.code}</span>
                  {item.description}
                </div>
                <div style={{ fontSize: 12, color: "var(--tuwa-gray-700)", marginTop: 2 }}>
                  {item.quantity} und × {item.currency === "USD" ? formatUSD(item.unitPrice) : formatCRC(item.unitPrice)}
                  <span className="pill" style={{ marginLeft: 6 }}>{item.priceLabel}</span>
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>
                {item.currency === "USD"
                  ? formatUSD(item.quantity * item.unitPrice)
                  : formatCRC(item.quantity * item.unitPrice)}
              </div>
            </div>
          ))}
          <div className="divider" />
          {detail.totalCRC > 0 && (
            <div className="total-bar">
              <span>Total ₡</span>
              <span className="amount">{formatCRC(detail.totalCRC)}</span>
            </div>
          )}
          {detail.totalUSD > 0 && (
            <div className="total-bar">
              <span>Total $</span>
              <span className="amount">{formatUSD(detail.totalUSD)}</span>
            </div>
          )}
          <button
            className="btn btn-primary"
            style={{ marginTop: 14 }}
            onClick={() => {
              setSharing(detail);
              setDetail(null);
            }}
          >
            📤 Compartir / Descargar PDF
          </button>
        </Sheet>
      )}

      {sharing && <ShareOrderSheet order={sharing} onClose={() => setSharing(null)} />}
    </div>
  );
}
