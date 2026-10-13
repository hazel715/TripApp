import type { Dependencies } from "../dependencies.ts";
export const transaction=<T>(deps:Dependencies,fn:()=>Promise<T>)=>deps.uow.run(fn);
