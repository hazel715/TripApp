import Decimal from "decimal.js";
import { DomainError } from "./errors.ts";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

const SCALE = 4;

export class Money {
  readonly value: Decimal;

  private constructor(value: Decimal) {
    this.value = value;
  }

  static of(input: string | number | Decimal): Money {
    const value = new Decimal(input);
    if (!value.isFinite()) {
      throw new DomainError("INVALID_MONEY", "Amount must be a finite number");
    }
    if (value.decimalPlaces() > SCALE) {
      throw new DomainError(
        "INVALID_MONEY",
        `Amount cannot have more than ${SCALE} decimal places`,
      );
    }
    return new Money(value);
  }

  static zero(): Money {
    return new Money(new Decimal(0));
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  isNegative(): boolean {
    return this.value.isNegative();
  }

  plus(other: Money): Money {
    return Money.of(this.value.plus(other.value));
  }

  minus(other: Money): Money {
    return Money.of(this.value.minus(other.value));
  }

  equals(other: Money): boolean {
    return this.value.eq(other.value);
  }

  abs(): Money {
    return Money.of(this.value.abs());
  }

  toFixed(): string {
    return this.value.toFixed(SCALE);
  }

  toString(): string {
    return this.value.toString();
  }
}

export function assertNonZero(amount: Money, field: string): void {
  if (amount.isZero()) {
    throw new DomainError("ZERO_AMOUNT", `${field} cannot be zero`);
  }
}
