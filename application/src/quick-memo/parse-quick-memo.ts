import { Decimal } from "decimal.js";
import {
  DomainError,
  Money,
  assertNonZero,
  type Project,
} from "@tripapp/domain";
export type ParsedQuickMemo = {
  description: string;
  amount: string;
  participantUserIds: string[];
  currencyHint: string | null;
};
/** Input parsing belongs to Application; Expense validation remains authoritative at save. */
export function parseQuickMemo(
  text: string,
  project: Project,
): ParsedQuickMemo {
  const raw = text.trim();
  const match = raw.match(
    /(?:^|\s)(-?\d+(?:\.\d+)?)(만원|원|위안|달러|USD|KRW|CNY)?(?=\s|$)/i,
  );
  if (!match)
    throw new DomainError("INVALID_MEMO", "Quick memo must include an amount");
  const suffix = match[2]?.toLowerCase();
  const value = new Decimal(match[1]).times(suffix === "만원" ? 10000 : 1);
  const amount = Money.of(value);
  assertNonZero(amount, "amount");
  const rest = raw.replace(match[0], " ").trim().split(/\s+/).filter(Boolean);
  const participants = new Set<string>();
  const description: string[] = [];
  for (const token of rest) {
    const members = project.members.filter(
      (member) => member.displayName.toLowerCase() === token.toLowerCase(),
    );
    if (members.length > 1)
      throw new DomainError(
        "AMBIGUOUS_MEMBER",
        "Quick memo member name is ambiguous",
      );
    if (members.length) participants.add(members[0].userId);
    else description.push(token);
  }
  const currencyHint = suffix
    ? ({
        만원: "KRW",
        원: "KRW",
        krw: "KRW",
        위안: "CNY",
        cny: "CNY",
        달러: "USD",
        usd: "USD",
      }[suffix] ?? null)
    : null;
  return {
    description: description.join(" ") || "빠른 메모 지출",
    amount: amount.toString(),
    participantUserIds: participants.size
      ? [...participants]
      : project.members.map((member) => member.userId),
    currencyHint,
  };
}
