import { describe, it, expect } from "vitest";
import { createProject } from "@tripapp/domain";
import { parseQuickMemo } from "./parse-quick-memo.ts";
const project = createProject({
  id: "p",
  name: "test",
  defaultExpenseCurrency: "KRW",
  settlementCurrency: "KRW",
  ownerUserId: "a",
  ownerDisplayName: "민수",
  now: new Date(),
});
project.members.push({
  projectId: "p",
  userId: "b",
  role: "member",
  displayName: "철수",
});
describe("Quick Memo", () => {
  it("parses description, amount and participants", () => {
    expect(parseQuickMemo("점심 12000 민수 철수", project)).toMatchObject({
      description: "점심",
      amount: "12000",
      participantUserIds: ["a", "b"],
    });
  });
  it("scales attached 만원 exactly and accepts refunds", () => {
    expect(parseQuickMemo("환불 -0.0001만원 철수", project)).toMatchObject({
      description: "환불",
      amount: "-1",
      currencyHint: "KRW",
      participantUserIds: ["b"],
    });
  });
  it("rejects missing or zero amounts", () => {
    expect(() => parseQuickMemo("점심 민수", project)).toThrow();
    expect(() => parseQuickMemo("점심 0 민수", project)).toThrow();
  });
});
