# 인수 테스트

## A1 로그인과 Project

Given 이메일로 login link를 받는다  
When verify하면  
Then session이 발급되고 Project를 만들 수 있다.

## A2 지출과 Share

When settlement_amount와 share 합이 다르면  
Then 저장되지 않는다.  
When 같으면  
Then 목록에 보이고 현황에 반영된다.

## A3 현황 vs 최종 정산

When 현황만 열면  
Then 송금 목록이 없다.  
When 최종 정산 보기를 누르면  
Then 최소 송금 목록이 보인다.

## A4 closed 재오픈

Given Project가 closed  
When Expense를 수정하면  
Then status는 active.

## A5 여행 기능 부재

When 신규 web을 연다  
Then 일정/준비물/지도가 없다.

## A6 권한

When 비멤버가 지출 POST를 하면  
Then 403.
