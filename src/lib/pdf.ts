import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Order } from "../types";
import { formatCRC, formatUSD, formatDate } from "./format";
import { PDF_FONT_BOLD_BASE64, PDF_FONT_REGULAR_BASE64 } from "./pdfFonts";
import { IVA_RATE } from "./tax";

const PDF_FONT = "TuwaSans";

// Standard PDF fonts (Helvetica/Times/Courier) don't include the Costa Rican
// colon sign (₡), so it rendered as a broken glyph. This embeds a subset of
// Arial (regular/bold) that does, and it's used for all text in the PDF.
function registerPdfFont(doc: jsPDF) {
  doc.addFileToVFS("TuwaSans-Regular.ttf", PDF_FONT_REGULAR_BASE64);
  doc.addFont("TuwaSans-Regular.ttf", PDF_FONT, "normal");
  doc.addFileToVFS("TuwaSans-Bold.ttf", PDF_FONT_BOLD_BASE64);
  doc.addFont("TuwaSans-Bold.ttf", PDF_FONT, "bold");
}

let logoDataUrlCache: string | null = null;

async function loadLogoDataUrl(): Promise<string> {
  if (logoDataUrlCache) return logoDataUrlCache;
  const res = await fetch(`${import.meta.env.BASE_URL}logo.png`);
  const blob = await res.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  logoDataUrlCache = dataUrl;
  return dataUrl;
}

export async function buildOrderPdf(order: Order): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  registerPdfFont(doc);
  doc.setFont(PDF_FONT, "normal");
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;

  try {
    const logo = await loadLogoDataUrl();
    const logoW = 220;
    const logoH = (196 / 876) * logoW;
    doc.addImage(logo, "PNG", marginX, 30, logoW, logoH);
  } catch {
    doc.setFontSize(16);
    doc.setFont(PDF_FONT, "bold");
    doc.text("TUWA CR PRO", marginX, 50);
  }

  doc.setDrawColor(232, 121, 42);
  doc.setLineWidth(2);
  doc.line(marginX, 90, pageWidth - marginX, 90);

  doc.setTextColor(10, 10, 10);
  doc.setFontSize(18);
  doc.setFont(PDF_FONT, "bold");
  doc.text("Orden de Compra", marginX, 115);

  doc.setFontSize(10);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(74, 74, 74);
  doc.text(`No. de orden: ${order.orderNumber}`, pageWidth - marginX, 108, { align: "right" });
  doc.text(`Fecha: ${formatDate(order.date)}`, pageWidth - marginX, 122, { align: "right" });

  let y = 145;
  doc.setFontSize(11);
  doc.setFont(PDF_FONT, "bold");
  doc.setTextColor(10, 10, 10);
  doc.text("Cliente", marginX, y);
  y += 16;
  doc.setFont(PDF_FONT, "normal");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text(`Nombre: ${order.clientName}`, marginX, y);
  y += 14;
  doc.text(`Cédula: ${order.clientIdNumber}`, marginX, y);
  y += 14;
  doc.text(`Dirección: ${order.clientAddress}`, marginX, y);
  y += 14;
  doc.text(`Contacto: ${order.clientContact}`, marginX, y);
  y += 20;

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["Código", "Descripción", "Cant.", "Precio unit.", "Subtotal"]],
    body: order.items.map((item) => {
      const subtotal = item.quantity * item.unitPrice;
      const unitLabel = item.currency === "USD" ? formatUSD(item.unitPrice) : formatCRC(item.unitPrice);
      const subtotalLabel = item.currency === "USD" ? formatUSD(subtotal) : formatCRC(subtotal);
      return [item.code, item.description, String(item.quantity), unitLabel, subtotalLabel];
    }),
    styles: { font: PDF_FONT, fontSize: 9, cellPadding: 6 },
    headStyles: { font: PDF_FONT, fontStyle: "bold", fillColor: [10, 10, 10], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [242, 242, 242] },
    columnStyles: {
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
    },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  doc.setFontSize(10);
  doc.setTextColor(10, 10, 10);

  let totalsY = finalY;
  const ivaPercent = IVA_RATE * 100;

  function writeTotalsBlock(subtotal: number, iva: number, total: number, symbol: string, format: (n: number) => string) {
    doc.setFont(PDF_FONT, "normal");
    doc.text(`Subtotal ${symbol}: ${format(subtotal)}`, pageWidth - marginX, totalsY, { align: "right" });
    totalsY += 14;
    doc.text(`IVA (${ivaPercent}%) ${symbol}: ${format(iva)}`, pageWidth - marginX, totalsY, { align: "right" });
    totalsY += 16;
    doc.setFont(PDF_FONT, "bold");
    doc.setFontSize(11);
    doc.text(`Total ${symbol}: ${format(total)}`, pageWidth - marginX, totalsY, { align: "right" });
    doc.setFontSize(10);
    totalsY += 20;
  }

  if (order.subtotalCRC > 0) {
    writeTotalsBlock(order.subtotalCRC, order.ivaCRC, order.totalCRC, "₡", formatCRC);
  }
  if (order.subtotalUSD > 0) {
    doc.setTextColor(232, 121, 42);
    writeTotalsBlock(order.subtotalUSD, order.ivaUSD, order.totalUSD, "$", formatUSD);
  }

  doc.setFontSize(8);
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(138, 138, 138);
  doc.text(
    "Generado desde la app TUWA CR PRO",
    marginX,
    doc.internal.pageSize.getHeight() - 30
  );

  return doc.output("blob");
}

export function orderFileName(order: Order): string {
  const safeClient = order.clientName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return `orden-${order.orderNumber}-${safeClient}.pdf`;
}
