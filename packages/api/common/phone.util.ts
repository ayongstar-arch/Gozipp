/**
 * Convert a Thai mobile number to the canonical 10-digit local form.
 * Accepts common display formats and +66/66 country-code variants.
 */
export function normalizeThaiMobileNumber(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  let digits = value.trim().replace(/\D/g, '');
  if (digits.startsWith('66') && digits.length === 11) {
    digits = `0${digits.slice(2)}`;
  }

  return /^0[689]\d{8}$/.test(digits) ? digits : null;
}
