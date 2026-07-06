import type { Order } from "../types";

const PREFIX = "P-";
const SUFFIX = "-A";
const PAD = 5;
const START = 9;

const PATTERN = /^P-(\d+)-A$/;

export function getNextOrderNumber(existingOrders: Order[]): string {
  const seqs = existingOrders
    .map((o) => PATTERN.exec(o.orderNumber)?.[1])
    .filter((v): v is string => v !== undefined)
    .map((v) => Number(v));
  const next = seqs.length > 0 ? Math.max(...seqs) + 1 : START;
  return `${PREFIX}${String(next).padStart(PAD, "0")}${SUFFIX}`;
}
