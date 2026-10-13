import http from 'node:http';
import crypto from 'node:crypto';
import {Pool} from 'pg';

const PORT=Number(process.env.PORT||4000);
const ORIGIN=process.env.PD3_APP_ORIGIN||'https://pd3-premium-preview.onrender.com';
const pool=new Pool({connectionString:process.env.DATABASE_URL,max:5});
const hash=t=>crypto.createHash('sha256').update(t).digest('hex');
const passwordHash=(p,salt=crypto.randomBytes(16).toString('hex'))=>salt+':'+crypto.scryptSync(p,salt,64).toString('hex');
const verify=(p,stored)=>{const [salt,digest]=String(stored).split(':');if(!salt||!digest)return false;const actual=passwordHash(p,salt).split(':')[1];return crypto.timingSafeEqual(Buffer.from(actual),Buffer.from(digest));};
const uid=()=>crypto.randomUUID();
const cookie=(token,maxAge)=>'pd3_session='+encodeURIComponent(token)+'; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age='+maxAge;
const json=(res,status,data,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(data));};
const bad=(res,status,message)=>json(res,status,{error:message});
const fields={
 clients:['name','phone','email','billing_address','jobsite_address','notes'],
 projects:['client_id','name','status','jobsite_address','measurements','materials','notes','warranty'],
 documents:['client_id','project_id','kind','payload']
};
async function body(req){let s='';for await(const chunk of req){s+=chunk;if(s.length>1024*1024)throw Error('Request too large');}return JSON.parse(s||'{}');}
function safeInput(table,b){const out={};for(const f of fields[table])if(Object.hasOwn(b,f)){let v=b[f];if(f==='payload'){if(typeof v!=='object'||!v||Array.isArray(v))throw Error('Invalid document');out[f]=v;}else if(v===null&&(f==='client_id'||f==='project_id'))out[f]=null;else if(typeof v==='string'&&v.length<=12000)out[f]=v;else throw Error('Invalid '+f);}return out;}
async function session(req){const token=/\bpd3_session=([^;]+)/.exec(req.headers.cookie||'')?.[1];if(!token)return null;const r=await pool.query('SELECT user_id FROM pd3_sessions WHERE token_hash=$1 AND expires_at>now()',[hash(decodeURIComponent(token))]);return r.rows[0]?.user_id||null;}
async function login(res,user){const token=crypto.randomBytes(32).toString('base64url');await pool.query("INSERT INTO pd3_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '14 days')",[hash(token),user.id]);json(res,200,{authenticated:true,email:user.email},{'Set-Cookie':cookie(token,14*86400)});}
function validateId(id){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);}
async function owns(clientId,user){if(!clientId)return true;const r=await pool.query('SELECT 1 FROM pd3_clients WHERE id=$1 AND user_id=$2',[clientId,user]);return !!r.rowCount;}
async function ownsProject(projectId,user){if(!projectId)return true;const r=await pool.query('SELECT 1 FROM pd3_projects WHERE id=$1 AND user_id=$2',[projectId,user]);return !!r.rowCount;}
async function handler(req,res){
 try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/health'&&req.method==='GET')return json(res,200,{ok:true,service:'pd3-cloud'});
 if(!url.pathname.startsWith('/api/'))return bad(res,404,'Not found');
 const origin=req.headers.origin;
 if(origin&&origin!==ORIGIN)return bad(res,403,'Origin not allowed');
 if(origin)res.setHeader('Access-Control-Allow-Origin',ORIGIN);
 res.setHeader('Vary','Origin');
 res.setHeader('Access-Control-Allow-Credentials','true');
 if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');res.writeHead(204);return res.end();}
 if(!['GET','HEAD'].includes(req.method)){
  if(origin!==ORIGIN)return bad(res,403,'Origin required');
  if(!(req.headers['content-type']||'').startsWith('application/json'))return bad(res,415,'JSON required');
 }
 if(url.pathname==='/api/setup'&&req.method==='POST'){
  const input=await body(req);
  if(!process.env.PD3_BOOTSTRAP_TOKEN||typeof input.token!=='string'||input.token!==process.env.PD3_BOOTSTRAP_TOKEN)return bad(res,403,'Setup disabled');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email||'')||String(input.password||'').length<14)return bad(res,400,'Valid email and password of at least 14 characters required');
  const count=await pool.query('SELECT count(*)::int AS n FROM pd3_users');
  if(count.rows[0].n!==0)return bad(res,409,'Account already initialized');
  const user={id:uid(),email:input.email.toLowerCase().trim()};
  await pool.query('INSERT INTO pd3_users(id,email,password_hash) VALUES($1,$2,$3)',[user.id,user.email,passwordHash(input.password)]);
  return login(res,user);
 }
 if(url.pathname==='/api/login'&&req.method==='POST'){
  const input=await body(req);
  const r=await pool.query('SELECT id,email,password_hash FROM pd3_users WHERE email=$1',[String(input.email||'').toLowerCase().trim()]);
  if(!r.rowCount||!verify(String(input.password||''),r.rows[0].password_hash))return bad(res,401,'Invalid credentials');
  return login(res,r.rows[0]);
 }
 const user=await session(req);
 if(!user)return bad(res,401,'Sign in required');
 if(url.pathname==='/api/me'&&req.method==='GET'){const r=await pool.query('SELECT email FROM pd3_users WHERE id=$1',[user]);return json(res,200,{email:r.rows[0].email});}
 if(url.pathname==='/api/logout'&&req.method==='POST'){
  const token=/\bpd3_session=([^;]+)/.exec(req.headers.cookie||'')?.[1];
  if(token)await pool.query('DELETE FROM pd3_sessions WHERE token_hash=$1',[hash(decodeURIComponent(token))]);
  return json(res,200,{ok:true},{'Set-Cookie':cookie('',0)});
 }
 if(url.pathname==='/api/export'&&req.method==='GET'){
  const result={version:1,exportedAt:new Date().toISOString()};
  for(const table of ['clients','projects','documents'])result[table]=(await pool.query('SELECT * FROM pd3_'+table+' WHERE user_id=$1 ORDER BY created_at,id',[user])).rows;
  return json(res,200,result);
 }
 const match=/^\/api\/(clients|projects|documents)(?:\/([0-9a-f-]+))?$/.exec(url.pathname);
 if(!match)return bad(res,404,'Not found');
 const [,table,id]=match;
 if(id&&!validateId(id))return bad(res,400,'Invalid ID');
 if(req.method==='GET'){
  const r=id?await pool.query('SELECT * FROM pd3_'+table+' WHERE user_id=$1 AND id=$2',[user,id]):await pool.query('SELECT * FROM pd3_'+table+' WHERE user_id=$1 ORDER BY updated_at DESC',[user]);
  return id?(r.rowCount?json(res,200,r.rows[0]):bad(res,404,'Not found')):json(res,200,{items:r.rows});
 }
 if(req.method==='DELETE'&&id){
  const r=await pool.query('DELETE FROM pd3_'+table+' WHERE user_id=$1 AND id=$2 RETURNING id',[user,id]);
  return r.rowCount?json(res,200,{deleted:true}):bad(res,404,'Not found');
 }
 if((req.method==='POST'&&!id)||(req.method==='PUT'&&id)){
  const input=safeInput(table,await body(req));
  if(table==='clients'&&!input.name&&req.method==='POST')return bad(res,400,'Client name required');
  if(table==='projects'&&req.method==='POST'&&(!input.client_id||!input.name))return bad(res,400,'Client and project name required');
  if(table==='documents'&&req.method==='POST'&&(!['estimate','invoice'].includes(input.kind)||!input.payload))return bad(res,400,'Document type and content required');
  if(input.client_id&&!await owns(input.client_id,user))return bad(res,400,'Client not found');
  if(input.project_id&&!await ownsProject(input.project_id,user))return bad(res,400,'Project not found');
  if(table==='documents'&&input.project_id&&input.client_id){
   const p=await pool.query('SELECT 1 FROM pd3_projects WHERE id=$1 AND client_id=$2 AND user_id=$3',[input.project_id,input.client_id,user]);
   if(!p.rowCount)return bad(res,400,'Project does not belong to client');
  }
  const keys=Object.keys(input);
  if(!keys.length)return bad(res,400,'No fields supplied');
  if(req.method==='POST'){
   const columns=['id','user_id',...keys];
   const values=[uid(),user,...keys.map(k=>input[k])];
   const r=await pool.query('INSERT INTO pd3_'+table+' ('+columns.join(',')+') VALUES ('+columns.map((_,i)=>'$'+(i+1)).join(',')+') RETURNING *',values);
   return json(res,201,r.rows[0]);
  }
  const r=await pool.query('UPDATE pd3_'+table+' SET '+keys.map((k,i)=>k+'=$'+(i+3)).join(',')+',updated_at=now() WHERE user_id=$1 AND id=$2 RETURNING *',[user,id,...keys.map(k=>input[k])]);
  return r.rowCount?json(res,200,r.rows[0]):bad(res,404,'Not found');
 }
 return bad(res,405,'Method not allowed');
 }catch(error){if(error instanceof SyntaxError)return bad(res,400,'Invalid JSON');if(/Invalid |Request too large/.test(error.message))return bad(res,400,error.message);if(error.code==='23503')return bad(res,409,'Referenced record is in use');if(error.code==='23505')return bad(res,409,'Already exists');console.error('PD3 API error:',error.code||error.name);return bad(res,500,'Server error');}
}
http.createServer(handler).listen(PORT,'0.0.0.0',()=>console.log('PD3 private cloud API listening on '+PORT));
