import {z} from "zod";
import type {FastifyInstance} from "fastify";
import {createProjectUseCase,listProjectsUseCase,getProjectUseCase,getProjectBalancesUseCase,getFinalSettlementUseCase,addMemberUseCase,removeMemberUseCase} from "@tripapp/application";
import {actor} from "../plugins/auth.ts";
import {params,currency} from "../validation.ts";
import type {Dependencies} from "../dependencies.ts";
export function projectsController(app:FastifyInstance,deps:Dependencies){
 app.get("/api/projects",async request=>listProjectsUseCase(deps,actor(request)));
 app.post("/api/projects",async(request,reply)=>{const input=z.object({name:z.string().trim().min(1).max(200),defaultExpenseCurrency:currency,settlementCurrency:currency}).parse(request.body);return reply.code(201).send(await deps.uow.run(()=>createProjectUseCase(deps,actor(request),input)))});
 app.get("/api/projects/:id",async request=>getProjectUseCase(deps,actor(request),params.parse(request.params).id));
 app.get("/api/projects/:id/balances",async request=>deps.uow.run(()=>getProjectBalancesUseCase(deps,actor(request),params.parse(request.params).id)));
 app.get("/api/projects/:id/settlement",async request=>deps.uow.run(()=>getFinalSettlementUseCase(deps,actor(request),params.parse(request.params).id)));
 app.post("/api/projects/:id/members",async request=>{const {id}=params.parse(request.params);const input=z.object({email:z.email(),role:z.enum(["owner","member"]).optional(),displayName:z.string().trim().min(1).max(100).optional()}).parse(request.body);const project=await deps.uow.run(()=>addMemberUseCase(deps,actor(request),{...input,projectId:id}));await deps.notifier.notify({projectId:id,resource:"member",action:"added"});return project});
 app.delete("/api/projects/:id/members/:userId",async request=>{const {id,userId}=params.parse(request.params);const project=await deps.uow.run(()=>removeMemberUseCase(deps,actor(request),{projectId:id,userId:userId!}));await deps.notifier.notify({projectId:id,resource:"member",action:"removed"});return project});
}
