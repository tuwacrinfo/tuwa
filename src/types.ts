export type PriceCategory =
  | "distribuidor"
  | "veinsaRegular"
  | "veinsaEspecial"
  | "agenteAutorizado";

export interface Product {
  id?: number;
  code: string;
  description: string;
  distribuidorCRC: number;
  veinsaRegularUSD: number;
  veinsaEspecialUSD: number;
  agenteAutorizadoCRC: number;
  createdAt: number;
}

export interface Client {
  id?: number;
  name: string;
  address: string;
  contact: string;
  priceCategory: PriceCategory;
  createdAt: number;
}

export interface OrderItem {
  productId: number;
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  currency: "CRC" | "USD";
  isDifferentiated: boolean;
  priceLabel: string;
}

export interface Order {
  id?: number;
  orderNumber: string;
  clientId: number;
  clientName: string;
  clientAddress: string;
  clientContact: string;
  priceCategory: PriceCategory;
  date: string;
  items: OrderItem[];
  totalCRC: number;
  totalUSD: number;
  createdAt: number;
}
