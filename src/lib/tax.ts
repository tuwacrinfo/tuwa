export const IVA_RATE = 0.13;

export function calcIva(subtotal: number): number {
  return subtotal * IVA_RATE;
}
