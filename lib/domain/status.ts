import { OrderStatus } from "@prisma/client";

const transitions: Record<OrderStatus, OrderStatus[]> = {
  NOVO: ["EM_PRODUCAO", "CANCELADO"],
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
  return status === "ENTREGUE" || status === "CANCELADO";
}
