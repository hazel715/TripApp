# 테스트 전략

케이스 숫자는 [calculation-cases.md](./calculation-cases.md). 인수 시나리오는 [acceptance-tests.md](./acceptance-tests.md).

## 레거시

테스트 파일, 테스트 러너, CI 없음.

## 피라미드

1. **ledger-core 단위 테스트** (최우선)  
   변환, 균등 분할, 정산 greedy, 퀵메모 파서.
2. **API 통합**  
   지출 CRUD, 정산 확정 트랜잭션, 권한.
3. **E2E 소수**  
   지출 추가 → 정산 미리보기.

UI에서 금액을 계산하는 테스트는 만들지 않는다. 표시 포맷(`MM-DD`, `toLocaleString`)만 컴포넌트 테스트.

## 회귀 방법

레거시 함수를 그대로 복사한 fixture로 “구버전 결과”를 남길 수 있다. 정수 분배로 바뀌는 케이스는 구버전과 다를 수 있음을 명시하고 신버전만 assert한다.

## 돈 타입

테스트에서 `number` 0.1 합을 쓰지 않는다. `bigint` minor.
