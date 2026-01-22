export function normalizePhoneDigits(input: string) {
  return String(input ?? "").replace(/\D/g, "");
}

export function normalizePhoneBR(input: string): string | null {
  const digits = normalizePhoneDigits(input);
  if (!digits) return null;
  const normalized =
    digits.startsWith("55") && digits.length === 13 ? digits.slice(2) : digits;
  if (normalized.length === 10 || normalized.length === 11) {
    return normalized;
  }
  return null;
}
