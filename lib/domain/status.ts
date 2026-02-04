import { OrderStatus } from "@prisma/client";

export const FINAL_STATUSES: OrderStatus[] = ["ENTREGUE", "CANCELADO"];

const transitions: Record<OrderStatus, OrderStatus[]> = {
  RASCUNHO: ["CONFIRMADO", "EM_PRODUCAO", "CANCELADO"],
  CONFIRMADO: ["EM_PRODUCAO", "CANCELADO"],
  EM_PRODUCAO: ["PRONTO", "CANCELADO"],
  PRONTO: ["ENTREGUE", "CANCELADO"],
  ENTREGUE: [],
  CANCELADO: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  const allowed = transitions[from] ?? [];
  return allowed.includes(to);
}

export function isFinalStatus(status: OrderStatus): boolean {
  return FINAL_STATUSES.includes(status);
}
