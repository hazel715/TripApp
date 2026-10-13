import { createHash, randomBytes, randomUUID } from "node:crypto";
export const clock={now:()=>new Date()};
export const ids={next:()=>randomUUID()};
export const hasher={hash:(raw:string)=>createHash("sha256").update(raw).digest("hex"),randomToken:()=>randomBytes(32).toString("hex")};
