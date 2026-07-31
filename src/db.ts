import Dexie, { type Table } from "dexie";
import type { Client, Order, Product } from "./types";
import { SEED_PRODUCTS } from "./seedProducts";

class TuwaDatabase extends Dexie {
  products!: Table<Product, number>;
  clients!: Table<Client, number>;
  orders!: Table<Order, number>;

  constructor() {
    super("tuwa-cr-pro");

    this.version(1).stores({
      products: "++id, &code, description",
      clients: "++id, name",
      clientPrices: "++id, clientId, productId, [clientId+productId]",
      orders: "++id, clientId, createdAt",
    });

    this.version(2)
      .stores({
        products: "++id, &code, description",
        clients: "++id, name",
        clientPrices: "++id, clientId, productId, [clientId+productId]",
        orders: "++id, clientId, createdAt",
      })
      .upgrade(async (tx) => {
        await tx
          .table("products")
          .toCollection()
          .modify((p: Product & { price?: number }) => {
            p.distribuidorCRC = p.price ?? 0;
            p.veinsaRegularUSD = p.veinsaRegularUSD ?? 0;
            p.veinsaEspecialUSD = p.veinsaEspecialUSD ?? 0;
            p.agenteAutorizadoCRC = p.agenteAutorizadoCRC ?? 0;
            delete p.price;
          });
        await tx
          .table("clients")
          .toCollection()
          .modify((c: Client) => {
            c.priceCategory = c.priceCategory ?? "distribuidor";
          });
      });

    // Per-client per-product custom pricing was removed in favor of the
    // simpler category system managed entirely from the Clientes module.
    this.version(3).stores({
      products: "++id, &code, description",
      clients: "++id, name",
      clientPrices: null,
      orders: "++id, clientId, createdAt",
    });

    // Clients now capture a cédula, and orders show a Subtotal/IVA/Total
    // breakdown instead of a single tax-free total.
    this.version(4)
      .stores({
        products: "++id, &code, description",
        clients: "++id, name",
        orders: "++id, clientId, createdAt",
      })
      .upgrade(async (tx) => {
        await tx
          .table("clients")
          .toCollection()
          .modify((c: Client) => {
            c.idNumber = c.idNumber ?? "";
          });
        await tx
          .table("orders")
          .toCollection()
          .modify((o: Order & { totalCRC: number; totalUSD: number }) => {
            o.clientIdNumber = o.clientIdNumber ?? "";
            o.subtotalCRC = o.totalCRC ?? 0;
            o.subtotalUSD = o.totalUSD ?? 0;
            o.ivaCRC = 0;
            o.ivaUSD = 0;
          });
      });

    this.on("populate", () => {
      this.products.bulkAdd(SEED_PRODUCTS.map((p) => ({ ...p, createdAt: Date.now() })));
    });
  }
}

export const db = new TuwaDatabase();
