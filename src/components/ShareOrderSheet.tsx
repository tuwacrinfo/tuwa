import { useState } from "react";
import { Sheet } from "./Sheet";
import type { Order } from "../types";
import { buildOrderPdf, orderFileName } from "../lib/pdf";
import { downloadBlob, openEmail, openWhatsApp, shareOrDownloadPdf } from "../lib/share";
import { formatCRC, formatUSD } from "../lib/format";

function summaryText(order: Order): string {
  const lines = [`Orden de Compra ${order.orderNumber} - ${order.clientName}`];
  if (order.totalCRC > 0) lines.push(`Total ₡: ${formatCRC(order.totalCRC)}`);
  if (order.totalUSD > 0) lines.push(`Total $: ${formatUSD(order.totalUSD)}`);
  lines.push("Adjunto PDF con el detalle de la orden. - TUWA CR PRO");
  return lines.join("\n");
}

export function ShareOrderSheet({ order, onClose }: { order: Order; onClose: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [hint, setHint] = useState("");

  async function getBlob() {
    return buildOrderPdf(order);
  }

  async function handleShare() {
    setBusy("share");
    setHint("");
    try {
      const blob = await getBlob();
      const result = await shareOrDownloadPdf(blob, orderFileName(order), summaryText(order));
      if (result === "downloaded") {
        setHint("Tu navegador no permite adjuntar el PDF directamente: se descargó para que lo compartas manualmente.");
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleWhatsApp() {
    setBusy("whatsapp");
    setHint("");
    try {
      const blob = await getBlob();
      downloadBlob(blob, orderFileName(order));
      openWhatsApp(summaryText(order));
      setHint("Se descargó el PDF. Adjuntalo en la conversación de WhatsApp que se abrió.");
    } finally {
      setBusy(null);
    }
  }

  async function handleEmail() {
    setBusy("email");
    setHint("");
    try {
      const blob = await getBlob();
      downloadBlob(blob, orderFileName(order));
      openEmail(`Orden de Compra ${order.orderNumber} - TUWA CR PRO`, summaryText(order));
      setHint("Se descargó el PDF. Adjuntalo en el correo que se abrió.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDownload() {
    setBusy("download");
    try {
      const blob = await getBlob();
      downloadBlob(blob, orderFileName(order));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet title="Orden generada" onClose={onClose}>
      <p style={{ fontSize: 13, color: "var(--tuwa-gray-700)", marginTop: 0 }}>
        La orden {order.orderNumber} para <strong>{order.clientName}</strong> se guardó correctamente.
        Elegí cómo compartir el PDF.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button className="btn btn-primary" onClick={handleShare} disabled={busy !== null}>
          {busy === "share" ? "Preparando..." : "📤 Compartir PDF"}
        </button>
        <button className="btn btn-dark" onClick={handleWhatsApp} disabled={busy !== null}>
          {busy === "whatsapp" ? "Preparando..." : "💬 Abrir WhatsApp"}
        </button>
        <button className="btn btn-outline" onClick={handleEmail} disabled={busy !== null}>
          {busy === "email" ? "Preparando..." : "✉️ Enviar por correo"}
        </button>
        <button className="btn btn-ghost" onClick={handleDownload} disabled={busy !== null}>
          {busy === "download" ? "Descargando..." : "⬇️ Descargar PDF"}
        </button>
      </div>

      {hint && (
        <p style={{ fontSize: 12, color: "var(--tuwa-gray-700)", marginTop: 12 }}>{hint}</p>
      )}

      <button className="btn btn-ghost" onClick={onClose} style={{ marginTop: 14 }}>
        Cerrar
      </button>
    </Sheet>
  );
}
