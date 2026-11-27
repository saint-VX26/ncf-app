'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const PORT=+process.env.PORT||3000;
const PIN=process.env.OPERATOR_PIN||String(1000+crypto.randomInt(9000));
const PUB=path.join(__dirname,'public');
const PAGES={'/':'phone.html','/screen':'screen.html','/operator':'operator.html','/qr':'qr.html'};
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg'};
let state={phase:'idle',target:null,seq:0};
const clients=new Set();
const counts=()=>{const c={phone:0,screen:0,operator:0};for(const k of clients)c[k.role]++;return c};
const snap=()=>JSON.stringify({...state,now:Date.now(),counts:counts()});
const push=()=>{const d='data: '+snap()+'\n\n';for(const k of clients)k.res.write(d)};
let t=null;const pushSoon=()=>{if(!t)t=setTimeout(()=>{t=null;push()},300)};
const setState=s=>{state={...s,seq:state.seq+1};push()};
const lanIP=()=>{for(const l of Object.values(os.networkInterfaces()))for(const a of l||[])if(a.family==='IPv4'&&!a.internal)return a.address;return 'localhost'};
function joinUrl(req){
  if(process.env.PUBLIC_URL)return process.env.PUBLIC_URL.replace(/\/$/,'')+'/';
  const h=req.headers['x-forwarded-host']||req.headers.host||'';
  if(!/^(localhost|127\.|\[::1\])/.test(h))return (req.headers['x-forwarded-proto']||'http')+'://'+h+'/';
  return 'http://'+lanIP()+':'+PORT+'/';
}
const json=(res,o,c=200)=>{res.writeHead(c,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(o))};
const readBody=req=>new Promise(r=>{let d='';req.on('data',c=>{d+=c;if(d.length>2048)req.destroy()});req.on('end',()=>{try{r(JSON.parse(d||'{}'))}catch(e){r({})}})});
const fails=new Map();
function auth(req){
  const ip=req.socket.remoteAddress,f=fails.get(ip)||{n:0,until:0};
  if(Date.now()<f.until)return 429;
  const a=Buffer.from(String(req.headers['x-pin']||'')),b=Buffer.from(PIN);
  if(a.length===b.length&&crypto.timingSafeEqual(a,b)){fails.delete(ip);return 200}
  if(++f.n>=8){f.until=Date.now()+30000;f.n=0}fails.set(ip,f);return 401;
}
http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://x'),p=u.pathname;
  try{
    if(p==='/events'){
      const r=u.searchParams.get('role');const role=['phone','screen','operator'].includes(r)?r:'phone';
      res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
      const k={res,role};clients.add(k);res.write('retry: 2000\n\ndata: '+snap()+'\n\n');
      req.on('close',()=>{clients.delete(k);pushSoon()});pushSoon();return;
    }
    if(p==='/api/time')return json(res,{t:Date.now()});
    if(p==='/api/state')return json(res,JSON.parse(snap()));
    if(p==='/api/info')return json(res,{join:joinUrl(req)});
    if(req.method==='POST'&&p.startsWith('/api/')){
      const a=auth(req);if(a!==200)return json(res,{error:a===429?'Too many tries. Wait 30 seconds.':'Wrong PIN'},a);
      const b=await readBody(req);
      if(p==='/api/check')return json(res,{ok:true});
      if(p==='/api/start'){const s=Math.max(5,Math.min(3600,Math.round(+b.seconds||120)));setState({phase:'running',target:Date.now()+s*1000});return json(res,{ok:true})}
      if(p==='/api/cancel'){setState({phase:'idle',target:null});return json(res,{ok:true})}
      if(p==='/api/adjust'){
        if(state.phase!=='running'||state.target<=Date.now())return json(res,{error:'No countdown running'},409);
        const d=Math.max(-600,Math.min(600,Math.round(+b.seconds||0)));
        setState({phase:'running',target:Math.max(Date.now()+5000,state.target+d*1000)});return json(res,{ok:true});
      }
      return json(res,{error:'Not found'},404);
    }
    const file=PAGES[p]||p.slice(1);
    const full=path.join(PUB,path.normalize(file));
    if(!full.startsWith(PUB+path.sep)||!MIME[path.extname(full)]||!fs.existsSync(full)){res.writeHead(404);return res.end('Not found')}
    res.writeHead(200,{'Content-Type':MIME[path.extname(full)],'Cache-Control':'no-cache'});fs.createReadStream(full).pipe(res);
  }catch(e){res.writeHead(500);res.end('Error')}
}).listen(PORT,()=>{
  const base=process.env.PUBLIC_URL?process.env.PUBLIC_URL.replace(/\/$/,''):'http://localhost:'+PORT;
  console.log('\nNCF trailer countdown is running.\n  Operator PIN: '+PIN+
    '\n  Operator panel (booth): '+base+'/operator'+
    '\n  Screen (projector laptop): '+base+'/screen'+
    '\n  QR poster for the entrance: '+base+'/qr\n');
});
setInterval(()=>{for(const k of clients)k.res.write(': hb\n\n')},15000);
setInterval(()=>{if(state.phase==='running'&&Date.now()>state.target+600000)setState({phase:'idle',target:null})},30000);
