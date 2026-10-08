import Decimal from "decimal.js";
import { DomainError } from "./errors.ts";

export type FxRate = Decimal;

export function parseFxRate(input: string | number | Decimal | null | undefined): FxRate | null {
  if (input === null || input === undefined || input === "") {
    return null;
  }
  const value = new Decimal(input);
  if (!value.isFinite() || value.lte(0)) {
    throw new DomainError("INVALID_FX_RATE", "fx_rate must be a positive number");
  }
  if (value.decimalPlaces() > 8) {
    throw new DomainError("INVALID_FX_RATE", "fx_rate cannot have more than 8 decimal places");
  }
  return value;
}

export type FxQuote = {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: FxRate;
  quoteDate: string;
  source: string;
};

/** Port for a future external FX API. MVP does not auto-fill expenses from quotes. */
export interface FxQuotePort {
  getQuote(input: {
    baseCurrency: string;
    quoteCurrency: string;
    quoteDate: string;
  }): Promise<FxQuote | null>;
}
