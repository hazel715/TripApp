# 테스트 전략

러너: Vitest. 레거시에는 테스트가 없었다.

## 피라미드

1. **Domain/Application 단위** (최우선)  
   Expense CRUD 규칙, Share 합, 음수, payer≠participant, closed→active, member role, global category, 부담 현황, 최소 송금, Quick Memo 파서.
2. **API**  
   주요 endpoint 정상/실패. DB 없이 in-memory adapter로 검증 가능하게 둔다.
3. **E2E**  
   MVP에서는 필수 자동화 범위가 아니다. 수동 흐름은 [acceptance-tests.md](./acceptance-tests.md).

테스트에서 `0.1 + 0.2` 같은 IEEE float 합을 쓰지 않는다. Decimal 문자열을 비교한다.
