import type {User,Project,Expense,Category,UserRepository,ProjectRepository,ExpenseRepository,CategoryRepository,UnitOfWork} from "@tripapp/domain";
import type {LoginToken,Session,LoginTokenRepository,SessionRepository,EmailMessage} from "@tripapp/application";
import {clock,ids,hasher} from "../runtime.ts";
import {SseBroker} from "../realtime/sse.ts";
export function createMemory(){
 let userMap=new Map<string,User>(),projectMap=new Map<string,Project>(),expenseMap=new Map<string,Expense>(),categoryMap=new Map<string,Category>(),tokenMap=new Map<string,LoginToken>(),sessionMap=new Map<string,Session>();
 let pending=Promise.resolve();
 const uow:UnitOfWork={async run(fn){const previous=pending;let release!:()=>void;pending=new Promise<void>(resolve=>{release=resolve});await previous;const snapshot=[new Map(userMap),new Map(projectMap),new Map(expenseMap),new Map(categoryMap),new Map(tokenMap),new Map(sessionMap)] as const;try{return await fn()}catch(error){[userMap,projectMap,expenseMap,categoryMap,tokenMap,sessionMap]=snapshot;throw error}finally{release()}}};
 const users:UserRepository={async findById(id){return userMap.get(id)??null},async findByEmail(email){return [...userMap.values()].find(u=>u.email===email)??null},async save(user){userMap.set(user.id,user)}};
 const projects:ProjectRepository={async findById(id){return projectMap.get(id)??null},async listByUserId(userId){return [...projectMap.values()].filter(p=>p.members.some(m=>m.userId===userId))},async save(project){projectMap.set(project.id,project)}};
 const expenses:ExpenseRepository={async findById(id){return expenseMap.get(id)??null},async listByProject(projectId){return [...expenseMap.values()].filter(e=>e.projectId===projectId)},async save(expense){expenseMap.set(expense.id,expense)},async delete(id){expenseMap.delete(id)}};
 const categories:CategoryRepository={async findById(id){return categoryMap.get(id)??null},async findByName(name){return [...categoryMap.values()].find(c=>c.name===name)??null},async list(){return [...categoryMap.values()]},async save(category){categoryMap.set(category.id,category)}};
 const tokens:LoginTokenRepository={async save(token){tokenMap.set(token.tokenHash,token)},async findByTokenHash(hash){return tokenMap.get(hash)??null},async consume(hash,now){const token=tokenMap.get(hash);if(!token||token.consumedAt||token.expiresAt<=now)return null;const consumed={...token,consumedAt:now};tokenMap.set(hash,consumed);return consumed}};
 const sessions:SessionRepository={async save(session){sessionMap.set(session.tokenHash,session)},async findByTokenHash(hash){return sessionMap.get(hash)??null},async deleteByTokenHash(hash){sessionMap.delete(hash)}};
 const messages:EmailMessage[]=[];
 return {users,projects,expenses,categories,tokens,sessions,uow,clock,ids,hasher,notifier:new SseBroker(),email:{async sendLoginLink(message:EmailMessage){messages.push(message)}},messages,webOrigin:"http://localhost:5173",ttlMinutes:15,sessionTtlDays:30,production:false};
}
