import { DomainError } from "./errors.ts";

export type CurrencyCode = string;

const CODE = /^[A-Z]{3}$/;

export function assertCurrencyCode(code: string): CurrencyCode {
  const normalized = code.trim().toUpperCase();
  if (!CODE.test(normalized)) {
    throw new DomainError("INVALID_CURRENCY", "Currency must be a 3-letter ISO code");
  }
  return normalized;
}
