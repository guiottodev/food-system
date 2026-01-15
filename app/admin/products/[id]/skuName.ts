import type { SkuAttributeInput } from "@/lib/validation/skuAttributes";

const separator = " \u2022 ";

export function generateSkuDisplayName(
  productName: string,
  attrs: SkuAttributeInput[],
  maxLength = 90
): string {
  const safeProduct = String(productName ?? "").trim();
  const pairs = (attrs ?? [])
    .map((attr) => ({
      key: String(attr?.key ?? "").trim(),
      value: String(attr?.value ?? "").trim(),
    }))
    .filter((attr) => attr.key && attr.value)
    .map((attr) => `${attr.key}: ${attr.value}`);

  const parts = safeProduct ? [safeProduct, ...pairs] : pairs;
  const raw = parts.join(separator);
  if (!raw) return "";

  const limit = Math.max(10, maxLength);
  if (raw.length <= limit) return raw;
  return `${raw.slice(0, limit - 1).trimEnd()}\u2026`;
}
