export type User={id:string;email:string};
export type Member={userId:string;displayName:string;role:"owner"|"member"};
export type Project={id:string;name:string;defaultExpenseCurrency:string;settlementCurrency:string;status:string;members:Member[]};
export type Category={id:string;name:string};
export type Share={userId:string;shareAmount:string};
export type Expense={id:string;payerUserId:string;description:string;categoryId:string|null;amount:string;currency:string;fxRate:string|null;settlementAmount:string;settlementCurrency:string;expenseDate:string|null;shares:Share[]};
export type Burden={currency:string;rows:{userId:string;paid:string;shareTotal:string;difference:string}[]};
export type Final={currency:string;transfers:{fromUserId:string;toUserId:string;amount:string}[]};
export async function api<T>(path:string,method="GET",body?:unknown):Promise<T>{
 const response=await fetch("/api"+path,{method,credentials:"include",headers:body===undefined?{}:{"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
 if(!response.ok){const payload=await response.json().catch(()=>({error:response.statusText}));throw new Error(payload.error)}
 return response.status===204?undefined as T:response.json();
}
