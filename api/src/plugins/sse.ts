import type {FastifyInstance} from "fastify";
import type {Dependencies} from "../dependencies.ts";
import {getProjectUseCase} from "@tripapp/application";
import {actor,cookieName} from "./auth.ts";
import {params} from "../validation.ts";
export function ssePlugin(app:FastifyInstance,deps:Dependencies){
 app.get("/api/projects/:id/events",async(request,reply)=>{
  const user=actor(request);const {id}=params.parse(request.params);
  await getProjectUseCase(deps,user,id);
  reply.hijack();
  reply.raw.writeHead(200,{"Content-Type":"text/event-stream","Cache-Control":"no-cache","Connection":"keep-alive","X-Accel-Buffering":"no",...(request.headers.origin===deps.webOrigin?{"Access-Control-Allow-Origin":deps.webOrigin,"Access-Control-Allow-Credentials":"true"}:{})});
  reply.raw.write("retry: 3000\n\n");
  let closed=false;
  const check=async()=>{
    const session=await deps.sessions.findByTokenHash(deps.hasher.hash(request.cookies[cookieName]??""));
    if(!session || session.expiresAt<=deps.clock.now() || (await deps.users.findById(user.id))?.status!=="active")throw new Error("UNAUTHORIZED");
    await getProjectUseCase(deps,user,id);
  };
  const unsubscribe=deps.notifier.subscribe(id,change=>{void check().then(()=>{if(!closed)reply.raw.write(`event: project.changed\ndata: ${JSON.stringify(change)}\n\n`)}).catch(()=>reply.raw.end())});
  const heartbeat=setInterval(()=>{void check().then(()=>{if(!closed)reply.raw.write(": heartbeat\n\n")}).catch(()=>reply.raw.end())},15000);
  reply.raw.on("close",()=>{closed=true;clearInterval(heartbeat);unsubscribe()});
 });
}
