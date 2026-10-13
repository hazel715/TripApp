import {afterEach,describe,expect,it} from "vitest";
import {createApp} from "./app.ts";
import {createMemory} from "../../infrastructure/src/testing/memory.ts";
import {createExpenseUseCase,updateExpenseUseCase,deleteExpenseUseCase,verifyLoginLink} from "@tripapp/application";
const apps:Awaited<ReturnType<typeof createApp>>[]=[];
afterEach(async()=>{await Promise.all(apps.splice(0).map(app=>app.close()))});
async function setup(){const deps=createMemory();const app=await createApp(deps);apps.push(app);await app.inject({method:"POST",url:"/api/auth/login-link",payload:{email:"owner@example.com"}});const token=new URL(deps.messages[0].loginUrl).searchParams.get("token")!;const login=await app.inject({method:"POST",url:"/api/auth/verify",payload:{token}});const cookie=String(login.headers["set-cookie"]).split(";")[0];const user=login.json().user;const created=await app.inject({method:"POST",url:"/api/projects",headers:{cookie},payload:{name:"Trip",defaultExpenseCurrency:"KRW",settlementCurrency:"KRW"}});return {app,deps,cookie,user,project:created.json(),token}}
describe("HTTP MVP",()=>{
 it("authenticates once, creates projects, rejects anonymous and invalid input",async()=>{const {app,cookie,token}=await setup();expect((await app.inject({url:"/api/projects"})).statusCode).toBe(401);expect((await app.inject({url:"/api/projects",headers:{cookie}})).json()).toHaveLength(1);expect((await app.inject({method:"POST",url:"/api/auth/verify",payload:{token}})).statusCode).toBe(401);expect((await app.inject({method:"POST",url:"/api/projects",headers:{cookie},payload:{name:""}})).statusCode).toBe(400)});
 it("handles global categories, members, memo, Expense CRUD and both settlement views",async()=>{
 const {app,cookie,user,project}=await setup();const headers={cookie};const root=`/api/projects/${project.id}`;
 const added=await app.inject({method:"POST",url:root+"/members",headers,payload:{email:"member@example.com",displayName:"철수"}});expect(added.statusCode).toBe(200);const member=added.json().members[1];
 const category=await app.inject({method:"POST",url:"/api/categories",headers,payload:{name:"식사"}});expect(category.statusCode).toBe(201);expect((await app.inject({url:"/api/categories",headers})).json()).toHaveLength(1);
 const memo=await app.inject({method:"POST",url:root+"/expenses/quick-memo",headers,payload:{text:"점심 12000 철수"}});expect(memo.json().participantUserIds).toEqual([member.userId]);
 const body={payerUserId:user.id,description:"점심",amount:"100",currency:"USD",fxRate:"1350",settlementAmount:"135001",settlementCurrency:"KRW",categoryId:category.json().id,participantUserIds:[member.userId]};
 const created=await app.inject({method:"POST",url:root+"/expenses",headers,payload:body});expect(created.statusCode).toBe(201);expect(created.json().settlementAmount).toBe("135001.0000");const id=created.json().id;
 expect((await app.inject({method:"PATCH",url:root+"/expenses/"+id,headers,payload:{settlementAmount:"1"}})).statusCode).toBe(400);
 expect((await app.inject({method:"PATCH",url:root+"/expenses/"+id,headers,payload:{settlementAmount:"-30",shares:[{userId:member.userId,shareAmount:"-30"}]}})).statusCode).toBe(200);
 const burden=(await app.inject({url:root+"/balances",headers})).json();expect(burden[0]).not.toHaveProperty("transfers");expect(burden[0].rows.find((r:{userId:string})=>r.userId===user.id).difference).toBe("-30.0000");
 const final=(await app.inject({url:root+"/settlement",headers})).json();expect(final[0].transfers).toHaveLength(1);
 expect((await app.inject({method:"DELETE",url:root+"/expenses/"+id,headers})).statusCode).toBe(204);expect((await app.inject({url:root+"/expenses",headers})).json()).toEqual([]);
 expect((await app.inject({method:"DELETE",url:root+"/members/"+member.userId,headers})).statusCode).toBe(200);
 });
 it("rolls back Expense/Share/reopen together and only publishes after commit",async()=>{
 const {deps,user,project}=await setup();let notifications=0;deps.notifier.subscribe(project.id,()=>{notifications++});await deps.projects.save({...project,status:"closed",createdAt:new Date(),updatedAt:new Date()});
 const input={projectId:project.id,payerUserId:user.id,description:"refund",amount:"-10",currency:"KRW",settlementAmount:"-10",settlementCurrency:"KRW",participantUserIds:[user.id]};
 const original=deps.projects.save;deps.projects.save=async()=>{throw new Error("simulated write failure")};await expect(createExpenseUseCase(deps,user,input)).rejects.toThrow(/simulated/);deps.projects.save=original;
 expect(await deps.expenses.listByProject(project.id)).toEqual([]);expect((await deps.projects.findById(project.id))?.status).toBe("closed");expect(notifications).toBe(0);
 const expense=await createExpenseUseCase(deps,user,input);expect((await deps.projects.findById(project.id))?.status).toBe("active");expect(notifications).toBe(1);
 await expect(updateExpenseUseCase(deps,user,expense.id,{projectId:project.id,settlementAmount:"-11"})).rejects.toThrow();expect((await deps.expenses.findById(expense.id))?.settlementAmount.toString()).toBe("-10");expect(notifications).toBe(1);
 await deleteExpenseUseCase(deps,user,{projectId:project.id,expenseId:expense.id});expect(notifications).toBe(2);
 });
 it("permits one concurrent verification and blocks expired/deactivated sessions",async()=>{
 const {app,deps,user,cookie}=await setup();await app.inject({method:"POST",url:"/api/auth/login-link",payload:{email:user.email}});const token=new URL(deps.messages.at(-1)!.loginUrl).searchParams.get("token")!;
 const results=await Promise.allSettled([verifyLoginLink(deps,{token}),verifyLoginLink(deps,{token})]);expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
 await deps.users.save({...user,status:"deactivated",createdAt:new Date(),updatedAt:new Date()});expect((await app.inject({url:"/api/projects",headers:{cookie}})).statusCode).toBe(401);
 });
});
