import { DomainError, type Project } from "@tripapp/domain";

export type ParsedQuickMemo = {
  description: string;
  amount: string;
  participantUserIds: string[];
  currencyHint: string | null;
};

/**
 * Parses a one-line memo such as "점심 12000 민수 철수".
 * Matching uses project member display names (and email local-part).
 */
export function parseQuickMemo(text: string, project: Project): ParsedQuickMemo {
  const raw = text.trim();
  if (!raw) {
    throw new DomainError("INVALID_MEMO", "Quick memo text is required");
  }

  const amountMatch = raw.match(/-?\d+(?:\.\d+)?/);
  if (!amountMatch) {
    throw new DomainError("INVALID_MEMO", "Quick memo must include an amount");
  }
  let amount = amountMatch[0];
  if (/만원/.test(raw) && Math.abs(Number(amount)) < 1000) {
    amount = String(Number(amount) * 10000);
  }

  let currencyHint: string | null = null;
  if (/(달러|\$|usd)/i.test(raw)) currencyHint = "USD";
  else if (/(원|만원|krw)/i.test(raw)) currencyHint = "KRW";
  else if (/(위안|cny)/i.test(raw)) currencyHint = "CNY";

  const tokens = raw.split(/\s+/);
  const matchedIds: string[] = [];
  const consumed = new Set<number>();

  for (const member of project.members) {
    const aliases = [
      member.displayName,
      member.displayName.replace(/\s+/g, ""),
    ].filter(Boolean);
    tokens.forEach((token, index) => {
      if (consumed.has(index)) return;
      if (aliases.some((alias) => alias.toLowerCase() === token.toLowerCase())) {
        matchedIds.push(member.userId);
        consumed.add(index);
      }
    });
  }

  const descriptionTokens = tokens.filter((token, index) => {
    if (consumed.has(index)) return false;
    if (token === amountMatch[0]) return false;
    if (/^(달러|\$|usd|원|만원|krw|위안|cny)$/i.test(token)) return false;
    if (/^-?\d+(?:\.\d+)?$/.test(token)) return false;
    return true;
  });

  const description = descriptionTokens.join(" ").trim() || "빠른 메모 지출";
  const participantUserIds =
    matchedIds.length > 0 ? [...new Set(matchedIds)] : project.members.map((m) => m.userId);

  return { description, amount, participantUserIds, currencyHint };
}
