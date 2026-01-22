import { PaymentMethod } from "@prisma/client";

type PaymentInput = {
  paymentMethod?: string | null;
  hasDeposit?: boolean | null;
  depositAmount?: number | string | null;
};

type PaymentResult =
  | {
      ok: true;
      paymentMethod: PaymentMethod | null;
      hasDeposit: boolean;
      depositAmount: number | null;
    }
  | {
      ok: false;
      error: "payment_method_invalid" | "deposit_invalid";
    };

function normalizePaymentMethod(value: string | undefined | null) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (trimmed === "PIX") return "PIX";
  if (trimmed === "DINHEIRO") return "DINHEIRO";
  if (trimmed === "CARTAO") return "CARTAO";
  if (trimmed === "TRANSFERENCIA") return "TRANSFERENCIA";
  if (trimmed === "A_COMBINAR") return "A_COMBINAR";
  return null;
}

function parseDepositAmount(value: number | string | undefined | null) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return { ok: false } as const;
  }

  const parsed = Number(String(value).replace(",", "."));
  if (!Number.isFinite(parsed)) {
    return { ok: false } as const;
  }

  if (parsed <= 0) {
    return { ok: false } as const;
  }

  return { ok: true, value: parsed } as const;
}

export function parseOrderPayment(input: PaymentInput): PaymentResult {
  const paymentMethod = normalizePaymentMethod(input.paymentMethod);
  if (input.paymentMethod && !paymentMethod) {
    return { ok: false, error: "payment_method_invalid" };
  }

  const hasDeposit = input.hasDeposit === true;
  if (!hasDeposit) {
    return { ok: true, paymentMethod, hasDeposit, depositAmount: null };
  }

  const depositResult = parseDepositAmount(input.depositAmount);
  if (!depositResult.ok) {
    return { ok: false, error: "deposit_invalid" };
  }

  return {
    ok: true,
    paymentMethod,
    hasDeposit,
    depositAmount: depositResult.value,
  };
}
