# 데이터 규칙

스키마는 [database-schema.md](./database-schema.md). 계산 불변량은 [../calculation/calculation-rules.md](../calculation/calculation-rules.md).

## 식별

- 공개 ID는 UUID. 레거시 `Date.now()` 문자열은 충돌 가능하므로 쓰지 않는다.
- 닉네임은 식별자가 아니다. 레거시 `payer: 'MJ'` 방식은 이름 변경에 깨진다.

## Project 격리

- 모든 지출/정산/멤버 쿼리는 `project_id`로 제한한다.
- 다른 Project 멤버 ID를 payer/share에 넣을 수 없다.

## 멤버 수명

- 지출 또는 transfer에 한 번이라도 등장한 멤버는 `DELETE`하지 않는다. `is_active = false`.
- 비활성 멤버는 새 지출의 결제자/참여자 후보에서 뺀다.

## 지출

- `occurred_on`은 날짜만. 타임존 변환을 피하기 위해 사용자 로컬 달력 날짜를 그대로 저장한다 (여행 중 현지 일자).
- `created_at`은 서버 UTC. 둘이 다를 수 있다.
- share 합 = amount_minor. 저장 한 트랜잭션에서 검증.
- 정산에 묶인 지출(`settlement_id NOT NULL`)은 MVP에서 UPDATE/DELETE 금지.

## 환율

- 저장 후 기본 환율 테이블을 바꿔도 기존 지출 `fx_rate`는 불변.
- KRW 지출(기준 KRW)의 `fx_rate`는 항상 1, `fx_custom` false.

## 동시성

레거시는 추가에 `arrayUnion`, 수정에 배열 전체 `updateDoc`을 쓴다. 수정과 동시 추가는 경쟁한다.

신규:

- 행 단위 INSERT
- 수정은 해당 expense 행만
- 정산 확정은 대상 지출을 `WHERE settlement_id IS NULL`로 잠근다 (SELECT FOR UPDATE)

## 소프트 삭제

지출 삭제는 MVP에서 hard delete (정산 전만). 감사 로그는 2차.
