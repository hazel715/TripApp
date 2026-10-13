import {Decimal} from "decimal.js";
import type {Share} from "./api.ts";
export function equalShares(total:string,ids:string[]):Share[]{
 const unique=[...new Set(ids)];if(!unique.length)return [];
 const value=new Decimal(total);if(!value.isFinite()||value.isZero()||value.decimalPlaces()>4)throw new Error("정산 금액을 소수 4자리 이내의 0이 아닌 값으로 입력하세요.");
 const part=value.div(unique.length).toDecimalPlaces(4,Decimal.ROUND_DOWN);
 return unique.map((userId,index)=>({userId,shareAmount:(index===0?part.plus(value.minus(part.times(unique.length))):part).toFixed(4)}));
}
export function today(){const now=new Date();return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`}
