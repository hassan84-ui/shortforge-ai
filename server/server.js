import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import crypto from 'node:crypto';import {spawn,spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const __dirname=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(__dirname,'..');
const envFile=path.join(__dirname,'.env');if(fs.existsSync(envFile)){for(const raw of fs.readFileSync(envFile,'utf8').split(/\r?\n/)){const line=raw.trim();if(!line||line.startsWith('#'))continue;const i=line.indexOf('=');if(i<1)continue;const key=line.slice(0,i).trim(),value=line.slice(i+1).trim().replace(/^['"]|['"]$/g,'');if(!(key in process.env))process.env[key]=value}}
const PORT=Number(process.env.PORT||3000),DATA_DIR=path.resolve(process.env.DATA_DIR||path.join(__dirname,'data')),DB_FILE=path.join(DATA_DIR,'db.json'),SESSION_HOURS=Number(process.env.SESSION_HOURS||168),DAILY_AI_LIMIT=Number(process.env.DAILY_AI_LIMIT||20),DAILY_RENDER_LIMIT=Number(process.env.DAILY_RENDER_LIMIT||10),COOKIE_SECURE=String(process.env.COOKIE_SECURE||'false')==='true';fs.mkdirSync(DATA_DIR,{recursive:true});
let db={users:[],sessions:[],projects:[],usage:[]};try{db={...db,...JSON.parse(fs.readFileSync(DB_FILE,'utf8'))}}catch{};const save=()=>{const tmp=DB_FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db,null,2));fs.renameSync(tmp,DB_FILE)};
const json=(res,code,data,extra={})=>{res.writeHead(code,{'content-type':'application/json','cache-control':'no-store',...extra});res.end(JSON.stringify(data))};
const readBody=req=>new Promise((resolve,reject)=>{let b='';req.on('data',c=>{b+=c;if(b.length>2e6){reject(new Error('Body too large'));req.destroy()}});req.on('end',()=>{try{resolve(JSON.parse(b||'{}'))}catch(e){reject(e)}});req.on('error',reject)});const readBuffer=(req,max=250*1024*1024)=>new Promise((resolve,reject)=>{const parts=[];let n=0;req.on('data',c=>{n+=c.length;if(n>max){reject(new Error('Video too large'));req.destroy();return}parts.push(c)});req.on('end',()=>resolve(Buffer.concat(parts)));req.on('error',reject)});
const ffmpegReady=spawnSync(process.env.FFMPEG_PATH||'ffmpeg',['-version'],{stdio:'ignore'}).status===0,uid=()=>crypto.randomUUID(),today=()=>new Date().toISOString().slice(0,10);const hashPassword=p=>{const salt=crypto.randomBytes(16).toString('hex'),hash=crypto.scryptSync(p,salt,64).toString('hex');return `${salt}:${hash}`};const verifyPassword=(p,stored)=>{try{const [salt,hash]=stored.split(':'),actual=crypto.scryptSync(p,salt,64);return crypto.timingSafeEqual(actual,Buffer.from(hash,'hex'))}catch{return false}};
function cookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split('=')).filter(x=>x.length===2).map(([k,v])=>[k,decodeURIComponent(v)]))}function currentUser(req){const token=cookies(req).sf_session,s=db.sessions.find(x=>x.token===token&&new Date(x.expiresAt)>new Date());if(!s)return null;return db.users.find(x=>x.id===s.userId)||null}function requireUser(req,res){const u=currentUser(req);if(!u){json(res,401,{error:'Sign in required'});return null}return u}function sessionCookie(token,maxAge=SESSION_HOURS*3600){return `sf_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${COOKIE_SECURE?'; Secure':''}`}
function usage(userId,kind){let x=db.usage.find(x=>x.userId===userId&&x.date===today());if(!x){x={userId,date:today(),ai:0,render:0};db.usage.push(x)}const limit=kind==='render'?DAILY_RENDER_LIMIT:DAILY_AI_LIMIT;if(x[kind]>=limit)return {ok:false,used:x[kind],limit};x[kind]++;save();return {ok:true,used:x[kind],limit}}function usageView(userId){const x=db.usage.find(x=>x.userId===userId&&x.date===today())||{ai:0,render:0};return {ai:{used:x.ai||0,limit:DAILY_AI_LIMIT},render:{used:x.render||0,limit:DAILY_RENDER_LIMIT}}}
async function renderMp4(req,res,user){const q=usage(user.id,'render');if(!q.ok)return json(res,429,{error:'Daily MP4 render limit reached',quota:q});if(!ffmpegReady)return json(res,503,{error:'FFmpeg is not installed on this server.'});const input=await readBuffer(req),id=`shortforge-${Date.now()}-${crypto.randomBytes(5).toString('hex')}`,infile=path.join(os.tmpdir(),id+'.webm'),outfile=path.join(os.tmpdir(),id+'.mp4');await fs.promises.writeFile(infile,input);try{await new Promise((resolve,reject)=>{const f=spawn(process.env.FFMPEG_PATH||'ffmpeg',['-y','-i',infile,'-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',outfile]);let err='';f.stderr.on('data',d=>err=(err+d.toString()).slice(-4000));f.on('error',reject);f.on('close',c=>c===0?resolve():reject(new Error('FFmpeg failed: '+err.slice(-500))))});const st=await fs.promises.stat(outfile);res.writeHead(200,{'content-type':'video/mp4','content-length':st.size,'content-disposition':'attachment; filename=shortforge-final-short.mp4','cache-control':'no-store'});const rs=fs.createReadStream(outfile);rs.pipe(res);rs.on('close',()=>{fs.promises.unlink(infile).catch(()=>{});fs.promises.unlink(outfile).catch(()=>{})})}catch(e){fs.promises.unlink(infile).catch(()=>{});fs.promises.unlink(outfile).catch(()=>{});throw e}}
function localProject({idea='',style='Motivation',tone='Inspiring',duration=30}){const count=Math.max(3,Math.round(Number(duration)/6)),sec=Number(duration)/count,captions=[`Stop scrolling — this is about ${idea}.`,`Start with one small action about ${idea}.`,`Make it simple enough to repeat.`,`Progress matters more than perfection.`,`Keep going when motivation fades.`,`Your next step can start today.`],scenes=Array.from({length:count},(_,i)=>({caption:captions[i%captions.length],visual:`${style} vertical scene ${i+1}`,seconds:+sec.toFixed(2)}));return {idea,style,tone,duration:Number(duration),hook:scenes[0].caption,lines:scenes.map(s=>s.caption),script:scenes.map(s=>s.caption).join(' '),scenes}}
async function tts(body,res,user){const q=usage(user.id,'ai');if(!q.ok)return json(res,429,{error:'Daily AI generation limit reached',quota:q});const key=process.env.ELEVENLABS_API_KEY,voice=body.voiceId||process.env.ELEVENLABS_VOICE_ID;if(!key||!voice)return json(res,503,{error:'AI voice is not configured.'});const text=String(body.text||'').trim().slice(0,5000);if(!text)return json(res,400,{error:'Narration text is required'});const r=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`,{method:'POST',headers:{'xi-api-key':key,'content-type':'application/json'},body:JSON.stringify({text,model_id:process.env.ELEVENLABS_MODEL_ID||'eleven_multilingual_v2'})});if(!r.ok)return json(res,r.status,{error:'Voice provider error: '+(await r.text()).slice(0,300)});const buf=Buffer.from(await r.arrayBuffer());res.writeHead(200,{'content-type':r.headers.get('content-type')||'audio/mpeg','content-length':buf.length,'cache-control':'no-store'});res.end(buf)}
async function mediaSearch(u,res,user){const qta=usage(user.id,'ai');if(!qta.ok)return json(res,429,{error:'Daily AI/media limit reached',quota:qta});const key=process.env.PEXELS_API_KEY;if(!key)return json(res,503,{error:'Stock media is not configured.'});const q=(u.searchParams.get('q')||'').trim().slice(0,120);if(!q)return json(res,400,{error:'Search query is required'});const r=await fetch(`https://api.pexels.com/v1/videos/search?query=${encodeURIComponent(q)}&orientation=portrait&size=medium&per_page=8`,{headers:{Authorization:key}});if(!r.ok)return json(res,r.status,{error:'Stock provider error'});const d=await r.json(),items=(d.videos||[]).map(v=>{const files=(v.video_files||[]).filter(f=>f.link),portrait=files.filter(f=>(f.height||0)>=(f.width||0)).sort((a,b)=>(b.height||0)-(a.height||0))[0]||files[0];return {id:v.id,width:v.width,height:v.height,duration:v.duration,image:v.image,url:portrait?.link||'',creator:v.user?.name||'Pexels creator',page:v.url}}).filter(x=>x.url);return json(res,200,{provider:'pexels',credit:'Videos provided by Pexels',items})}
async function proxyMedia(u,res){let target;try{target=new URL(u.searchParams.get('url')||'')}catch{return json(res,400,{error:'Invalid media URL'})}const host=target.hostname.toLowerCase();if(!(host==='videos.pexels.com'||host.endsWith('.pexels.com')))return json(res,403,{error:'Media host not allowed'});const r=await fetch(target,{headers:{Range:u.searchParams.get('range')||'bytes=0-'}});if(!r.ok){res.writeHead(r.status);return res.end()}const headers={'content-type':r.headers.get('content-type')||'video/mp4','accept-ranges':'bytes','cache-control':'public, max-age=3600'},len=r.headers.get('content-length'),range=r.headers.get('content-range');if(len)headers['content-length']=len;if(range)headers['content-range']=range;res.writeHead(r.status,headers);for await(const chunk of r.body)res.write(chunk);res.end()}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webm':'video/webm'};
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');if(req.method==='GET'&&u.pathname==='/api/health'){const user=currentUser(req);return json(res,200,{ok:true,service:'shortforge-api',version:'1.0.0',voiceConfigured:!!(process.env.ELEVENLABS_API_KEY&&process.env.ELEVENLABS_VOICE_ID),mediaConfigured:!!process.env.PEXELS_API_KEY,renderConfigured:ffmpegReady,authenticated:!!user,user:user?{id:user.id,name:user.name,email:user.email}:null,quota:user?usageView(user.id):null})}
if(req.method==='POST'&&u.pathname==='/api/auth/signup'){const b=await readBody(req),email=String(b.email||'').trim().toLowerCase(),name=String(b.name||'').trim().slice(0,60),password=String(b.password||'');if(!/^\S+@\S+\.\S+$/.test(email)||password.length<8)return json(res,400,{error:'Use a valid email and a password of at least 8 characters.'});if(db.users.some(x=>x.email===email))return json(res,409,{error:'An account with this email already exists.'});const user={id:uid(),name:name||email.split('@')[0],email,passwordHash:hashPassword(password),createdAt:new Date().toISOString()};db.users.push(user);const token=crypto.randomBytes(32).toString('hex');db.sessions.push({token,userId:user.id,expiresAt:new Date(Date.now()+SESSION_HOURS*3600000).toISOString()});save();return json(res,201,{user:{id:user.id,name:user.name,email:user.email},quota:usageView(user.id)},{'set-cookie':sessionCookie(token)})}
if(req.method==='POST'&&u.pathname==='/api/auth/login'){const b=await readBody(req),email=String(b.email||'').trim().toLowerCase(),user=db.users.find(x=>x.email===email);if(!user||!verifyPassword(String(b.password||''),user.passwordHash))return json(res,401,{error:'Incorrect email or password.'});const token=crypto.randomBytes(32).toString('hex');db.sessions=db.sessions.filter(x=>x.userId!==user.id);db.sessions.push({token,userId:user.id,expiresAt:new Date(Date.now()+SESSION_HOURS*3600000).toISOString()});save();return json(res,200,{user:{id:user.id,name:user.name,email:user.email},quota:usageView(user.id)},{'set-cookie':sessionCookie(token)})}
if(req.method==='POST'&&u.pathname==='/api/auth/logout'){const token=cookies(req).sf_session;db.sessions=db.sessions.filter(x=>x.token!==token);save();return json(res,200,{ok:true},{'set-cookie':sessionCookie('',0)})}
if(req.method==='GET'&&u.pathname==='/api/me'){const user=requireUser(req,res);if(!user)return;return json(res,200,{user:{id:user.id,name:user.name,email:user.email},quota:usageView(user.id)})}
if(u.pathname==='/api/projects'&&req.method==='GET'){const user=requireUser(req,res);if(!user)return;return json(res,200,{projects:db.projects.filter(x=>x.userId===user.id).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(({data,...x})=>x)})}
if(u.pathname==='/api/projects'&&req.method==='POST'){const user=requireUser(req,res);if(!user)return;const b=await readBody(req);if(!b.project||typeof b.project!=='object')return json(res,400,{error:'Project data is required'});const now=new Date().toISOString(),p={id:uid(),userId:user.id,name:String(b.name||b.project.idea||'Untitled short').slice(0,100),createdAt:now,updatedAt:now,data:b.project};db.projects.push(p);save();return json(res,201,{project:{id:p.id,name:p.name,createdAt:p.createdAt,updatedAt:p.updatedAt}})}
const pm=u.pathname.match(/^\/api\/projects\/([a-f0-9-]+)$/i);if(pm&&req.method==='GET'){const user=requireUser(req,res);if(!user)return;const p=db.projects.find(x=>x.id===pm[1]&&x.userId===user.id);return p?json(res,200,{project:p}):json(res,404,{error:'Project not found'})}if(pm&&req.method==='PUT'){const user=requireUser(req,res);if(!user)return;const p=db.projects.find(x=>x.id===pm[1]&&x.userId===user.id);if(!p)return json(res,404,{error:'Project not found'});const b=await readBody(req);p.name=String(b.name||p.name).slice(0,100);if(b.project)p.data=b.project;p.updatedAt=new Date().toISOString();save();return json(res,200,{project:{id:p.id,name:p.name,updatedAt:p.updatedAt}})}if(pm&&req.method==='DELETE'){const user=requireUser(req,res);if(!user)return;const n=db.projects.length;db.projects=db.projects.filter(x=>!(x.id===pm[1]&&x.userId===user.id));if(db.projects.length===n)return json(res,404,{error:'Project not found'});save();return json(res,200,{ok:true})}
if(req.method==='POST'&&u.pathname==='/api/generate'){
  const user=requireUser(req,res);
  if(!user)return;

  const q=usage(user.id,'ai');
  if(!q.ok)return json(res,429,{
    error:'Daily generation limit reached',
    quota:q
  });

  const b=await readBody(req);
  const key=process.env.OPENAI_API_KEY;

  if(!key)return json(res,503,{
    error:'OpenAI API key is not configured'
  });

  const prompt=`Create a high-retention vertical short-form video.

Topic: ${String(b.idea||'')}
Style: ${String(b.style||'Motivation')}
Tone: ${String(b.tone||'Inspiring')}
Duration: ${Number(b.duration||30)} seconds.

Create:
- A powerful opening hook
- A natural voice-over script
- Short caption lines
- Timed scenes
- A useful visual description for every scene

Return ONLY valid JSON in this exact structure:
{
  "hook": "string",
  "script": "string",
  "lines": ["string"],
  "scenes": [
    {
      "caption": "string",
      "visual": "string",
      "seconds": 6
    }
  ]
}`;

  const r=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',
    headers:{
      'Authorization':'Bearer '+key,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({
      model:'gpt-5-mini',
      input:prompt
    })
  });

  const d=await r.json();

  if(!r.ok){
    console.error('OpenAI API error',{
      status:r.status,
      type:d?.error?.type||null,
      code:d?.error?.code||null,
      message:d?.error?.message||'OpenAI generation failed'
    });
    return json(res,r.status,{
      error:d?.error?.message||'OpenAI generation failed'
    });
  }

  const output=d.output_text||
    d.output?.flatMap(x=>x.content||[])
      .map(x=>x.text||'')
      .join('')||'';

  let ai;

  try{
    ai=JSON.parse(
      output
        .replace(/^```json\s*/i,'')
        .replace(/```$/,'')
        .trim()
    );
  }catch{
    return json(res,502,{
      error:'AI returned an invalid response. Please try again.'
    });
  }

  return json(res,200,{
    provider:'openai',
    project:{
      idea:String(b.idea||''),
      style:String(b.style||'Motivation'),
      tone:String(b.tone||'Inspiring'),
      duration:Number(b.duration||30),
      hook:String(ai.hook||''),
      script:String(ai.script||''),
      lines:Array.isArray(ai.lines)?ai.lines:[],
      scenes:Array.isArray(ai.scenes)?ai.scenes:[]
    }
  });
}if(req.method==='POST'&&u.pathname==='/api/tts'){const user=requireUser(req,res);if(!user)return tts(await readBody(req),res,user)}if(req.method==='GET'&&u.pathname==='/api/media'){const user=requireUser(req,res);if(!user)return mediaSearch(u,res,user)}if(req.method==='GET'&&u.pathname==='/api/media-proxy')return proxyMedia(u,res);if(req.method==='POST'&&u.pathname==='/api/render'){const user=requireUser(req,res);if(!user)return renderMp4(req,res,user)}
if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});const rel=decodeURIComponent(u.pathname==='/'?'index.html':u.pathname.startsWith('/')?u.pathname.slice(1):u.pathname);const file=path.resolve(root,rel);if(file!==root&&!file.startsWith(root+path.sep))return json(res,403,{error:'Forbidden'});fs.stat(file,(err,st)=>{if(err||!st.isFile()){console.error('Static file not found:',file);res.writeHead(404,{'content-type':'text/plain; charset=utf-8'});return res.end('Not found')}res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'});fs.createReadStream(file).pipe(res)})}catch(e){console.error(e);json(res,500,{error:e.message||'Server error'})}});server.listen(PORT,()=>console.log(`ShortForge AI Studio: http://localhost:${PORT}`));
