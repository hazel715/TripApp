# 데이터 이관 전략

새 데이터베이스를 만든다. 기존 Firestore를 운영 원천으로 유지하지 않는다.

## 기본 방침

**강제 마이그레이션 없음.** 청두 여행 문서는 레거시 앱이 계속 읽을 수 있다. 신규 앱은 빈 DB에서 시작한다.

이유:

- 스키마가 문서 1개 + 배열이라 관계형으로 1:1 복사할 가치가 없다
- 날짜가 연도 없는 표시 문자열이다
- 멤버가 전역 상수다
- 여행 일정/준비물은 신규 범위 밖이다

## 선택적 1회 임포트 (필요할 때만)

제품이 “청두 지출만 가져오기”를 원할 때 오프라인 스크립트로 충분하다. ORM 자동 migration이 아니다.

입력: Firestore `artifacts/chengdu-trip-2026/public/data/trip_data/main`.expenses

매핑:

- 새 Project 하나 생성 (이름: 중케이숀 청두, base KRW)
- MJ/JY/HJ → project_members
- `date` `"M월 D일"` → `occurred_on` = 2026-M-D (레거시 itinerary가 2026 고정)
- `"일자 미지정"` → 임포트 거부하거나 2026-04-17 기본값. 미리 결정
- amount → minor: KRW 그대로, CNY/USD는 `round(amount * 10^digits)` — 레거시가 소수 위안을 썼다면 확인 필요
- included[] → expense_shares 균등 재계산이 아니라, **당시 로직으로 share를 재생성** (정수 분배 규칙은 신규 함수)
- itinerary/essentials → 임포트하지 않음

성공 기준: 신규 정산 결과가 레거시 `calculateSettlement()`와 1원 단위로 일치하는지 비교. 정수 분배로 바꾸면 의도적으로 달라질 수 있다. 그 경우 차이를 테스트 케이스로 남긴다.

## 하지 말 것

- Firestore 필드에 맞춰 PostgreSQL JSON 컬럼으로 배열을 그대로 넣기
- 레거시 앱이 쓰는 문서를 신규 앱이 updateDoc으로 공유하기
- 스키마 변경을 레거시 Firebase에 적용하기
