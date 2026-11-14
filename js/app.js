'use strict';
/* =========================================================
   Ragnar IPTV - Samsung Tizen TV
   ========================================================= */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const load=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ic=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const IC={starf:'',home:ic('<path d="M3 11l9-8 9 8v9h-6v-6H9v6H3z"/>'),live:ic('<rect x="2" y="5" width="20" height="13" rx="2"/><path d="M8 21h8"/>'),series:ic('<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M6 5h12"/>'),films:ic('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>'),search:ic('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),settings:ic('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>'),au:ic('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 9a4 4 0 010 6"/>'),cc:ic('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10.5 10.2a2 2 0 100 3.6M16.5 10.2a2 2 0 100 3.6"/>'),
 play:ic('<path d="M7 5l12 7-12 7z" fill="currentColor"/>'),pause:ic('<path d="M8 5v14M16 5v14" stroke-width="2.6"/>'),prev:ic('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>'),guide:ic('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>'),lock:ic('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>'),bell:ic('<path d="M6 16v-5a6 6 0 0112 0v5l2 2H4z"/><path d="M10 21h4"/>'),re:ic('<path d="M4 4v6h6"/><path d="M5 15a8 8 0 102-8.5L4 10"/>'),star:ic('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'),check:ic('<path d="M5 12.5l4.5 4.5L19 7" stroke-width="2.4"/>')};
IC.starf=IC.star.replace(/fill="none"/,'fill="currentColor"');
const isTV=typeof webapis!=='undefined'&&!!webapis.avplay;
const U=s=>String(s||'').toLocaleUpperCase('tr');
const fmt=s=>{s=Math.max(0,Math.floor(s||0));return(s>=3600?(s/3600|0)+':':'')+String((s%3600)/60|0).padStart(s>=3600?2:1,'0')+':'+String(s%60).padStart(2,'0')};
const hhmm=ms=>{const d=new Date(ms);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
const b64=s=>{try{return decodeURIComponent(escape(atob(s||'')))}catch(e){return s||''}};

/* ---------- kalıcı durum ---------- */
let ACC=load('rg-acc',null),ST=load('rg-st',{}),PF=load('rg-pf',{}),HIST=load('rg-hist',{}),FAVL=load('rg-fav',[]),MYL=load('rg-my',[]),REM=load('rg-rem',[]);
/* izlendi kuralı: jenerik payı sürenin %8'i, dizide en fazla 2 dk, filmde en fazla 3 dk */
const tail8=(d,ep)=>Math.min(d*.08,ep?120:180),isDone=(t,d,ep)=>d>0&&d-t<=tail8(d,ep),isPart=(t,d,ep)=>t>30&&!isDone(t,d,ep),hDone=h=>!!h&&isDone(h.t,h.d,h.k==='ep'),hPart=h=>!!h&&isPart(h.t,h.d,h.k==='ep');
ST.rec=ST.rec||[];
const saveST=()=>save('rg-st',ST);
let nav=[],cv='home',cur=null,scr='login',PAD=null,UNL=false,RT=0,retSel=null;

/* ---------- ad temizleme ---------- */
const STOP=new Set(['DAS','DIE','DER','LA','LE','EL','THE','AND','VE','ILE','İLE','BIR','BİR','DE','DA','OF','IN','FOR','WITH','ON','A']);
const ACR=new Set(['TBMM','DMAX','CNBC','ESPN','BEIN','KRAL','TGRT','NBA','UFC','HBO','BBC','CNN','NTV','ATV','TRT','FOX','TLC','MTV','ZDF','ARD','RTL','SKY','DAZN','UHD']);
const TC=s=>s===U(s)&&/[A-ZÇĞİÖŞÜ]{3}/.test(s)?s.split(' ').map(w=>ACR.has(w)||(w.length<=3&&!STOP.has(w))||/\d/.test(w)?w:w.charAt(0)+w.slice(1).toLocaleLowerCase('tr')).join(' '):s;
const cleanRaw=s=>TC(String(s||'').replace(/[\u1D2C-\u1D6A\u2070-\u209F]/g,'').replace(/^\s*[\[(|]?\s*[A-Z]{2,3}\s*[\]):|\-–]\s*/,'').replace(/\b(FHD|UHD|HD|SD|4K|8K|HEVC|H265|H\.265|1080P|720P|RAW|60FPS|50FPS)\b/gi,'').replace(/[^\p{L}\p{N}\s.&'+\-:!?()]/gu,' ').replace(/\(\s*\)/g,'').replace(/\s+/g,' ').replace(/^[\s\-:|]+|[\s\-:|]+$/g,'').trim());
const clean=s=>{if(ST.clean)return String(s||'');const c=cleanRaw(s);return c||String(s||'')};
const isAdult=s=>/xxx|adult|18\s?\+|\+\s?18|porn|erotic|yetişkin/i.test(s||'');

/* ---------- ayar listesi ---------- */
const SET=[['aud','Varsayılan ses',['Türkçe dublaj','Orijinal dil']],['sub','Varsayılan altyazı',['Türkçe','Kapalı','English']],['buf','Oynatıcı tamponu',['Dengeli','Güçlü, takılmaya karşı','Hızlı kanal geçişi']],['start','Açılışta',['Ana sayfa','Son izlenen kanal']],['mini','Kanal önizleme (2 bağlantı hakkı gerekir)',['Kapalı','Açık']],['pin','Ebeveyn kilidi',['Açık: yetişkin kategoriler','Kapalı']],['clean','Kanal ve kategori adlarını temizle',['Açık','Kapalı']],['clock','Saat',['Göster','Gizle']],['anim','Yumuşak kaydırma',['Açık','Kapalı']],['snd','Açılış sesi',['Açık','Kapalı']],['logs','Hata raporlarını gönder',['Açık','Kapalı']]];
const pinOn=()=>!ST.pin,pinCode=()=>ST.pinCode||'0000';

/* =========================================================
   VERİ KATMANI (Xtream + M3U)
   ========================================================= */
const nL=s=>({k:'live',id:String(s.stream_id),name:s.name||'',num:+s.num||0,icon:s.stream_icon||'',cat:String(s.category_id),arch:+s.tv_archive===1,archD:+s.tv_archive_duration||0});
const nV=s=>({k:'vod',id:String(s.stream_id),name:s.name||'',icon:s.stream_icon||'',cat:String(s.category_id),ext:s.container_extension||'mp4',rating:s.rating||'',added:+s.added||0});
const nS=s=>({k:'series',id:String(s.series_id),name:s.name||'',icon:s.cover||'',cat:String(s.category_id),plot:s.plot||'',genre:s.genre||'',year:String(s.releaseDate||s.release_date||'').slice(0,4),rating:s.rating||'',bd:(Array.isArray(s.backdrop_path)&&s.backdrop_path[0])||''});
const API={C:{},
 base(){return ACC.srv.replace(/\/+$/,'')},
 q(a,x){return`${this.base()}/player_api.php?username=${encodeURIComponent(ACC.u)}&password=${encodeURIComponent(ACC.p)}${a?'&action='+a:''}${x||''}`},
 Q:[],busy:0,
 slot(){return new Promise(r=>{const go=()=>{if(this.busy<1){this.busy++;const w=Math.max(0,(this.last||0)+300-Date.now());setTimeout(r,w)}else this.Q.push(go)};go()})},
 free(){this.busy--;this.last=Date.now();const n=this.Q.shift();if(n)n()},
 block:0,
 async get(url,ms,again){again=true;if(this.block>Date.now())throw new Error('Sunucu şu an istekleri reddediyor. Yarım dakika bekleyip tekrar dene.');await this.slot();const c=new AbortController(),t=setTimeout(()=>c.abort(),ms||20000);
  try{if(this.block>Date.now())throw new Error('Sunucu şu an istekleri reddediyor. Yarım dakika bekleyip tekrar dene.');const r=await fetch(url,{signal:c.signal});
   if(!r.ok){const e=new Error('Sunucu hata verdi (HTTP '+r.status+')');e.retry=[500,502,503,504].indexOf(r.status)>=0;e.code=r.status;if([403,404,429].indexOf(r.status)>=0){this.block=Date.now()+25000;e.message='Sunucu isteği reddetti (HTTP '+r.status+'). Yarım dakika bekleyip tekrar dene.';LOG.add('api','Sunucu isteği reddetti: HTTP '+r.status,{istek:(url.match(/action=([a-z_]+)/)||[])[1]||'giris'})}throw e}
   const tx=await r.text();try{return JSON.parse(tx)}catch(e){throw new Error('Sunucudan geçersiz yanıt geldi')}}
  catch(e){let er=e;if(e.name==='AbortError')er=new Error('Sunucu zamanında yanıt vermedi');else if(e instanceof TypeError){er=new Error('Sunucuya ulaşılamadı. Adresi ve internet bağlantını kontrol et.');er.retry=true}
   er.again=!again&&(er.retry||e.name==='AbortError');throw er}
  finally{clearTimeout(t);this.free()}},
 async getR(url,ms){try{return await this.get(url,ms,true)}catch(e){if(!e.again&&!e.retry)throw e;await new Promise(r=>setTimeout(r,1500));return this.get(url,ms,true)}},
 trim(){const ks=Object.keys(this.C).filter(k=>k[0]==='i');for(let i=0;i<ks.length-40;i++)delete this.C[ks[i]]},
 purge(big){SIDX={};Object.keys(this.C).forEach(k=>{if(k[0]==='a'||k[0]==='e'||(big&&k[0]==='i'))delete this.C[k]})},
 async once(k,fn){if(this.C[k])return this.C[k];if(k[0]==='i')this.trim();const p=fn();this.C[k]=p;try{return await p}catch(e){delete this.C[k];throw e}},
 async login(){const j=await this.getR(this.q(''));if(!j||!j.user_info)throw new Error('Bu adres bir Xtream sunucusu gibi yanıt vermedi');const u=j.user_info;
  if(+u.auth===0)throw new Error('Kullanıcı adı veya şifre hatalı');if(u.status&&u.status!=='Active')throw new Error('Abonelik aktif değil ('+u.status+')');return u},
 cats(k){return this.once('c'+k,async()=>{if(ACC.type==='m3u')return M3U.cats(k);const ck='rg-c-'+k+'-'+(ACC.u||''),cc=load(ck,null);if(cc&&Date.now()-cc.t<432e5)return cc.v;const j=await this.getR(this.q({live:'get_live_categories',vod:'get_vod_categories',series:'get_series_categories'}[k]));const v=(Array.isArray(j)?j:[]).map(c=>({id:String(c.category_id),name:c.category_name||''}));save(ck,{t:Date.now(),v});return v})},
 items(k,cat){return this.once('i'+k+'|'+cat,async()=>{if(ACC.type==='m3u')return M3U.items(k,cat);const j=await this.getR(this.q({live:'get_live_streams',vod:'get_vod_streams',series:'get_series'}[k],'&category_id='+encodeURIComponent(cat)),45000);return(Array.isArray(j)?j:[]).map({live:nL,vod:nV,series:nS}[k])})},
 all(k){return this.once('a'+k,async()=>{if(ACC.type==='m3u')return M3U.all(k);const j=await this.getR(this.q({live:'get_live_streams',vod:'get_vod_streams',series:'get_series'}[k]),120000);return(Array.isArray(j)?j:[]).map({live:nL,vod:nV,series:nS}[k])})},
 vodInfo(id){return this.once('vi'+id,()=>this.getR(this.q('get_vod_info','&vod_id='+id)))},
 seriesInfo(id){return this.once('si'+id,()=>this.getR(this.q('get_series_info','&series_id='+id),30000))},
 async epg(id,n){if(ACC.type==='m3u')return[];n=n||4;const k='e'+id+'_'+n,c=this.C[k];if(c&&Date.now()-c.t<300000)return c.v;
  const j=await this.getR(this.q('get_short_epg','&stream_id='+id+'&limit='+n),10000).catch(()=>null);
  const v=((j&&j.epg_listings)||[]).map(e=>({title:b64(e.title),desc:b64(e.description),s:(+e.start_timestamp*1000)||Date.parse(String(e.start).replace(' ','T')),e:(+e.stop_timestamp*1000)||Date.parse(String(e.end||e.stop).replace(' ','T'))})).filter(x=>x.s&&x.e).sort((a,b)=>a.s-b.s);
  this.C[k]={t:Date.now(),v};return v},
 url(it,alt){if(it.url)return it.url;const b=this.base(),u=ACC.u,p=ACC.p;
  if(it.k==='live')return`${b}/live/${u}/${p}/${it.id}.${alt?'m3u8':'ts'}`;
  if(it.k==='vod')return`${b}/movie/${u}/${p}/${it.id}.${it.ext||'mp4'}`;
  return`${b}/series/${u}/${p}/${it.id}.${it.ext||'mp4'}`},
 tsUrl(it,startMs,mins){const d=new Date(startMs),z=n=>String(n).padStart(2,'0');return`${this.base()}/timeshift/${ACC.u}/${ACC.p}/${mins}/${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}:${z(d.getHours())}-${z(d.getMinutes())}/${it.id}.ts`}};
const M3U={d:null,
 async load(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),120000);let r;
  try{r=await fetch(url,{signal:c.signal})}catch(e){throw new Error(e.name==='AbortError'?'Liste çok uzun sürede indi, tekrar dene':'Listeye ulaşılamadı. Linki kontrol et.')}finally{clearTimeout(t)}
  if(!r.ok)throw new Error('Liste indirilemedi (HTTP '+r.status+')');const tx=await r.text();if(tx.indexOf('#EXTINF')<0)throw new Error('Bu link geçerli bir M3U listesi değil');this.parse(tx)},
 parse(tx){const L=[],V=[],cl=new Map(),cv=new Map();let c=null,n=0;
  for(const ln of tx.split(/\r?\n/)){if(ln.startsWith('#EXTINF')){const at=k=>{const m=ln.match(new RegExp(k+'="([^"]*)"'));return m?m[1]:''};const ci=ln.lastIndexOf('",');c={name:(ci>0?ln.slice(ci+2):ln.split(',').slice(1).join(',')).trim()||at('tvg-name'),icon:at('tvg-logo'),grp:at('group-title')||'Diğer'}}
   else if(c&&ln&&ln[0]!=='#'){const url=ln.trim(),vod=/\/(movie|series)\//.test(url)||/\.(mp4|mkv|avi|mov)(\?|$)/i.test(url);n++;const m=vod?cv:cl;if(!m.has(c.grp))m.set(c.grp,{id:c.grp,name:c.grp});
    const it={k:vod?'vod':'live',id:'m'+n,name:c.name,icon:c.icon,cat:c.grp,url,num:n,ext:''};(vod?V:L).push(it);c=null}}
  this.d={live:L,vod:V,series:[],cats:{live:[...cl.values()],vod:[...cv.values()],series:[]}}},
 cats(k){return this.d.cats[k]||[]},items(k,c){return(this.d[k]||[]).filter(i=>i.cat===c)},all(k){return this.d[k]||[]}};

/* kategoriler: sıra, gizleme, yetişkin kilidi */
function visCats(k,cs){const o=ST['o_'+k]||[],h=ST['h_'+k]||[],pos=id=>{const i=o.indexOf(id);return i<0?1e6:i};
 const L=cs.map((c,i)=>({...c,i,adult:isAdult(c.name)})).filter(c=>!h.includes(c.id)).sort((a,b)=>pos(a.id)-pos(b.id)||a.i-b.i);
 if(!ST.clean){const g={};L.forEach(c=>{const n=clean(c.name);(g[n]=g[n]||[]).push(c)});for(const n in g){const a=g[n];if(a.length<2)continue;const seen={};a.forEach(c=>{const q=(String(c.name).replace(/[\u1D2C-\u1D6A]/g,m=>({'ᴿ':'R','ᴬ':'A','ᵂ':'W','ᴴ':'H','ᴰ':'D','ᶠ':'F','ᵁ':'U'}[m]||'')).match(/\b(8K|4K|UHD|FHD|HD|SD|HEVC|H\.?265|RAW|60FPS|50FPS|1080P|720P)\b/gi)||[]).map(x=>x.toUpperCase()).filter((x,i,r)=>r.indexOf(x)===i).join(' ');let lab=q?n+' · '+q:n;seen[lab]=(seen[lab]||0)+1;if(seen[lab]>1)lab+=' ('+seen[lab]+')';c.nm=lab})}}
 return L}
const catLocked=c=>pinOn()&&c.adult&&!UNL;
const catNm=c=>!ST.clean&&isAdult(c.name)?'Yetişkin':(c.nm||clean(c.name));
async function adultSet(k){const cs=await API.cats(k);return new Set(cs.filter(c=>isAdult(c.name)).map(c=>c.id))}

/* ---------- kayıt defteri, geçmiş, favoriler ---------- */
const REG=new Map();const reg=it=>{const k=it.k+':'+it.id;REG.set(k,it);return k};
function histSet(it,t,d){if(!it||it.k==='live'||!d||d<60)return;const k=it.k+':'+it.id;
 HIST[k]={k:it.k,id:it.id,name:it.name,icon:it.icon,ext:it.ext,url:it.url,t:Math.floor(t),d:Math.floor(d),ts:Date.now(),sid:it.sid,sname:it.sname,scover:it.scover,season:it.season,num:it.num};if(it.k==='ep'){HIST['sl:'+it.sid]={k:'sl',id:it.id,t:0,d:1,ts:Date.now()};
 if(isDone(t,d,it.k==='ep')){const i=EPS.findIndex(e=>e.id===it.id),n=i>=0?EPS[i+1]:null;if(n)HIST['nx:'+it.sid]={k:'nx',id:n.id,name:n.name,icon:n.icon,ext:n.ext,url:n.url,sid:n.sid,sname:n.sname,scover:n.scover,season:n.season,num:n.num,t:0,d:1,ts:Date.now()+1};else delete HIST['nx:'+it.sid]}}
 const ks=Object.keys(HIST);if(ks.length>400)ks.sort((a,b)=>HIST[a].ts-HIST[b].ts).slice(0,ks.length-400).forEach(x=>delete HIST[x]);save('rg-hist',HIST)}
function cwList(){const seen=new Set();return Object.values(HIST).filter(h=>(Date.now()-(h.ts||0)<2592e6)&&(h.k==='nx'||(h.k!=='sl'&&hPart(h)))).sort((a,b)=>b.ts-a.ts).filter(h=>{const g=h.sid?'s'+h.sid:h.k+h.id;if(seen.has(g))return false;seen.add(g);return true}).slice(0,20)}
const isInfoCh=it=>/bilgilendirme|l[uü]tfen\s*oku|duyuru|announcement|read\s*me|^[\s#=*_\-|]{3,}/i.test((it&&it.name)||'');
const isFav=id=>FAVL.some(f=>f.id===id);
function favDraw(){const b=$('#lfav');if(b&&LV){const on=isFav(LV.id);b.innerHTML=on?IC.starf:IC.star;b.classList.toggle('on',on);b.setAttribute('aria-label',on?'Favorilerden çıkar':'Favorilere ekle')}}
function favToggle(it){if(isFav(it.id))FAVL=FAVL.filter(f=>f.id!==it.id);else FAVL.push({k:'live',id:it.id,name:it.name,icon:it.icon,num:it.num,cat:it.cat,arch:it.arch,url:it.url});save('rg-fav',FAVL)}
const inMy=it=>MYL.some(m=>m.k===it.k&&m.id===it.id);

/* ---------- görsel yardımcılar ---------- */
const hue=s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))%360;return h};
const artN=s=>{const h=hue(s);return`linear-gradient(160deg,hsl(${h} 32% 24%),#0a0d12)`};
const isz=(u,w)=>String(u||'').replace(/(image\.tmdb\.org\/t\/p\/)(original|w\d+)\//,'$1'+w+'/');
const IMG={q:[],act:{},bad:new Set(),io:null,
 host(u){try{return new URL(u,location.href).host}catch(e){return''}},
 panel(){return ACC&&ACC.srv?this.host(ACC.srv):''},
 scan(){const L=document.querySelectorAll('img[data-src]:not([data-o])');if(!L.length)return;
  if(!this.io&&'IntersectionObserver' in window)this.io=new IntersectionObserver(es=>es.forEach(e=>{const el=e.target;if(e.isIntersecting){if(this.q.indexOf(el)<0)this.q.push(el)}else{const i=this.q.indexOf(el);if(i>=0)this.q.splice(i,1)}this.pump()}),{rootMargin:'250px'});
  L.forEach(el=>{el.setAttribute('data-o','');if(this.bad.has(el.dataset.src))return el.remove();if(this.io)this.io.observe(el);else this.q.push(el)});if(!this.io)this.pump()},
 pump(){const ph=this.panel();for(let i=0;i<this.q.length;i++){const el=this.q[i];if(!el.isConnected||!el.dataset.src){this.q.splice(i--,1);continue}
   const src=el.dataset.src,h=this.host(src),lim=h===ph?2:6;if((this.act[h]||0)>=lim)continue;this.q.splice(i--,1);this.act[h]=(this.act[h]||0)+1;if(this.io)this.io.unobserve(el);
   const done=()=>{this.act[h]--;setTimeout(()=>this.pump(),h===ph?120:0)};
   el.onload=()=>{el.parentNode&&el.parentNode.classList.add('im');done()};el.onerror=()=>{this.bad.add(src);el.remove();done()};
   el.removeAttribute('data-src');el.src=src}}};
const img=(src,cls,w)=>src&&!IMG.bad.has(src)?`<img decoding="async" data-src="${esc(w?isz(src,w):src)}"${cls?` class="${cls}"`:''}>`:'';
const row=(h,it)=>it.length?`<div class="rt">${h}</div><div class="row">${it.join('')}</div>`:'';
const poster=it=>`<div class="po" data-f data-act="open" data-key="${reg(it)}" style="background:${artN(it.name)}">${img(it.icon,0,'w342')}<div class="pt${hue(it.name)%2?' os':''}">${esc(clean(it.name))}</div></div>`;
const cwCard=h=>{const ep=h.k==='ep'||h.k==='nx',it=ep?{k:'ep',id:h.id,name:h.name,icon:h.icon,ext:h.ext,url:h.url,sid:h.sid,sname:h.sname,scover:h.scover,season:h.season,num:h.num}:{k:h.k,id:h.id,name:h.name,icon:h.icon,ext:h.ext,url:h.url};
 const t=dispName(ep?h.sname:h.name).t,sub=h.k==='nx'?`S${h.season}:B${h.num}, ${h.name}`:ep?`S${h.season}:B${h.num}, ${Math.max(1,Math.round((h.d-h.t)/60))} dk kaldı`:`${Math.max(1,Math.round((h.d-h.t)/60))} dk kaldı`;
 return`<div class="ls" data-f data-act="cw" data-key="${reg(it)}" style="background:${artN(t)}">${img(ep?(h.scover||h.icon):h.icon,0,'w500')}${h.k==='nx'?'<span class="tag2">Sıradaki bölüm</span>':''}<div class="lt">${esc(clean(t))}<small>${esc(sub)}</small></div>${h.k==='nx'?'':`<div class="pb"><div style="width:${h.t/h.d*100}%"></div></div>`}</div>`};
const lcCard=it=>`<div class="lc" data-f data-act="live" data-key="${reg(it)}">${isFav(it.id)?`<em class="fst">${IC.starf}</em>`:'<i></i>'}<b>${it.num||''}</b><div>${esc(clean(it.name))}</div>${img(it.icon)}</div>`;
const tvi=it=>`<div class="tvi" data-f data-act="live" data-key="${reg(it)}" data-pv="1">${img(it.icon)}<span>${it.num||''}</span><div><b>${esc(clean(it.name))}</b><small>${it.arch?'Arşiv var':''}</small></div>${isFav(it.id)?`<em>${IC.star}</em>`:''}</div>`;
const srchBtn=(s,t)=>`<div class="btn sm" data-f data-act="srch" data-s="${s}">${IC.search} ${t}</div>`;
/* 01:45:10 -> 1 sa 45 dk, 00:50:24 -> 50 dk */
const fmtDur=d=>{const m=String(d||'').match(/^(\d{1,2}):(\d{2}):(\d{2})$/);if(!m)return d||'';const h=+m[1],mi=+m[2]+(+m[3]>=30?1:0);return h?`${h} sa ${mi} dk`:`${mi} dk`};
/* 'Run Away - S01E01 - Görmek İnanmaktır' -> 'Görmek İnanmaktır' */
const epTitle=e=>{let t=String(e.name||'');const sn=String(e.sname||'');if(sn&&t.toLowerCase().indexOf(sn.toLowerCase())===0)t=t.slice(sn.length);const tr=x=>x.replace(/^[\s\-–:.|]+|[\s\-–:.|]+$/g,'');t=tr(tr(t.replace(/\bS\d{1,2}\s*[.\-_ ]?\s*E\d{1,3}\b/i,'')).replace(/^\d{1,2}x\d{1,3}\b/i,'')).trim();return t&&!/^\d+$/.test(t)&&!/^b[öo]l[üu]m\s*\d+$/i.test(t)?t:''};
const TAGS=/\s*\b(NF|ATVP|AMZN|DSNP|HMAX|MAX|TVBU|PMTP|HULU|PCOK|SKST|CRAV|STAN|RTL\+?|WEB[- ]?DL|WEBRip|HDR|DV|4K|UHD|FHD|HD|1080p|720p|2160p|x264|x265|HEVC|MULTI|DUAL|TR|Altyaz[ıi]l[ıi]|Dublaj)\b\s*$/i;
const dispName=n=>{let t=clean(n),y='';for(let k=0;k<4;k++){const b=t.replace(TAGS,'');if(b===t)break;t=b}const m=t.match(/^(.*\S)\s*[\(\[](\d{4})[\)\]]\s*$/);if(m&&m[1].length>1){t=m[1];y=m[2]}for(let k=0;k<4;k++){const b=t.replace(TAGS,'');if(b===t)break;t=b}return{t:t.trim()||clean(n),y}};
function heroHTML(it,btns){const bd=it.bd||'',pic=bd||it.icon;
 const dn=dispName(it.name);let nm=dn.t,dt='';if(dn.y&&!it.year)it={...it,year:dn.y};const dm=nm.match(/^(.*?)\s*\(?(\d{2}\.\d{2}\.\d{4})\)?\s*$/);if(dm&&dm[1].length>2){nm=dm[1].replace(/[\s:\-]+$/,'');dt=dm[2]}
 const meta=[it.year,it.rating&&+it.rating?'Puan '+(+it.rating).toFixed(1):'',it.genre,fmtDur(it.dur),dt].filter(Boolean).map(x=>`<span>${esc(x)}</span>`).join('');
 return`<div class="bd" style="background:${artN(it.name)}">${img(pic,bd?'':'pb2',bd?'w1280':'w342')}</div><div class="hc"><div class="tl${nm.length>38?' s':nm.length>20?' m':''}">${esc(nm)}</div><div class="meta">${meta}</div>${it.plot?`<p class="ds">${esc(it.plot.length>260?it.plot.slice(0,257)+'…':it.plot)}</p>`:'<p class="ds"></p>'}${btns||''}</div>`}
const heroBtns=it=>{const k=reg(it);if(it.k==='ep'){const h=HIST['ep:'+it.id],go=h&&h.t>30;const sk=reg({k:'series',id:it.sid,name:it.sname,icon:it.scover});
  return`<div class="bt"><div class="btn pri" data-f data-act="cw" data-key="${k}">${IC.play} ${go?'Devam et':'İzle'} S${it.season}:B${it.num}</div><div class="btn" data-f data-act="open" data-key="${sk}">Bölümler</div></div>`}
 const h=HIST[it.k+':'+it.id],go=hPart(h);return`<div class="bt"><div class="btn pri" data-f data-act="${it.k==='vod'?'playv':'open'}" data-key="${k}">${IC.play} ${it.k==='series'?'Bölümler':go?'Devam et':'Oynat'}</div><div class="btn" data-f data-act="open" data-key="${k}">Ayrıntılar</div></div>`};
function toast(title,text,btns,ms){const t=$('#toast');t.innerHTML=`<b>${esc(title)}</b>${text?`<span>${esc(text)}</span>`:''}${btns||''}`;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>{t.classList.remove('on');if(cur&&t.contains(cur))unf()},ms||5000)}

/* =========================================================
   GÖRÜNÜMLER
   ========================================================= */
const V={},AF={};let HKEY=null,GRID=null;
V.home=()=>{const cw=cwList();HKEY=null;return`<div class="hero" id="hero"></div><div class="rows" id="hrows">${row('İzlemeye devam et',cw.map(cwCard))}${row('Listem',MYL.map(poster))}<div id="hmore"><div class="spin sm"></div></div></div>`};
let HL=[];
AF.home=async(a,tok)=>{const cw=cwList();let first=null,n=0;
 const put=h=>{if(tok!==RT||!$('#hmore'))return;const sp=$('#hmore > .spin');if(sp)sp.remove();$('#hmore').insertAdjacentHTML('beforeend',h);n++;if(!cur||!cur.isConnected)focus($('#view [data-f]'))};
 if(cw.length){const h=REG.get($('#hrows .ls').dataset.key);if(h)setHero(h)}
 try{const fav=FAVL.filter(f=>!isInfoCh(f)),ids={};fav.forEach(f=>ids[f.id]=1);let rest=[];
  if(fav.length<14){const lcs=visCats('live',await API.cats('live')).filter(c=>!catLocked(c));if(lcs[0])rest=(await API.items('live',lcs[0].id)).filter(c=>!isInfoCh(c)&&!ids[c.id])}
  HL=fav.concat(rest).slice(0,14);if(tok!==RT)return;
  if(HL.length)put(`<div class="rt">${fav.length?'Favoriler ve tüm kanallar':'Şimdi canlı'}</div><div class="row" id="hlive">${HL.map(lcCard).join('')}<div class="lc more" data-f data-act="nav" data-v="live"><b>Tüm kanallar</b><small>Canlı TV</small></div></div>`)}catch(e){}
 for(const k of['vod','series']){let cs;try{cs=visCats(k,await API.cats(k)).filter(c=>!catLocked(c))}catch(e){continue}if(tok!==RT)return;if(!cs.length)continue;
  let it=await API.items(k,cs[0].id).catch(()=>[]);if(tok!==RT)return;if(k==='vod')it=[...it].sort((x,y)=>y.added-x.added);
  if(!first&&it[0]){first=it[0];if(!cw.length)setHero(first)}
  if(it.length)put(row(`${k==='vod'?'Filmler':'Diziler'}, ${esc(catNm(cs[0]))}`,it.slice(0,16).map(poster)))}
 if(tok!==RT)return;const sp=$('#hmore > .spin');if(sp)sp.remove();if(!n&&!cw.length&&!FAVL.length)$('#hmore').innerHTML='<div class="empty">Bu listede film veya dizi bulunamadı. Sol menüden Canlı TV’ye geçebilirsin.</div>';
 if(!cur||!cur.isConnected)focus($('#view [data-f]'))};
function setHero(it){const k=reg(it);if(HKEY===k||!$('#hero'))return;HKEY=k;let v=it;
 if(it.k==='ep'){const sr=REG.get('series:'+it.sid)||{},h=HIST['ep:'+it.id],nx=!(h&&h.t>30);v={k:'series',id:it.sid,name:it.sname,icon:it.scover,bd:sr.bd,year:sr.year,genre:sr.genre,rating:sr.rating,dur:nx?`Sıradaki bölüm: S${it.season}:B${it.num}`:`S${it.season}:B${it.num}, ${Math.max(1,Math.round((h.d-h.t)/60))} dk kaldı`,plot:sr.plot||it.name}}
 else if(it.k==='vod'){const h=HIST['vod:'+it.id];if(hPart(h))v={...it,dur:`${Math.max(1,Math.round((h.d-h.t)/60))} dk kaldı`}}
 const html=heroHTML(v,it.k==='live'?'':heroBtns(it)),put=()=>{if(HKEY!==k||!$('#hero'))return;const hadF=cur&&cur.closest('#hero')?cur.dataset.act:null;$('#hero').innerHTML=html;if(hadF)focus($('#hero [data-act="'+hadF+'"]')||$('#hero [data-f]'))};
 const pic=v.bd||v.icon,src=pic&&!IMG.bad.has(pic)?isz(pic,v.bd?'w1280':'w342'):'';if(!src||!window.Image)return put();
 const im=new Image();let done=0;const fin=()=>{if(done)return;done=1;put()};im.decoding='async';im.onerror=fin;im.src=src;setTimeout(fin,1800);if(im.decode)im.decode().then(fin,fin);else im.onload=fin}

V.tv=()=>`<div class="lvhero"><div id="mv"></div><div class="lvfade"></div><div class="lvinfo" id="mi"></div></div><div class="btop"><h1>Canlı TV</h1><div class="btn sm" data-f data-act="catpick" data-t="live">${IC.guide} Kategoriler</div>${srchBtn('live','Kanallarda ara')}</div><div class="lvbot"><div class="lvcats" id="catl"><div class="spin sm"></div></div><div class="lvrow" id="chl"></div></div>`;
AF.tv=async(a,tok,sel)=>{const cs=visCats('live',await API.cats('live'));if(tok!==RT)return;
 const items=[...(FAVL.length?[{id:'__fav',name:'Favoriler',star:1}]:[]),...cs];
 $('#catl').innerHTML=items.map(c=>`<div class="chip" data-f data-act="cat" data-t="live" data-c="${esc(c.id)}"${c.adult?' data-ad="1"':''}>${c.star?IC.star:catLocked(c)?IC.lock:''}${esc(c.star?c.name:catNm(c))}</div>`).join('')||'<div class="empty">Kanal kategorisi yok.</div>';
 const want=FAVL.length?'__fav':ST.lastCat&&items.find(c=>c.id===ST.lastCat&&!catLocked(c))?ST.lastCat:(items.find(c=>!catLocked(c))||{}).id;
 if(want!=null)await loadCat('live',want,tok);if(tok!==RT)return;
 if(sel&&$('#view '+sel))focus($('#view '+sel));else if(!cur||!cur.isConnected||cur.closest('#view'))focus($('#chl [data-f]')||$('#catl [data-f]'))};
const lcc=it=>`<div class="lcc" data-f data-act="live" data-key="${reg(it)}" data-pv="1"><div class="lct">${img(it.icon)}<span>${it.num||''}</span>${isFav(it.id)?`<em>${IC.star}</em>`:''}</div><b>${esc(clean(it.name))}</b><small class="lnow" data-id="${esc(it.id)}">${it.arch?'Arşiv var':'&nbsp;'}</small><div class="pg"><div></div></div></div>`;
function fillNow(list,tok){if(!ST.cardEpg)return;list.slice(0,8).forEach((it,i)=>setTimeout(()=>{if(tok!==RT)return;API.epg(it.id,2).then(ep=>{const el=$(`#chl .lnow[data-id="${CSS.escape(it.id)}"]`);if(!el)return;const n=ep.find(e=>e.s<=Date.now()&&e.e>Date.now());if(!n)return;el.textContent=n.title;el.nextElementSibling.firstElementChild.style.width=Math.min(100,(Date.now()-n.s)/(n.e-n.s)*100)+'%'})},800+i*400))}
let CTX=[],LCN=0;
async function loadCat(k,cid,tok){tok=tok||RT;let sc=null;$$('#catl [data-act=cat]').forEach(c=>{const on=c.dataset.c===cid;c.classList.toggle('sel',on);if(on)sc=c});
 if(sc){const rw=sc.parentElement;try{rw.scrollTo({left:Math.max(0,sc.offsetLeft-rw.clientWidth/2+sc.offsetWidth/2),behavior:'auto'})}catch(e){rw.scrollLeft=Math.max(0,sc.offsetLeft-80)}}
 const box=k==='live'?$('#chl'):$('#vg');if(!box)return;box.innerHTML='<div class="spin sm"></div>';let it;
 try{it=cid==='__fav'?FAVL.slice():await API.items(k,cid)}catch(e){if(tok===RT)box.innerHTML=`<div class="empty err2">${esc(e.message)}</div>`;return}
 if(tok!==RT)return;if(k==='live'){ST.lastCat=cid;saveST();CTX=it;LCN=40;box.innerHTML=it.slice(0,40).map(lcc).join('')||'<div class="empty">Bu kategoride kanal yok.</div>';box.scrollLeft=0;fillNow(it,tok)}
 else{GRID={k,items:it,n:0};box.innerHTML='';gridMore();if(!it.length)box.innerHTML='<div class="empty">Bu kategoride içerik yok.</div>'}}
function gridTrim(e){const b=$('#vg');if(!GRID||!b)return;const i=Array.prototype.indexOf.call(b.children,e);if(i<0)return;const want=Math.max(0,Math.floor((i-96)/12)*12),c0=GRID.c0||0;
 if(want>c0){for(let j=c0;j<want;j++){const el=b.children[j];if(el&&!el.dataset.cold){el.innerHTML='';el.dataset.cold='1'}}}
 else if(want<c0){const t=document.createElement('div');for(let j=want;j<c0;j++){const el=b.children[j],it=GRID.items[j];if(el&&el.dataset.cold&&it){t.innerHTML=poster(it);el.replaceWith(t.firstElementChild)}}}
 GRID.c0=want}
function gridMore(){if(!GRID)return;const b=$('#vg');if(!b)return;const nx=GRID.items.slice(GRID.n,GRID.n+60);GRID.n+=nx.length;b.insertAdjacentHTML('beforeend',nx.map(poster).join(''))}
let MT=null,CT=null;
function miniDraw(it){const m=$('#mv');if(!m||!it)return;miniStop();m.innerHTML=img(it.icon);
 const cat=(API.C.clive&&null)||'';
 $('#mi').innerHTML=`${img(it.icon,'lvlogo')}<div class="meta"><span class="q on">● Canlı</span>${it.num?`<span>${it.num}</span>`:''}${it.arch?'<span>Arşiv var</span>':''}${isFav(it.id)?'<span>Favori</span>':''}</div><div class="mt">${esc(clean(it.name))}</div><div id="mepg"><span style="color:var(--mut)">Program bilgisi yükleniyor…</span></div><div class="hint3">OK ile tam ekran izle</div>`;
 clearTimeout(miniDraw.t);miniDraw.t=setTimeout(()=>API.epg(it.id,3).then(ep=>{if(!$('#mepg')||REG.get(cur&&cur.dataset.key)!==it)return;const n=ep.find(e=>e.s<=Date.now()&&e.e>Date.now()),x=ep.find(e=>e.s>Date.now());
  $('#mepg').innerHTML=n?`<div class="mnow">${esc(n.title)}</div><div class="mtime">${hhmm(n.s)} – ${hhmm(n.e)}, ${Math.max(1,Math.round((n.e-Date.now())/60000))} dk kaldı</div><div class="pg"><div style="width:${Math.min(100,(Date.now()-n.s)/(n.e-n.s)*100)}%"></div></div>${x?`<div class="mnext">Sonra: ${esc(x.title)}, ${hhmm(x.s)}</div>`:''}`:'<span style="color:var(--mut)">Program bilgisi yok</span>'}),700);
 clearTimeout(MT);if(miniOn())MT=setTimeout(()=>{if(cur&&REG.get(cur.dataset.key)===it&&cv==='tv'&&scr==='app')miniPlay(it)},1500)}
const miniOn=()=>ST.mini===1;
function miniPlay(it){const m=$('#mv');if(!m)return;const r=m.getBoundingClientRect(),sr=$('#stage').getBoundingClientRect();if(!sr.width)return;
 const u=1280/sr.width,x=(r.left-sr.left)*u,y=(r.top-sr.top)*u,w=r.width*u,h=r.height*u,k=1920/(innerWidth||1920);
 $('#hole').style.clipPath=`path(evenodd,"M0 0H1280V720H0Z M${x} ${y}h${w}v${h}h${-w}Z")`;
 LOG.add('info','Önizleme başlatıldı',{kanal:it.name});
 AV.open(API.url(it),{x:Math.round((STX+x*STS)*k),y:Math.round((STY+y*STS)*k),w:Math.round(w*STS*k),h:Math.round(h*STS*k)},{error:()=>{miniStop();if($('#mepg'))toast('Önizleme açılamadı','Tam ekranda tekrar denenecek.',0,2500)}});
 document.documentElement.classList.add('vid')}
function miniStop(){clearTimeout(MT);if(scr==='app'&&AV.st!=='none'){AV.close();document.documentElement.classList.remove('vid')}}

let BR=null;
const browseView=(k,h)=>{HKEY=null;return`<div class="hero" id="hero"></div><div class="btop"><h1>${h}</h1><div class="btn sm" data-f data-act="catpick" data-t="${k}">${IC.guide} Kategoriler</div>${srchBtn(k,(k==='series'?'Dizilerde':'Filmlerde')+' ara')}</div><div class="rows" id="brows"><div class="spin sm"></div></div>`};
V.series=()=>browseView('series','Diziler');V.films=()=>browseView('vod','Filmler');
async function browseAF(k,tok){const cs=visCats(k,await API.cats(k));if(tok!==RT)return;BR={k,cs,shown:0,tok,busy:0};$('#brows').innerHTML=cs.length?'':'<div class="empty">Bu listede içerik yok.</div>';
 await browseMore();if(tok===RT&&(!cur||!cur.isConnected||cur.closest('#view')))focus($('#hero [data-f]')||$('#brows [data-f]'))}
AF.series=(a,t)=>browseAF('series',t);AF.films=(a,t)=>browseAF('vod',t);
async function rowFill(B,cid,nm){const tok=B.tok;let it=[];try{it=await API.items(B.k,cid)}catch(e){}if(tok!==RT)return;const row=$(`#brows .row[data-cat="${CSS.escape(cid)}"]`);if(!row||row.dataset.cold)return;
 if(!it.length){row.previousElementSibling.remove();row.remove();return}if(B.k==='vod')it=[...it].sort((a,b)=>b.added-a.added);row.dataset.n=nm;
 row.innerHTML=it.slice(0,16).map(poster).join('')+`<div class="more" data-f data-act="catall" data-t="${B.k}" data-c="${esc(cid)}" data-n="${esc(nm)}"><b>Tümünü gör</b><small>${it.length} ${B.k==='vod'?'film':'dizi'}</small></div>`;
 if(!HKEY&&it[0])setHero(it[0])}
/* bellek: odaktan uzak satırların içini boşalt, yaklaşınca geri doldur */
let COLDR=null;
function rowsTrim(rw){if(!BR||rw===COLDR)return;COLDR=rw;const rows=[...$('#brows').children].filter(x=>x.classList.contains('row')&&x.dataset.cat),i=rows.indexOf(rw);
 rows.forEach((r,j)=>{const far=j<i-5||j>i+8;if(far&&!r.dataset.cold&&r.dataset.n){r.dataset.cold='1';r.innerHTML=''}else if(!far&&r.dataset.cold){delete r.dataset.cold;rowFill(BR,r.dataset.cat,r.dataset.n)}})}
async function browseMore(){if(!BR||BR.busy||BR.shown>=BR.cs.length)return;BR.busy=1;const B=BR,tok=B.tok,part=B.cs.slice(B.shown,B.shown+5);B.shown+=part.length;const box=$('#brows');if(!box){B.busy=0;return}
 box.insertAdjacentHTML('beforeend',part.map(c=>`<div class="rt">${catLocked(c)?IC.lock+' ':''}${esc(catNm(c))}</div><div class="row" data-cat="${esc(c.id)}">${catLocked(c)?`<div class="lockc" data-f data-act="catall" data-t="${B.k}" data-c="${esc(c.id)}" data-n="${esc(catNm(c))}" data-ad="1">${IC.lock}<b>PIN ile aç</b><small>Yetişkin içerik</small></div>`:'<div class="spin sm"></div>'}</div>`).join(''));
 await Promise.all(part.filter(c=>!catLocked(c)).map(c=>rowFill(B,c.id,catNm(c))));B.busy=0;if(tok===RT&&$('#brows')&&$('#brows').scrollHeight<=$('#brows').clientHeight+40)browseMore()}
V.cat=a=>`<div class="hrow"><h1>${esc(a.n||'Kategori')}</h1>${srchBtn(a.t,(a.t==='series'?'Dizilerde':'Filmlerde')+' ara')}</div><div class="vgrid full" id="vg"><div class="spin"></div></div>`;
AF.cat=async(a,tok)=>{let it=await API.items(a.t,a.c);if(tok!==RT)return;if(a.t==='vod')it=[...it].sort((x,y)=>y.added-x.added);GRID={k:a.t,items:it,n:0};$('#vg').innerHTML=it.length?'':'<div class="empty">Bu kategoride içerik yok.</div>';gridMore();focus($('#vg [data-f]'))};
async function catPick(t){const cs=visCats(t,await API.cats(t));$('#catov h2').textContent={live:'Kanal kategorileri',vod:'Film kategorileri',series:'Dizi kategorileri'}[t];
 $('#catov .catgrid').innerHTML=cs.map(c=>`<div class="cpi" data-f data-act="catall" data-t="${t}" data-c="${esc(c.id)}" data-n="${esc(catNm(c))}"${c.adult?' data-ad="1"':''}>${catLocked(c)?IC.lock:''}<span>${esc(catNm(c))}</span></div>`).join('')||'<p class="empty">Kategori yok.</p>';
 $('#catov').classList.add('on');focus($('#catov [data-f]'))}

V.detail=key=>{const it=REG.get(key);return`<div class="hero" id="dhero">${heroHTML(it,'<div class="spin sm"></div>')}</div><div id="dmore"></div>`};
let EPS=[],SEAS=null;
AF.detail=async(key,tok)=>{const it=REG.get(key);const my=`<div class="btn" data-f data-act="mylist" data-key="${key}">${inMy(it)?'Listemde':'Listeme ekle'}</div>`;
 if(it.k==='vod'){let inf={};if(ACC.type==='xt'){const j=await API.vodInfo(it.id).catch(()=>null);inf=(j&&j.info)||{}}if(tok!==RT)return;
  const x={...it,plot:inf.plot||inf.description||'',genre:inf.genre||'',year:String(inf.releasedate||inf.release_date||'').slice(0,4),rating:inf.rating||it.rating,dur:inf.duration||'',bd:(Array.isArray(inf.backdrop_path)&&inf.backdrop_path[0])||'',icon:it.icon||inf.movie_image};
  const h=HIST['vod:'+it.id],res=hPart(h);
  $('#dhero').innerHTML=heroHTML(x,`<div class="bt"><div class="btn pri" data-f data-act="playv" data-key="${key}">${IC.play} ${res?'Devam et':'Oynat'}</div>${my}</div>`);
  $('#dmore').innerHTML=[inf.cast?`<p class="sub2"><b style="color:var(--tx)">Oyuncular:</b> ${esc(inf.cast)}</p>`:'',inf.director?`<p class="sub2"><b style="color:var(--tx)">Yönetmen:</b> ${esc(inf.director)}</p>`:''].join('');
  return focus($('#dhero [data-act=playv]'))}
 const j=await API.seriesInfo(it.id).catch(e=>({err:e.message}));if(tok!==RT)return;if(j.err){$('#dhero .spin').outerHTML=`<p class="empty err2">${esc(j.err)}</p>`;return}
 const inf=j.info||{},x={...it,plot:inf.plot||it.plot,genre:inf.genre||it.genre,year:String(inf.releaseDate||inf.release_date||it.year||'').slice(0,4),rating:inf.rating||it.rating,bd:(Array.isArray(inf.backdrop_path)&&inf.backdrop_path[0])||it.bd,icon:it.icon||inf.cover};
 const E=j.episodes||{},ss=Object.keys(E).sort((a,b)=>a-b);
 EPS=[];ss.forEach(s=>(E[s]||[]).forEach(e=>EPS.push({k:'ep',id:String(e.id),ext:e.container_extension||'mp4',name:e.title||('Bölüm '+e.episode_num),season:+s,num:+e.episode_num||0,sid:it.id,sname:it.name,scover:x.icon,icon:(e.info&&e.info.movie_image)||x.icon,plot:(e.info&&e.info.plot)||'',dur:(e.info&&e.info.duration)||''})));
 const last=HIST['sl:'+it.id],nx=HIST['nx:'+it.id];let lastEp=last&&EPS.find(e=>e.id===last.id),lab='Devam et';if(nx&&(!last||nx.ts>=last.ts)){const e=EPS.find(z=>z.id===nx.id);if(e){lastEp=e;lab='Sıradaki bölüm'}}const tgt=lastEp||EPS[0];SEAS={it,x,ss};
 $('#dhero').innerHTML=heroHTML(x,`<div class="bt">${tgt?`<div class="btn pri" data-f data-act="playe" data-key="${reg(tgt)}">${IC.play} ${lastEp?lab:'İzle'} S${tgt.season}:B${tgt.num}</div>`:''}${my}</div>`);
 drawSeason(tgt?tgt.season:+ss[0]);focus($('#dhero [data-f]'))};
function epState(e){const h=HIST['ep:'+e.id];if(hDone(h))return{st:'done',h};if(h&&h.t>30)return{st:'prog',h};return{st:'new',h:null}}
function drawSeason(s,focusSel){const{ss,it}=SEAS,nx=HIST['nx:'+it.id],nxId=nx&&nx.id;
 const chips=ss.map(n=>{const eps=EPS.filter(e=>e.season===+n),all=eps.length&&eps.every(e=>epState(e).st==='done');return`<div class="chip${+n===s?' sel':''}" data-f data-act="season" data-s="${n}">${all?IC.check:''}${n}. Sezon</div>`}).join('');
 const L=EPS.filter(e=>e.season===s),cnt={done:0,prog:0,new:0};
 const rows=L.map(e=>{const{st,h}=epState(e);cnt[st]++;const isNx=st!=='done'&&e.id===nxId,left=h?Math.max(1,Math.round((h.d-h.t)/60)):0;
  const lab=st==='done'?'<span class="st d">İzlendi</span>':st==='prog'?`<span class="st p">Yarım kaldı, ${left} dk kaldı</span>`:isNx?'<span class="st p">Sıradaki bölüm</span>':'<span class="st n">İzlenmedi</span>';
  return`<div class="ep ${st}${isNx?' nxt':''}" data-f data-act="playe" data-key="${reg(e)}"><div class="th" style="background:${artN(e.name)}">${img(e.icon,0,'w300')}${st==='done'?`<div class="ck">${IC.check}</div>`:''}${isNx?'<span class="tag2">Sıradaki</span>':''}${st==='prog'?`<div class="pb"><div style="width:${Math.min(100,h.t/h.d*100)}%"></div></div>`:''}</div><div><div class="n">${e.num}. Bölüm${e.dur?', '+esc(fmtDur(e.dur)):''} · ${lab}</div><b>${esc(epTitle(e)||e.num+'. Bölüm')}</b><p>${esc(e.plot.slice(0,180))}</p></div></div>`}).join('');
 const sum=L.length?`<p class="esum">${L.length} bölüm: ${cnt.done} izlendi, ${cnt.prog} yarım kaldı, ${cnt.new} izlenmedi</p>`:'';
 $('#dmore').innerHTML=`<div class="seas">${chips}</div>${sum}`+(rows||'<p class="empty">Bu sezonda bölüm yok.</p>');if(focusSel)focus($('#dmore '+focusSel))}

let Q='',SDATA=null;
const SCOPES={all:['live','vod','series'],live:['live'],vod:['vod'],series:['series']};
V.search=sc=>{sc=sc||'all';const H={all:'Ara',live:'Kanallarda ara',vod:'Filmlerde ara',series:'Dizilerde ara'}[sc];
 return`<h1>${H}</h1><div class="srch"><div><div class="qbox" id="qbox"></div><div class="kb">${[...'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ0123456789'].map(k=>`<div class="key" data-f data-act="key" data-v="${k}">${k}</div>`).join('')}<div class="key w" data-f data-act="key" data-v=" ">Boşluk</div><div class="key w" data-f data-act="key" data-v="DEL">Sil</div></div></div><div style="flex:1;min-width:0" id="sres"><div class="spin"></div><p class="empty" style="text-align:center">Liste aramaya hazırlanıyor. Büyük listelerde bu ilk seferde biraz sürebilir.</p></div></div>`};
let SIDX={};
const yieldT=()=>new Promise(r=>setTimeout(r,0));
AF.search=async(sc,tok)=>{sc=sc||'all';const D={};SDATA={sc,D};for(const k of SCOPES[sc]){try{const ck=k+(pinOn()&&!UNL?'p':'')+(ST['h_'+k]||[]).join(',');
  if(SIDX[k]&&SIDX[k].ck===ck){D[k]=SIDX[k].v;continue}
  const[all,ad]=await Promise.all([API.all(k),adultSet(k)]);const hid=new Set(ST['h_'+k]||[]),out=[];
  for(let i=0;i<all.length;i++){const it=all[i];if(!hid.has(it.cat)&&!(pinOn()&&!UNL&&ad.has(it.cat)))out.push([U(clean(it.name)),it]);if(i%1500===1499){await yieldT();if(tok!==RT)return}}
  D[k]=out;SIDX[k]={ck,v:out}}catch(e){D[k]=[]}if(tok!==RT)return;if(Q)drawSearch()}
 if(tok!==RT)return;drawSearch()};
function drawSearch(){$('#qbox').innerHTML=Q?esc(Q):`<span style="color:var(--dim)">Aramak için yaz</span>`;if(!SDATA)return;const{D}=SDATA,R={};let tot=0;
 for(const k in D){const a=[];if(Q){const L=D[k];for(let i=0;i<L.length&&a.length<48;i++)if(L[i][0].includes(Q))a.push(L[i][1])}R[k]=a;tot+=a.length}
 const chips=(h,a)=>a.length?`<div class="rt" style="margin:0 0 10px;font-size:16px;color:var(--mut)">${h}</div><div class="chips" style="margin-bottom:16px">${a.map(x=>`<div class="chip" data-f data-act="rq" data-q="${esc(x)}">${esc(x)}</div>`).join('')}</div>`:'';
 let h='';if(!Q)h=chips('Son aramalar',ST.rec)+'<p class="empty">Ekrandaki klavyeyle yazmaya başla. Sonuçlar yazdıkça gelir.</p>';
 else{h=`<div class="rt" style="margin:0 0 12px">${tot} sonuç${tot>=48?' (ilk sonuçlar)':''}</div>`;if(!tot)h+='<p class="empty">Bu adla bir sonuç yok. Farklı bir kelime dene.</p>';
  if(R.vod&&R.vod.length)h+=`${SDATA.sc==='all'?'<div class="rt" style="margin:0 0 10px">Filmler</div>':''}<div class="grid">${R.vod.map(poster).join('')}</div>`;
  if(R.series&&R.series.length)h+=`${SDATA.sc==='all'?'<div class="rt" style="margin:18px 0 10px">Diziler</div>':''}<div class="grid">${R.series.map(poster).join('')}</div>`;
  if(R.live&&R.live.length)h+=`${SDATA.sc==='all'?'<div class="rt" style="margin:18px 0 10px">Kanallar</div>':''}<div class="grid">${R.live.map(i=>`<div class="tvi" data-f data-act="live" data-key="${reg(i)}" style="width:300px">${img(i.icon)}<span>${i.num||''}</span><div><b>${esc(clean(i.name))}</b></div></div>`).join('')}</div>`}
 $('#sres').innerHTML=h}

V.settings=()=>{const u=ACC.ui||{},ex=+u.exp_date?new Date(+u.exp_date*1000):null,dl=ex?Math.ceil((ex-Date.now())/864e5):null;
 const sub=ACC.type==='m3u'?'M3U listesi':`${esc(ACC.srv)} · ${esc(ACC.u)}`;
 return`<h1>Ayarlar</h1><div class="acct"><div><b>${sub}</b><small>${ex?`Abonelik ${ex.toLocaleDateString('tr-TR')} tarihine kadar, ${dl} gün kaldı.`:'Abonelik bitiş tarihi bilinmiyor.'}${u.max_connections?` Bağlantı: ${u.active_cons||0} / ${u.max_connections}.`:''}</small><small>Cihaz kodu: <b style="color:var(--tx)">${DEV}</b> · Sürüm ${APPV} (${APPSRC})</small></div><div class="btn sm" data-f data-act="logout">Listeyi değiştir</div></div>
 <div class="set" data-f data-act="cats" data-t="live">Kategorileri düzenle<span>Canlı TV, filmler, diziler ›</span></div>
 <div class="set" data-f data-act="reload">Listeyi yenile<span>Yeni eklenenleri getir ›</span></div>
 ${SET.map(([k,n,o])=>`<div class="set" data-f data-act="set" data-k="${k}">${n}<span>‹ ${o[ST[k]||0]} ›</span></div>`).join('')}
 <div class="set" data-f data-act="pinchg">PIN kodunu değiştir<span>›</span></div>
 <div class="set" data-f data-act="diag">Son hatalar<span>Sorun bildirmek için ›</span></div>`};
V.diag=()=>{const b=load('rg-logbuf',[]);return`<h1>Son hatalar</h1><p class="sub2">Bir sorun olduğunda bu ekranın fotoğrafını göndermen yeterli. Sürüm ${APPV} (${APPSRC}), cihaz ${DEV}. Akıcılık: ${PERF.text()}${ACC&&ACC.ui&&ACC.ui.max_connections?`, bağlantı hakkı ${ACC.ui.max_connections}`:''}.</p>`+(b.length?b.map(x=>`<div class="set" data-f><b style="font-weight:700;max-width:640px">${esc(x.m)}</b><span>${esc(x.l)} · ${hhmm(x.t)}</span></div>`).join(''):'<p class="empty">Kayıtlı hata yok.</p>')}
V.cats=t=>`<h1>Kategoriler</h1><div class="chips">${[['live','Canlı TV'],['vod','Filmler'],['series','Diziler']].map(([k,n])=>`<div class="chip${k===t?' sel':''}" data-f data-act="ctab" data-t="${k}">${n}</div>`).join('')}</div><p class="sub2">Gizlediğin kategoriler listede, aramada ve kanal geçişinde görünmez. Yetişkin kategoriler otomatik algılanır ve PIN ile korunur.</p><div id="cbox"><div class="spin sm"></div></div>`;
AF.cats=async(t,tok,sel)=>{const cs=await API.cats(t);if(tok!==RT)return;drawCats(t,cs,sel)};
function fullOrd(t,cs){const ord=ST['o_'+t]||[],pos=id=>{const i=ord.indexOf(id);return i<0?1e6:i};return cs.map((c,i)=>({...c,i})).sort((a,b)=>pos(a.id)-pos(b.id)||a.i-b.i)}
function drawCats(t,cs,sel){const h=ST['h_'+t]||[],nm={};visCats(t,cs).forEach(c=>nm[c.id]=c.nm);const o=fullOrd(t,cs).map(c=>({...c,nm:nm[c.id],adult:isAdult(c.name)}));
 $('#cbox').innerHTML=o.map((c,j)=>`<div class="crow${h.includes(c.id)?' off':''}"><div><b>${c.adult?IC.lock+' ':''}${esc(catNm(c))}</b><small>Sağlayıcıdaki adı: ${esc(c.name)}</small></div><div class="btn sm" data-f data-act="cmv" data-t="${t}" data-c="${esc(c.id)}" data-d="-1">▲</div><div class="btn sm" data-f data-act="cmv" data-t="${t}" data-c="${esc(c.id)}" data-d="1">▼</div><div class="btn sm" data-f data-act="chide" data-t="${t}" data-c="${esc(c.id)}">${h.includes(c.id)?'Göster':'Gizle'}</div></div>`).join('')||'<p class="empty">Kategori yok.</p>';
 if(sel)focus($('#cbox '+sel))}

/* ---------- gezinme ---------- */
function go(s){const was=scr;scr=s;if(s==='login'){if(was!=='login'||!PAIR.t)PAIR.start()}else PAIR.stop();$$('.scr').forEach(x=>x.classList.toggle('on',x.id===s));document.documentElement.classList.toggle('vid',s==='player'||s==='live')}
function sideCur(v,a){const sv={diag:'settings',cat:a&&a.t==='vod'?'films':'series',tv:'live',detail:REG.get(a)&&REG.get(a).k==='vod'?'films':'series',cats:'settings',search:a==='live'?'live':a==='vod'?'films':a==='series'?'series':'search'}[v]||v;$$('.sn').forEach(s=>s.classList.toggle('cur',s.dataset.v===sv))}
async function render(v,a,push=true,sel){if(push||!nav.length)nav.push([v,a]);else nav[nav.length-1]=[v,a];if(cv==='tv'||v!=='tv')miniStop();if(cv==='search'&&v!=='search'&&v!=='detail')API.purge();if(REG.size>6000&&(v==='home'||v==='tv'||v==='series'||v==='films'))REG.clear();cv=v;GRID=null;BR=null;COLDR=null;
 $('#catov').classList.remove('on');const w=$('#view'),tok=++RT;w.className=v==='home'||v==='series'||v==='films'?'home':v==='tv'?'tvv':'';w.innerHTML=V[v](a);w.scrollTop=0;sideCur(v,a);focus((sel&&$('#view '+sel))||$('#view [data-f]'));
 if(AF[v]){try{await AF[v](a,tok,sel)}catch(e){if(tok===RT)toast('Yüklenemedi',e.message);LOG.add('api',e.message,{gorunum:v})}}}
function exit(){scanStop();extStop();LRN=null;AV.close();clearTimeout(SLEEP);go('app');const[v,a]=nav[nav.length-1]||['home'];render(v,a,false,retSel);if(UPD)setTimeout(updApply,400)}
function back(){if(scr!=='app')return;if($('#catov').classList.contains('on')){$('#catov').classList.remove('on');return focus($('[data-act=catpick]'))}if(nav.length>1){nav.pop();const[v,a]=nav[nav.length-1];render(v,a,false)}else if(cv!=='home'&&cur&&!cur.closest('#side'))focus($('.sn.cur')||$('.sn'));else{$('#exitov').classList.add('on');focus($('[data-act=noquit]'))}}
const selOf=e=>{const d=e.dataset;return`[data-act="${d.act}"]`+(d.key?`[data-key="${d.key}"]`:'')};
let IO=null;const VSET=new Set();
function ioScan(){if(!('IntersectionObserver' in window))return;if(!IO)IO=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting?VSET.add(e.target):VSET.delete(e.target)),{rootMargin:'300px'});
 document.querySelectorAll('[data-f]:not([data-io])').forEach(el=>{el.setAttribute('data-io','');IO.observe(el)})}
if('MutationObserver' in window){let mt=0;new MutationObserver(ms=>{if(mt)return;let el=false;for(const m of ms){for(const n of m.addedNodes)if(n.nodeType===1){el=true;break}if(el)break}if(!el)return;mt=requestAnimationFrame(()=>{mt=0;ioScan();IMG.scan()})}).observe(document.body,{childList:true,subtree:true})}
function vis(){if(PAD)return $$('#pad [data-f]');if($('#exitov').classList.contains('on'))return $$('#exitov [data-f]');
 const ov=$('#'+scr+' .ov.on');if(ov)return [...ov.querySelectorAll('[data-f]'),...(scr==='app'&&ov.id==='catov'?$$('#side [data-f]'):[])];if(IO&&VSET.size){for(const e of VSET)if(!e.isConnected)VSET.delete(e);const L=[...VSET].filter(e=>e.closest('#'+scr)&&e.offsetParent!==null);if(L.length)return L}
 return $$('#'+scr+' [data-f]').filter(e=>e.offsetParent!==null)}
const HROW='.row,.lvrow,.lvcats,.chips,.bt,.seas';
function unf(){cur&&cur.classList.remove('fx');cur=null}
let HT=null,REP=false,KT=0;
/* afiş satırları: odaklanan satır hep aynı yükseklikte dursun, yatayda sadece gerekince kay */
function rowScroll(e,beh){const rw=e.parentElement,box=rw&&rw.classList.contains('row')&&rw.parentElement;if(!box||!box.scrollTo||(!box.classList.contains('rows')&&box.id!=='brows'&&box.id!=='hmore'&&box.id!=='hrows'))return false;
 const sc=e.closest('.rows');if(!sc)return false;const sr=sc.getBoundingClientRect(),rt=rw.previousElementSibling,top=(rt&&rt.classList.contains('rt')?rt:rw).getBoundingClientRect(),z=sr.height/(sc.clientHeight||1)||1;
 const ty=Math.max(0,Math.round(sc.scrollTop+(top.top-sr.top)/z-6));if(Math.abs(ty-sc.scrollTop)>2)try{sc.scrollTo({top:ty,behavior:beh})}catch(x){sc.scrollTop=ty}
 const rr=rw.getBoundingClientRect(),er=e.getBoundingClientRect(),zx=rr.width/(rw.clientWidth||1)||1;let tx=null;if(er.left<rr.left+4)tx=rw.scrollLeft+(er.left-rr.left)/zx-24;else if(er.right>rr.right-4)tx=rw.scrollLeft+(er.right-rr.right)/zx+24;
 if(tx!=null)try{rw.scrollTo({left:Math.max(0,Math.round(tx)),behavior:beh})}catch(x){rw.scrollLeft=tx}return true}
const tail=(e,n)=>{let c=0,x=e;while(c<n&&(x=x.nextElementSibling))c++;return c};
function focus(e){if(!e)return;if(!PAD&&!e.closest('#'+scr)&&!e.closest('#toast,#exitov,#pad'))return;const ae=document.activeElement;if(ae&&ae.tagName==='INPUT'&&ae!==e)ae.blur();cur&&cur.classList.remove('fx');cur=e;e.classList.add('fx');const now=Date.now(),beh=REP||ST.anim===1||now-KT<260?'auto':'smooth';KT=now;rowScroll(e,beh)||(()=>{try{e.scrollIntoView({block:'nearest',inline:'nearest',behavior:beh})}catch(x){}})();
 if(scr!=='app'||PAD)return;const so=!!e.closest('#side');if(so)$('#catov').classList.remove('on');$('#side').classList.toggle('open',so);$('#app').classList.toggle('sopen',so);const d=e.dataset;
 if(d.pv)miniDraw(REG.get(d.key));
 if(d.act==='cat'){clearTimeout(CT);if(!e.classList.contains('sel')&&!(d.ad&&pinOn()&&!UNL))CT=setTimeout(()=>{if(cur===e)loadCat(d.t,d.c)},350)}
 if(BR){const rw=e.closest('#brows .row');if(rw){if(tail(rw,8)<8)browseMore();rowsTrim(rw)}}
 if((cv==='home'||cv==='series'||cv==='films')&&d.key&&e.closest('.rows')){clearTimeout(HT);HT=setTimeout(()=>{const it=REG.get(d.key);if(it&&it.k!=='live')setHero(it)},550)}
 if(CTX.length>LCN&&e.parentElement&&e.parentElement.id==='chl'&&tail(e,7)<7){e.parentElement.insertAdjacentHTML('beforeend',CTX.slice(LCN,LCN+40).map(lcc).join(''));LCN+=40}
 if(GRID&&e.parentElement&&e.parentElement.id==='vg'){if(tail(e,13)<13)gridMore();gridTrim(e)}}
function move(d){if(!cur||!cur.isConnected)return focus(vis()[0]);
 if((d==='l'||d==='r')&&cur.parentElement&&cur.parentElement.matches(HROW)){let n=d==='r'?cur.nextElementSibling:cur.previousElementSibling;
  while(n&&!n.hasAttribute('data-f'))n=d==='r'?n.nextElementSibling:n.previousElementSibling;if(n)return focus(n);if(d==='r')return}const c=cur.getBoundingClientRect(),cx=c.x+c.width/2,cy=c.y+c.height/2,ver=d==='u'||d==='d',inSide=!!cur.closest('#side');
 const pickFrom=L=>{let best=null,bd=1e9;for(const e of L){if(e===cur)continue;if(ver&&scr==='app'&&!PAD&&(!!e.closest('#side'))!==inSide)continue;const r=e.getBoundingClientRect(),dx=r.x+r.width/2-cx,dy=r.y+r.height/2-cy;
  if(!{l:dx<-4,r:dx>4,u:dy<-4,d:dy>4}[d])continue;const h=!ver,ov=h?Math.min(r.y+r.height,c.y+c.height)-Math.max(r.y,c.y)>2:Math.min(r.x+r.width,c.x+c.width)-Math.max(r.x,c.x)>2;
  const sc=(h?Math.abs(dx):Math.abs(dy))+(h?Math.abs(dy):Math.abs(dx))*(ov?0.15:2.5);if(sc<bd){bd=sc;best=e}}return best};
 let best=pickFrom(vis());
 if(!best&&IO&&!PAD&&!$('#exitov').classList.contains('on')&&!$('#'+scr+' .ov.on'))best=pickFrom($$('#'+scr+' [data-f]').filter(e=>e.offsetParent!==null));
 focus(best)}

/* ---------- giriş ---------- */
function parseLogin(a,u,p){a=a.trim();u=u.trim();p=p.trim();if(!a)throw new Error('Sunucu adresini veya M3U linkini gir. Örnek: http://sunucu.com:8080');
 if(!/^https?:\/\//i.test(a))a='http://'+a;const m=a.match(/^(https?:\/\/[^/?#]+)[^?]*\/get\.php\?(.+)$/i);
 if(m){const q=new URLSearchParams(m[2]);if(q.get('username')&&q.get('password'))return{type:'xt',srv:m[1],u:q.get('username'),p:q.get('password')}}
 if(u&&p)return{type:'xt',srv:a.replace(/\/(player_api\.php|get\.php).*$/i,'').replace(/\/+$/,''),u,p};return{type:'m3u',url:a}}
async function doLogin(acc){const pr=$('#lprog'),bar=$('#lprog i'),lab=$('#lprog b');$('#lerr').textContent='';pr.classList.add('on');
 const step=(t,w)=>{lab.textContent=t;bar.style.width=w+'%'};
 try{API.C={};step('Sunucuya bağlanılıyor',15);
  if(acc.type==='xt'){ACC=acc;acc.ui=await API.login();step('Kategoriler yükleniyor',55);await Promise.all(['live','vod','series'].map(k=>API.cats(k).catch(()=>[])))}
  else{ACC=acc;step('Liste indiriliyor',40);await M3U.load(acc.url);step('Liste düzenleniyor',85)}
  save('rg-acc',ACC);step('Hazır',100);setTimeout(()=>{pr.classList.remove('on');bar.style.width='0';startApp()},250)}
 catch(e){pr.classList.remove('on');bar.style.width='0';$('#lerr').textContent=e.message;LOG.add('warn','Giriş başarısız: '+e.message,{tip:acc.type});if(!PAIR.code)PAIR.start();if(!load('rg-acc',null))ACC=null;else ACC=load('rg-acc',null);focus($('[data-act=login]'))}}
function startApp(){go('app');nav=[];LOG.add('info','Uygulama açıldı',{kaynak:APPSRC,tip:ACC.type,ekran:innerWidth+'x'+innerHeight});if(ACC.ui&&+ACC.ui.exp_date){const dl=Math.ceil((+ACC.ui.exp_date*1000-Date.now())/864e5);if(dl<=14)setTimeout(()=>toast('Aboneliğin bitmek üzere',`${dl} gün kaldı.`),1500)}
 if(ST.start===1&&ST.lastCh){render('tv');openLive(reg(ST.lastCh),[ST.lastCh])}else render('home')}


/* =========================================================
   TELEFONLA EŞLEŞTİRME (Supabase + GitHub Pages)
   ========================================================= */
const HELM='<path fill="#e0a028" d="M95 10C66 14 44 40 38 86L36 104L95 113Z"/><path fill="#c98a1c" d="M105 10C134 14 156 40 162 86L164 104L105 113Z"/><path fill="#f2b84a" d="M96 3L104 3L109 113L104 160L100 170L96 160L91 113Z"/><g><path fill="#e0a028" d="M35 109L90 119L90 137L75 147L49 142L35 127Z"/><path fill="#000" d="M49 121L88 130L83 137L54 130Z"/></g><g><path fill="#c98a1c" d="M165 109L110 119L110 137L125 147L151 142L165 127Z"/><path fill="#000" d="M151 121L112 130L117 137L146 130Z"/></g><path fill="#e0a028" d="M33 131L49 146L57 198L51 208L39 186L31 147Z"/><path fill="#c98a1c" d="M167 131L151 146L143 198L149 208L161 186L169 147Z"/><path fill="#f2b84a" d="M62 157L90 148L100 157L110 148L138 157L129 180L110 164L100 170L90 164L71 180Z"/><path fill="#e0a028" d="M59 173L76 171L81 228L68 240Z"/><path fill="#e0a028" d="M80 174L92 176L94 252L83 239Z"/><path fill="#f2b84a" d="M96 177L104 177L104 258L100 268L96 258Z"/><path fill="#c98a1c" d="M108 176L120 174L117 239L106 252Z"/><path fill="#c98a1c" d="M124 171L141 173L132 240L119 228Z"/>';
const APPBASE=((document.currentScript&&document.currentScript.src)||'').replace(/js\/app\.js.*$/,'');
function needQR(cb){if(window.qrcode)return cb();const sc=document.createElement('script');sc.src=APPBASE+'js/qr.js';sc.onload=()=>cb();sc.onerror=()=>cb();document.head.appendChild(sc)}
function qrSvg(text){const q=qrcode(0,'H');q.addData(text);q.make();const n=q.getModuleCount(),L=Math.round(n*.26),o=(n-L)/2;let d='';
 for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))d+=`M${c} ${r}h1v1h-1z`;
 return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><path d="${d}" fill="#0a0d12"/><rect x="${o-.6}" y="${o-.6}" width="${L+1.2}" height="${L+1.2}" rx="${L*.22}" fill="#fff"/><rect x="${o}" y="${o}" width="${L}" height="${L}" rx="${L*.18}" fill="#0a0d12"/><svg x="${o+L*.14}" y="${o+L*.08}" width="${L*.72}" height="${L*.84}" viewBox="0 0 200 270" shape-rendering="geometricPrecision">${HELM}</svg></svg>`}
const CFG=window.RAGNAR_CONFIG||{};
const PAIR={code:null,secret:null,t:null,exp:0,
 ok(){return!!(CFG.supabaseUrl&&CFG.supabaseAnonKey&&CFG.pairPage)},
 async rpc(fn,body){const c=new AbortController(),t=setTimeout(()=>c.abort(),10000);try{const r=await fetch(`${CFG.supabaseUrl.replace(/\/+$/,'')}/rest/v1/rpc/${fn}`,{method:'POST',signal:c.signal,headers:Object.assign({apikey:CFG.supabaseAnonKey,'Content-Type':'application/json'},/^eyJ/.test(CFG.supabaseAnonKey)?{Authorization:'Bearer '+CFG.supabaseAnonKey}:{}),body:JSON.stringify(body)});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(t)}},
 rnd(n){const a=new Uint8Array(n);crypto.getRandomValues(a);return a},
 async start(){this.stop();if(!this.ok()){$('#pair').style.display=$('#lor').style.display='none';return}$('#pair').style.display=$('#lor').style.display='';
  const n=new Uint32Array(this.rnd(4).buffer)[0],code=String(100000+n%900000),secret=[...this.rnd(18)].map(b=>b.toString(16).padStart(2,'0')).join('');
  let created=false;try{created=await this.rpc('ragnar_pair_create',{p_code:code,p_secret:secret})}catch(e){$('#pcode').textContent='––– –––';$('#qr').style.visibility='hidden';$('#pinfo').textContent='Eşleştirme şu an kullanılamıyor. Bilgilerini soldan girebilirsin.';this.t=setTimeout(()=>scr==='login'&&this.start(),30000);return}
  if(scr!=='login')return;if(!created){this.t=setTimeout(()=>this.start(),400);return}
  this.code=code;this.secret=secret;this.exp=Date.now()+9.5*60000;const base=CFG.pairPage.replace(/\/?$/,'/'),url=`${base}?c=${code}`;
  $('#pcode').textContent=code.slice(0,3)+' '+code.slice(3);$('#purl').textContent=base.replace(/^https?:\/\//,'').replace(/\/$/,'');
  $('#pinfo').innerHTML=`Kamera okumazsa <span id="purl">${esc(base.replace(/^https?:\/\//,'').replace(/\/$/,''))}</span> adresine gir, bu kodu yaz:`;
  $('#qr').style.visibility='hidden';needQR(()=>{try{$('#qr').innerHTML=qrSvg(url);$('#qr').style.visibility=''}catch(e){}});
  this.poll()},
 poll(){clearTimeout(this.t);this.t=setTimeout(async()=>{if(scr!=='login'||!this.code)return;if(Date.now()>this.exp)return this.start();
  let p=null;try{p=await this.rpc('ragnar_pair_take',{p_code:this.code,p_secret:this.secret})}catch(e){}
  if(!p||scr!=='login')return this.poll();this.stop();let o={};try{o=JSON.parse(p)}catch(e){}
  $('#in1').value=o.a||'';$('#in2').value=o.u||'';$('#in3').value=o.p||'';let acc;
  try{acc=parseLogin(o.a||'',o.u||'',o.p||'')}catch(e){$('#lerr').textContent='Telefondan gelen bilgi eksikti, tekrar dene.';return this.start()}
  $('#pinfo').textContent='Bilgiler telefondan geldi, liste yükleniyor.';doLogin(acc)},3000)},
 stop(){clearTimeout(this.t);this.t=null;this.code=null}};


/* =========================================================
   HATA RAPORLAMA (Supabase'e, şifreler gizlenerek)
   ========================================================= */
const APPV=(window.RAGNAR_REMOTE&&window.RAGNAR_REMOTE.version)||'1.0.0',APPSRC=window.RAGNAR_SOURCE||'yerel';
const DEV=(()=>{let d=load('rg-dev',null);if(!d){d=Math.random().toString(36).slice(2,8).toUpperCase();save('rg-dev',d)}return d})();
const LOG={q:[],seen:{},n:0,t0:Date.now(),ft:null,
 clean(x){let s=String(x==null?'':x);if(ACC&&ACC.u&&ACC.u.length>2)s=s.split(ACC.u).join('***');if(ACC&&ACC.p&&ACC.p.length>2)s=s.split(ACC.p).join('***');
  return s.replace(/(username|password|pass|token)=[^&\s"']*/gi,'$1=***').replace(/\/(live|movie|series|timeshift)\/[^/\s"']+\/[^/\s"']+\//gi,'/$1/***/***/')},
 add(l,m,c){try{const b=load('rg-logbuf',[]);b.unshift({t:Date.now(),l,m:this.clean(m).slice(0,200)});save('rg-logbuf',b.slice(0,30))}catch(e){}
  if(ST.logs===1||!PAIR.ok())return;m=this.clean(m).slice(0,500);const k=l+'|'+m,now=Date.now();if(this.seen[k]&&now-this.seen[k]<60000)return;this.seen[k]=now;
  if(now-this.t0>60000){this.t0=now;this.n=0}if(++this.n>20)return;
  let cc={};try{cc=c?JSON.parse(this.clean(JSON.stringify(c))):{}}catch(e){}
  this.q.push({l,m,c:Object.assign({ekran:scr,sayfa:cv,tv:isTV,ua:navigator.userAgent.slice(0,140)},cc)});clearTimeout(this.ft);this.ft=setTimeout(()=>this.flush(),4000)},
 async flush(){if(!this.q.length)return;const items=this.q.splice(0,20);try{await PAIR.rpc('ragnar_log',{p_device:DEV,p_ver:APPV,p_items:items})}catch(e){}if(this.q.length)setTimeout(()=>this.flush(),2000)}};
addEventListener('error',e=>LOG.add('error',e.message||'Script hatası',{dosya:String(e.filename||'').split('/').pop(),satir:e.lineno,sutun:e.colno,stack:e.error&&e.error.stack?String(e.error.stack).slice(0,900):''}));
addEventListener('unhandledrejection',e=>{const r=e.reason;LOG.add('error','Promise: '+((r&&r.message)||r),{stack:r&&r.stack?String(r.stack).slice(0,900):''})});

/* =========================================================
   OYNATICI (AVPlay, masaüstünde HTML5 video)
   ========================================================= */
const AV={st:'none',cb:{},url:'',v:null,lt:-1,same:0,buf:false,
 open(url,rect,cb){this.close();this.cb=cb||{};this.url=url;this.lt=-1;this.same=0;this.adv=0;this.buf=false;this.st='open';
  if(isTV){const a=webapis.avplay;try{a.open(url);
   a.setListener({onbufferingstart:()=>{this.buf=true;this.e('buf',true)},onbufferingprogress:()=>{},onbufferingcomplete:()=>{this.buf=false;this.e('buf',false)},oncurrentplaytime:t=>this.e('time',t),onstreamcompleted:()=>this.e('end'),onerror:er=>this.e('error',er),onevent:()=>{},onsubtitlechange:(d,text)=>this.e('sub',text,d),ondrmevent:()=>{}});
   this.rect(rect);const b=[[5,8],[12,16],[2,4]][ST.buf||0];
   try{a.setBufferingParam('PLAYER_BUFFER_FOR_PLAY','PLAYER_BUFFER_SIZE_IN_SECOND',b[0]);a.setBufferingParam('PLAYER_BUFFER_FOR_RESUME','PLAYER_BUFFER_SIZE_IN_SECOND',b[1])}catch(e){}
   try{a.setTimeoutForBuffering(20)}catch(e){}
   try{a.setStreamingProperty('SET_MODE_4K','TRUE')}catch(e){}
   a.prepareAsync(()=>{if(this.url!==url)return;this.st='ready';const go=()=>{try{a.play();this.st='play';this.e('ready')}catch(e){this.e('error',e)}};
    if(this.cb.start>0)a.seekTo(Math.floor(this.cb.start*1000),go,go);else go()},er=>{if(this.url===url)this.e('error',er)})}
   catch(e){this.e('error',e)}}
  else{const v=this.v=$('#hv');this.rect(rect);v.onwaiting=()=>{this.buf=true;this.e('buf',true)};v.onplaying=()=>{this.buf=false;this.e('buf',false)};v.ontimeupdate=()=>this.e('time',v.currentTime*1000);v.onended=()=>this.e('end');v.onerror=()=>this.e('error',v.error);
   v.src=url;v.onloadedmetadata=()=>{if(this.cb.start>0)v.currentTime=this.cb.start;v.play().then(()=>{this.st='play';this.e('ready')}).catch(er=>this.e('error',er))}}},
 e(n,...x){const f=this.cb[n];if(f)try{f(...x)}catch(e){}},
 rect(r){if(isTV){try{webapis.avplay.setDisplayRect(r?r.x:0,r?r.y:0,r?r.w:1920,r?r.h:1080)}catch(e){}}else if(this.v){const s=this.v.style,k=innerWidth/1920;if(r)Object.assign(s,{left:r.x*k+'px',top:r.y*k+'px',width:r.w*k+'px',height:r.h*k+'px'});else Object.assign(s,{left:'0',top:'0',width:'100%',height:'100%'})}},
 play(){try{isTV?webapis.avplay.play():this.v.play();this.st='play'}catch(e){}},
 pause(){try{isTV?webapis.avplay.pause():this.v.pause();this.st='pause'}catch(e){}},
 seek(ms){try{isTV?webapis.avplay.seekTo(Math.floor(ms),()=>{},()=>{}):(this.v.currentTime=ms/1000)}catch(e){}},
 time(){try{return isTV?webapis.avplay.getCurrentTime():this.v.currentTime*1000}catch(e){return 0}},
 dur(){try{return isTV?webapis.avplay.getDuration():(isFinite(this.v.duration)?this.v.duration*1000:0)}catch(e){return 0}},
 tracks(t){if(!isTV)return[];try{return webapis.avplay.getTotalTrackInfo().filter(x=>x.type===t).map(x=>{let o={};const raw=String(x.extra_info||'');try{o=JSON.parse(raw)}catch(e){}let lang=String(o.language||o.track_lang||o.lang||'').toLowerCase();if(!lang){const m=raw.match(/lang(?:uage)?"?\s*[:=]\s*"?([A-Za-z]{2,3})\b/);if(m)lang=m[1].toLowerCase()}if(lang==='und'||lang==='unk'||lang==='zxx')lang='';return{i:x.index,lang,ch:o.channels||'',codec:o.fourCC||'',raw:raw.slice(0,160)}})}catch(e){return[]}},
 sel(t,i){try{webapis.avplay.setSelectTrack(t,i)}catch(e){}if(this.st==='play'&&((scr==='player'&&paused)||(scr==='live'&&lpaused)))try{if(isTV&&webapis.avplay.getState()==='PLAYING')webapis.avplay.pause()}catch(e){}},
 silent(on){try{webapis.avplay.setSilentSubtitle(on)}catch(e){}},
 mode(fit){try{webapis.avplay.setDisplayMethod(fit?'PLAYER_DISPLAY_MODE_LETTER_BOX':'PLAYER_DISPLAY_MODE_FULL_SCREEN')}catch(e){}},
 close(){if(this.st==='none')return;this.url='';try{if(isTV){webapis.avplay.stop();webapis.avplay.close()}else{this.v.pause();this.v.removeAttribute('src');this.v.load()}}catch(e){}this.st='none';this.cb={}},
 suspend(){try{isTV&&this.st!=='none'&&webapis.avplay.suspend()}catch(e){}},restore(){try{isTV&&this.st!=='none'&&webapis.avplay.restore()}catch(e){}}};
const LN={tur:'Türkçe',tr:'Türkçe',eng:'English',en:'English',ger:'Deutsch',deu:'Deutsch',de:'Deutsch',fre:'Français',fra:'Français',fr:'Français',spa:'Español',es:'Español',ita:'Italiano',it:'Italiano',rus:'Русский',ru:'Русский',ara:'العربية',ar:'العربية',
 por:'Português',pt:'Português',nld:'Nederlands',dut:'Nederlands',nl:'Nederlands',pol:'Polski',pl:'Polski',ron:'Română',rum:'Română',ro:'Română',swe:'Svenska',sv:'Svenska',nor:'Norsk',nob:'Norsk',no:'Norsk',dan:'Dansk',da:'Dansk',ces:'Čeština',cze:'Čeština',cs:'Čeština',hun:'Magyar',hu:'Magyar',fin:'Suomi',fi:'Suomi',ind:'Bahasa Indonesia',id:'Bahasa Indonesia',hrv:'Hrvatski',hr:'Hrvatski',
 ukr:'Українська',uk:'Українська',bul:'Български',bg:'Български',srp:'Srpski',sr:'Srpski',ell:'Ελληνικά',gre:'Ελληνικά',el:'Ελληνικά',heb:'עברית',he:'עברית',fas:'فارسی',per:'فارسی',fa:'فارسی',jpn:'日本語',ja:'日本語',kor:'한국어',ko:'한국어',zho:'中文',chi:'中文',zh:'中文',tha:'ไทย',th:'ไทย',hin:'हिन्दी',hi:'हिन्दी',isl:'Íslenska',ice:'Íslenska',est:'Eesti',lit:'Lietuvių',lav:'Latviešu',mkd:'Македонски',mac:'Македонски',msa:'Bahasa Melayu',may:'Bahasa Melayu',slk:'Slovenčina',slo:'Slovenčina',slv:'Slovenščina',vie:'Tiếng Việt',fil:'Filipino',cat:'Català',eus:'Euskara',glg:'Galego',kaz:'Қазақ',aze:'Azərbaycan',sqi:'Shqip',alb:'Shqip',bos:'Bosanski',kur:'Kurdî',urd:'اردو',ben:'বাংলা',tam:'தமிழ்',tel:'తెలుగు'};
const lname=c=>LN[c]||(c?c.toUpperCase():'Bilinmeyen dil');
/* altyazı metninden dil tanıma */
const LANGS=[['tur',/[ğışİ]/g,'bir ve bu ne için değil evet hayır ben sen var yok çok ama mi mı de da şey gibi daha beni seni nasıl neden tamam'],
 ['eng',null,"the you and is it to of that what i'm don't this are was we he she have my your not yes i"],
 ['deu',/[ßä]/g,'und ich nicht das ist du der die ein wir sie es was mit mir dich ja nein auf haben'],
 ['fra',/[éèêàçùœ]/g,"je vous est pas que les une des et le la tu nous ce oui non mais pour dans c'est"],
 ['spa',/[ñ¿¡]/g,'que no es el la los una está de y en por qué sí pero con para lo me te'],
 ['ita',/[ìò]/g,'che non è il per sono una di mi ti ma sì cosa lo con hai ho questo'],
 ['por',/[ãõ]/g,'não você que uma está de e o os para com eu isso sim mas ele ela meu'],
 ['nld',null,'ik het een niet je dat van en de is wat hij ze maar voor met ja nee dit heb'],
 ['pol',/[łżśćęąńź]/g,'nie się to jest że co na ja ty tak jak ale mnie ci dla'],
 ['ron',/[șțăşţ]/g,'nu este și să că ce un eu tu da cu la pe'],
 ['swe',/[å]/g,'och jag inte det är du en att vi har ja nej vad för som'],
 ['nor',/[øæ]/g,'og jeg ikke det er du en at vi har ja nei hva for som'],
 ['dan',/[øæ]/g,'og jeg ikke det er du en at vi har ja nej hvad af som'],
 ['ces',/[řěů]/g,'je to se na že ne co já ty ale jak ano'],
 ['hun',/[őű]/g,'nem és hogy egy az is én te igen de van mit'],
 ['fin',null,'ei on ja että minä sinä se hän mitä niin kyllä ole en olen'],
 ['ind',null,'yang tidak aku kau ini itu dan di apa saya kamu ada dengan untuk'],
 ['hrv',/[đ]/g,'je ne da se što to sam si ja ti ali kako nije']].map(([c,r,w])=>[c,r,w.split(' '),['tur','pol','ces','hun','ron'].indexOf(c)>=0?3:1.5]);
function detectLang(t,n){t=String(t||'').replace(/<[^>]+>/g,' ');const cnt=re=>(t.match(re)||[]).length;
 if(cnt(/[\u0400-\u04FF]/g)>3)return /[їєі]/i.test(t)&&!/[ыэъ]/i.test(t)?'ukr':/[ђћџљњ]/i.test(t)?'srp':/ъ/i.test(t)&&!/[ыэё]/i.test(t)?'bul':'rus';
 if(cnt(/[\u0600-\u06FF]/g)>3)return /[پچژگ]/.test(t)?'fas':'ara';if(cnt(/[\u0590-\u05FF]/g)>3)return'heb';if(cnt(/[\u0370-\u03FF]/g)>3)return'ell';
 if(cnt(/[\u3040-\u30FF]/g)>1)return'jpn';if(cnt(/[\uAC00-\uD7AF]/g)>1)return'kor';if(cnt(/[\u4E00-\u9FFF]/g)>1)return'zho';if(cnt(/[\u0E00-\u0E7F]/g)>3)return'tha';if(cnt(/[\u0900-\u097F]/g)>3)return'hin';
 if(cnt(/[A-Za-z\u00C0-\u024F]/g)<12)return null;const w=' '+t.toLowerCase().replace(/[^a-z\u00C0-\u024F'’]+/g,' ').replace(/’/g,"'")+' ';
 const sc=LANGS.map(([c,r,ws,cw])=>{let v=r?cnt(r)*cw:0;for(const x of ws){let k=-1,q=' '+x+' ';while((k=w.indexOf(q,k+1))>=0)v+=3}return[c,v]}).sort((a,b)=>b[1]-a[1]);
 if(sc[0][1]>=6&&sc[0][1]>=sc[1][1]*1.5)return sc[0][0];if(sc[0][1]>=9&&sc[0][1]>=sc[1][1]*1.3)return sc[0][0];return n>=6&&sc[0][1]>0?sc[0][0]:null}
const pref=k=>PF[k]||(PF[k]={a:null,s:null,size:'m',color:'#fff',bg:'semi',pos:'alt',fit:1,hls:0});
const savePF=()=>save('rg-pf',PF);
(()=>{const ks=Object.keys(PF);if(ks.length>500){ks.slice(0,ks.length-300).forEach(k=>delete PF[k]);savePF()}})();

/* ---------- film ve dizi oynatıcı ---------- */
let PL=null,PK='',paused=false,osdT,hold=0,wT,SK=null,SKT,nxOn=0,nxC=0,TRK={au:[],tx:[]},subT,saveT=0,tryN=0;
function openPlayer(it,start){if(scr!=='player')retSel=cur?selOf(cur):null;PL=it;PK=it.k==='ep'?'s:'+it.sid:'v:'+it.id;miniStop();
 go('player');paused=false;nxOn=0;SK=null;$('#player').classList.add('ui');$('#pt').textContent=clean(it.k==='ep'?it.sname:it.name);
 $('#pe').textContent=it.k==='ep'?`Sezon ${it.season}, Bölüm ${it.num}${epTitle(it)?': '+epTitle(it):''}`:'';$('#beps').style.display='none';
 $('#player').append($('#pan'));hidePan();unf();['#nx','#rs','#perr'].forEach(s=>$(s).classList.remove('on'));$('#sub').style.display='none';$('#player .osd').style.display='none';
 $('#t1').textContent='0:00';$('#t2').textContent='';$('#fl').style.width='0';$('#trk').textContent='';drawPP();
 const h=HIST[it.k+':'+it.id];if(start==null&&hPart(h)){$('#rst').textContent=`${fmt(h.t)} noktasında kalmıştın.`;$('[data-act=rsY]').innerHTML=IC.play+' Kaldığın yerden devam et';$('[data-act=rsY]').dataset.t=h.t;$('#rs').classList.add('on');return focus($('[data-act=rsY]'))}
 startPlay(start||0)}
async function startPlay(t){$('#rs').classList.remove('on');$('#perr').classList.remove('on');unf();tryN=0;loadingOn('player','Yükleniyor');PL.start=t;const me=PL;
 const pr=pref(PK);MKOK=false;if(!pr.mk&&pr.mkx!==2&&isTV){const t0=Date.now(),mk=await MKV.read(API.url(PL));if(PL!==me||scr!=='player')return;
  if(mk&&mk.length){pr.mk=mk;savePF();LOG.add('info','Altyazı dilleri dosyadan okundu',{ms:Date.now()-t0,diller:mk.map(x=>x.lang+(x.forced?'*':'')+(x.sdh?'+':'')).join(' '),kodekler:[...new Set(mk.map(x=>x.codec))].join(' ')})}else{pr.mkx=2;savePF();LOG.add('info','Dosyadan altyazı dili okunamadı',{ms:Date.now()-t0,neden:MKV.why||(mk&&!mk.length?'altyazı parçası yok':'bilinmiyor'),uzanti:PL.ext||''})}}
 AV.open(API.url(PL),null,{start:t,ready:()=>{loadingOff('player');AV.mode(1);applyTracks();wake()},buf:b=>b?loadingOn('player','Arabelleğe alınıyor'):loadingOff('player'),
  time:ms=>{if(SK==null&&$('#player').classList.contains('ui'))drawT(ms/1000)},end:()=>{histSet(PL,AV.dur()/1000,AV.dur()/1000);const n=nextEp();n?openPlayer(n,0):exit()},sub:(tx,d)=>showSub(tx,d),
  error:er=>{loadingOff('player');LOG.add('player','Film/dizi açılamadı: '+((er&&(er.name||er.message||er.code))||(typeof er==='string'?er:'bilinmeyen hata')),{deneme:tryN,tur:PL.k,ad:PL.name,url:API.url(PL),sure:Math.round(AV.time()/1000)});if(tryN++<1){const cb0=AV.cb,at=Math.max(0,AV.time()/1000||PL.start||0);AV.close();loadingOn('player','Yeniden bağlanılıyor');setTimeout(()=>{if(scr==='player')AV.open(API.url(PL),null,Object.assign(cb0,{start:at}))},1500);return}
   $('#perrt').textContent='Sunucu bu içeriği şu an açamadı. İnternet bağlantını kontrol edip tekrar deneyebilirsin. (Kod: '+((er&&(er.name||er.message||er.code))||er||'-')+')';$('#perr').classList.add('on');focus($('[data-act=retry]'))}})}
let TLD={},SC=null,LRN=null,MKN={},MKOK=false;
/* ---- harici altyazı: OpenSubtitles ---- */
const OS_KEY='sk0Yo9XUSwGQmCFwfIBUVST3UIFzpPLm';
const OS={res:null,busy:false,left:null,
 on(){return!!OS_KEY},
 h(){return{'Api-Key':OS_KEY,'X-User-Agent':'Ragnar v'+APPV,'Content-Type':'application/json',Accept:'application/json'}},
 async get(path){const c=new AbortController(),t=setTimeout(()=>c.abort(),9000);try{const r=await fetch('https://api.opensubtitles.com/api/v1'+path,{headers:this.h(),signal:c.signal});if(!r.ok)throw new Error('OpenSubtitles '+r.status);return await r.json()}finally{clearTimeout(t)}},
 async post(path,body){const c=new AbortController(),t=setTimeout(()=>c.abort(),9000);try{const r=await fetch('https://api.opensubtitles.com/api/v1'+path,{method:'POST',headers:this.h(),body:JSON.stringify(body),signal:c.signal});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.message||('OpenSubtitles '+r.status));return j}finally{clearTimeout(t)}},
 iso2(l){return({tur:'tr',eng:'en',deu:'de',fra:'fr',spa:'es',ita:'it',rus:'ru',ara:'ar',por:'pt-PT',nld:'nl',pol:'pl',ron:'ro',swe:'sv',nor:'no',dan:'da',ces:'cs',hun:'hu',fin:'fi',ell:'el',heb:'he',fas:'fa',jpn:'ja',kor:'ko',zho:'zh-CN',bul:'bg',srp:'sr',hrv:'hr',ukr:'uk'})[l]||l},
 async ids(it){const o={};try{if(it.k==='vod'){const j=await API.vodInfo(it.id);const i=(j&&j.info)||{};o.tmdb=i.tmdb_id||i.tmdb||'';o.year=String(i.releasedate||i.release_date||'').slice(0,4)}
   else if(it.k==='ep'){const j=await API.seriesInfo(it.sid);const i=(j&&j.info)||{};o.ptmdb=i.tmdb_id||i.tmdb||''}}catch(e){}return o},
 qname(n){return clean(String(n||'')).replace(/\(\d{4}\).*$/,'').replace(/\b(NF|AMZN|DSNP|HMAX|ATVP|TVBU|4K|FHD|HD|UHD)\b/gi,'').replace(/\s+/g,' ').trim()},
 async search(it,lang){const id=await this.ids(it),L=this.iso2(lang||'tur'),q=new URLSearchParams();q.set('languages',L);q.set('order_by','download_count');
  if(it.k==='ep'){if(id.ptmdb)q.set('parent_tmdb_id',id.ptmdb);else q.set('query',this.qname(it.sname));q.set('season_number',it.season);q.set('episode_number',it.num)}
  else{if(id.tmdb)q.set('tmdb_id',id.tmdb);else{q.set('query',this.qname(it.name));const y=(String(it.name).match(/\((\d{4})\)/)||[])[1]||id.year;if(y)q.set('year',y)}}
  const j=await this.get('/subtitles?'+q.toString());
  return((j&&j.data)||[]).map(d=>{const a=d.attributes||{},f=(a.files||[])[0]||{};return{fid:f.file_id,rel:a.release||f.file_name||'',dl:a.download_count||0,hi:!!a.hearing_impaired,ai:!!(a.ai_translated||a.machine_translated),lang:normLang(a.language)||lang}}).filter(x=>x.fid).sort((a,b)=>(a.ai-b.ai)||(a.hi-b.hi)||(b.dl-a.dl)).slice(0,8)},
 async fetchSub(fid){const ck='rg-os-'+fid;try{const c=localStorage.getItem(ck);if(c)return c}catch(e){}
  const j=await this.post('/download',{file_id:fid,sub_format:'srt'});if(j.remaining!=null)this.left=j.remaining;if(!j.link)throw new Error(j.message||'İndirme bağlantısı alınamadı');
  const r=await fetch(j.link);if(!r.ok)throw new Error('Altyazı dosyası indirilemedi');const tx=await r.text();
  try{const ks=Object.keys(localStorage).filter(k=>k.indexOf('rg-os-')===0);if(ks.length>=4)ks.slice(0,ks.length-3).forEach(k=>localStorage.removeItem(k));localStorage.setItem(ck,tx)}catch(e){}return tx}};
/* SRT / WebVTT çözümleyici */
function parseSrt(t){const out=[],tm=x=>{const m=x.trim().match(/(?:(\d+):)?(\d+):(\d+)[,.](\d+)/);return m?(+(m[1]||0))*3600+(+m[2])*60+(+m[3])+(+m[4])/Math.pow(10,m[4].length):null};
 String(t).replace(/\r/g,'').replace(/^\uFEFF/,'').split(/\n\s*\n/).forEach(b=>{const L=b.split('\n'),i=L.findIndex(x=>x.indexOf('-->')>0);if(i<0)return;const[a,z]=L[i].split('-->');const s=tm(a),e=tm(z);if(s==null||e==null)return;const txt=L.slice(i+1).join('\n').trim();if(txt)out.push({s,e,t:txt})});
 return out.sort((x,y)=>x.s-y.s)}
let EXT=null,EXTT=null;
function extStart(cues,info){extStop();EXT={cues,info,last:-2};AV.silent(true);TRK.cs=-1;scanStop();LRN=null;EXTT=setInterval(extTick,200);trkLabel()}
function extStop(){clearInterval(EXTT);EXTT=null;if(EXT){EXT=null;$('#sub').style.display='none'}}
function extTick(){if(!EXT||scr!=='player')return;const t=AV.time()/1000-(pref(PK).sd||0),C=EXT.cues;let lo=0,hi=C.length-1,k=-1;while(lo<=hi){const m=(lo+hi)>>1;if(C[m].s<=t){k=m;lo=m+1}else hi=m-1}
 const idx=k>=0&&C[k].e>t?k:-1;if(idx===EXT.last)return;EXT.last=idx;subPaint(idx>=0?C[idx].t:'')}
function subPaint(tx){const el=$('#sub'),pr=pref(PK);if(!tx){el.style.display='none';return}
 el.innerHTML=esc(subClean(tx)).replace(/\n/g,'<br>');el.style.display='block';el.className='p-'+pr.pos;el.style.fontSize={s:'22px',m:'28px',l:'36px'}[pr.size];el.style.color=pr.color;
 el.style.background={none:'transparent',semi:'rgba(0,0,0,.55)',box:'#000'}[pr.bg];el.style.textShadow=pr.bg==='none'?'0 2px 6px #000,0 0 2px #000':'none'}
async function osAuto(){const pr=pref(PK);if(!OS.on()||!PL)return;if(pr.os){const me=PL;OS.fetchSub(pr.os).then(tx=>{if(PL!==me)return;const c=parseSrt(tx);if(c.length){extStart(c,{fid:pr.os,lang:wantSub(),rel:''});osd(lname(wantSub())+' altyazı internetten eklendi')}}).catch(()=>osFind(true));return}osFind(true)}
async function osFind(auto){if(!OS.on()||OS.busy||!PL||PL.k==='live')return;OS.busy=true;const me=PL,ws=wantSub(),lang=ws==='off'?'tur':ws;
 try{OS.fb=null;const r=await OS.search(PL,lang);if(PL!==me)return;OS.res=r;LOG.add('info','İnternette altyazı arandı',{dil:lang,sonuc:r.length,otomatik:!!auto});
  if(!r.length&&lang!=='eng'){const r2=await OS.search(PL,'eng');if(PL!==me)return;if(r2.length){OS.res=r2;OS.fb=lang;LOG.add('info','İngilizce yedek altyazı bulundu',{sonuc:r2.length});if(auto)await osUse(r2[0],true);return}}
  if(!r.length){if(!auto)osd('İnternette '+lname(lang)+' altyazı bulunamadı');return}
  if(auto)await osUse(r[0],true)}catch(e){LOG.add('warn','İnternet altyazısı hatası: '+e.message,{});if(!auto)osd('Altyazı aranamadı: '+e.message)}
 finally{OS.busy=false;panRefresh()}}
async function osUse(x,auto){const me=PL;try{const tx=await OS.fetchSub(x.fid);if(PL!==me)return;const c=parseSrt(tx);if(!c.length)throw new Error('Altyazı dosyası okunamadı');
  extStart(c,x);pref(PK).os=x.fid;savePF();osd(lname(x.lang)+' altyazı internetten eklendi'+(OS.left!=null&&OS.left<3?' (bugün '+OS.left+' indirme hakkı kaldı)':''));panRefresh()}
 catch(e){osd('Altyazı indirilemedi: '+e.message);LOG.add('warn','İnternet altyazısı indirilemedi: '+e.message,{})}}

/* MKV dosyasının başındaki parça listesinden altyazı dillerini oku (yayın açılmadan önce, tek kısa istek) */
const MKV={
 why:'',
 async grab(url,range,max){const c=new AbortController(),t=setTimeout(()=>c.abort(),5000);let parts=[],n=0,st=0,ct='';
  try{const r=await fetch(url,{headers:{Range:range},signal:c.signal});st=r.status;ct=(r.headers&&r.headers.get&&r.headers.get('content-type'))||'';if(!r.ok&&st!==206){this.why='HTTP '+st;return null}
   if(r.body&&r.body.getReader){const rd=r.body.getReader();while(n<max){const x=await rd.read();if(x.done)break;parts.push(x.value);n+=x.value.length;
     if(parts.length===1&&x.value.length>=8){const v=x.value;const ebml=v[0]===0x1A&&v[1]===0x45,mp4=String.fromCharCode(v[4],v[5],v[6],v[7])==='ftyp';if(range.indexOf('bytes=0')===0&&!ebml&&!mp4){this.why='biçim '+Array.from(v.subarray(0,8)).map(z=>z.toString(16).padStart(2,'0')).join('')+' '+ct;try{rd.cancel()}catch(e){}return null}}
     if(parts[0]&&parts[0][0]===0x1A&&n>=65536&&parts.length%8===0){const tk=this.parse(this.join(parts,n));if(tk){try{rd.cancel()}catch(e){}return{tk}}}}
    try{rd.cancel()}catch(e){}}else{const ab=new Uint8Array(await r.arrayBuffer());parts=[ab.subarray(0,max)];n=Math.min(max,ab.length)}
   return{b:this.join(parts,n),st}}catch(e){this.why=(e.name==='AbortError'?'zaman aşımı':'ağ hatası')+' ('+n+' bayt)';return null}finally{clearTimeout(t);try{c.abort()}catch(e){}}},
 async read(url){this.why='';if(!url||!/\/(series|movie)\//.test(url)&&!/\.(mkv|webm|mp4|m4v|mov)(\?|$)/i.test(url)){this.why='canlı/uygun değil';return null}
  const h=await this.grab(url,'bytes=0-1048575',1048576);if(!h)return null;if(h.tk)return h.tk;const b=h.b;
  if(b[0]===0x1A&&b[1]===0x45){const tk=this.parse(b);if(!tk)this.why='MKV parça listesi ilk 1 MB içinde değil';return tk}
  const r=MP4.parse(b);if(r&&r.tk)return r.tk;
  if(r&&r.tail){const t=await this.grab(url,'bytes=-4194304',4194304);if(!t)return null;const r2=MP4.scan(t.b);if(r2)return r2;this.why='MP4 moov dosya sonunda bulunamadı';return null}
  this.why='MP4 altyazı parçası yok';return r?[]:null},
 join(parts,n){const b=new Uint8Array(n);let o=0;for(const p of parts){b.set(p.subarray(0,Math.min(p.length,n-o)),o);o+=p.length;if(o>=n)break}return b},
 tryParse(parts,n){if(n<65536||parts.length%8)return null;return this.parse(this.join(parts,n),true)},
 vint(b,i,keep){const x=b[i];if(x===undefined)return null;let l=1,m=0x80;while(l<=8&&!(x&m)){l++;m>>=1}if(l>8||i+l>b.length)return null;let v=keep?x:(x&(m-1));for(let k=1;k<l;k++)v=v*256+b[i+k];
  const unk=!keep&&v===Math.pow(2,7*l)-1;return{v,l,unk}},
 str(b,i,n){let s='';for(let k=0;k<n;k++)s+=String.fromCharCode(b[i+k]);try{return decodeURIComponent(escape(s)).replace(/\0+$/,'')}catch(e){return s.replace(/\0+$/,'')}},
 uint(b,i,n){let v=0;for(let k=0;k<n;k++)v=v*256+b[i+k];return v},
 parse(b,partial){if(b.length<8||b[0]!==0x1A||b[1]!==0x45||b[2]!==0xDF||b[3]!==0xA3)return null;let i=0;
  const el=j=>{const id=this.vint(b,j,true);if(!id)return null;const sz=this.vint(b,j+id.l);if(!sz)return null;return{id:id.v,s:j+id.l+sz.l,e:sz.unk?b.length:j+id.l+sz.l+sz.v,unk:sz.unk}};
  let h=el(0);if(!h)return null;i=h.e;const sg=el(i);if(!sg||sg.id!==0x18538067)return null;i=sg.s;
  while(i<b.length){const x=el(i);if(!x)return null;if(x.id===0x1F43B675)return null;
   if(x.id===0x1654AE6B){if(x.e>b.length)return null;const out=[];let j=x.s;
    while(j<x.e){const te=el(j);if(!te)break;if(te.id===0xAE){const t={type:0,lang:'',bcp:'',name:'',forced:0,def:1,codec:''};let k=te.s;
      while(k<te.e){const f=el(k);if(!f)break;const n=f.e-f.s;
       if(f.id===0x83)t.type=this.uint(b,f.s,n);else if(f.id===0x22B59C)t.lang=this.str(b,f.s,n);else if(f.id===0x22B59D)t.bcp=this.str(b,f.s,n);
       else if(f.id===0x536E)t.name=this.str(b,f.s,n);else if(f.id===0x55AA)t.forced=this.uint(b,f.s,n);else if(f.id===0x88)t.def=this.uint(b,f.s,n);else if(f.id===0x86)t.codec=this.str(b,f.s,n);k=f.e}
      if(t.type===0x11)out.push(t)}j=te.e}
    return out.map(t=>({lang:normLang(t.bcp||t.lang||'eng'),name:t.name,forced:!!t.forced,sdh:/sdh|hearing|cc\b|i[sş]itme|hoh/i.test(t.name),codec:t.codec}))}
   if(x.unk)return null;i=x.e}
  return null}};
const MP4={
 u32(b,i){return((b[i]<<24)>>>0)+(b[i+1]<<16)+(b[i+2]<<8)+b[i+3]},
 typ(b,i){return String.fromCharCode(b[i],b[i+1],b[i+2],b[i+3])},
 kids(b,s,e,cb){let i=s;while(i+8<=e){let sz=this.u32(b,i),hl=8;const t=this.typ(b,i+4);if(sz===1){sz=this.u32(b,i+8)*4294967296+this.u32(b,i+12);hl=16}else if(sz===0)sz=e-i;if(sz<hl)return false;if(cb(t,i+hl,Math.min(e,i+sz),i+sz>e)===false)return false;i+=sz}return true},
 trak(b,s,e){let h='',lang='',el='',nm='';this.kids(b,s,e,(t,a,z)=>{if(t!=='mdia')return;this.kids(b,a,z,(t2,a2,z2)=>{
   if(t2==='hdlr'){h=this.typ(b,a2+8);let k=a2+24,q='';while(k<z2&&b[k])q+=String.fromCharCode(b[k++]);nm=q}
   else if(t2==='mdhd'){const v=b[a2],o=a2+(v===1?32:20),x=(b[o]<<8)|b[o+1];lang=String.fromCharCode(((x>>10)&31)+96,((x>>5)&31)+96,(x&31)+96)}
   else if(t2==='elng'){let k=a2+4,q='';while(k<z2&&b[k])q+=String.fromCharCode(b[k++]);el=q}})});
  return{h,lang:el||lang,nm}},
 moov(b,s,e){const out=[];this.kids(b,s,e,(t,a,z)=>{if(t==='trak'){const r=this.trak(b,a,z);if(['sbtl','subt','text','subp'].indexOf(r.h)>=0)out.push({codec:r.h==='subp'?'subp':'text',lang:normLang(r.lang==='und'?'':r.lang),name:r.nm,forced:/forced|zorunlu/i.test(r.nm),sdh:/sdh|hearing|cc\b/i.test(r.nm)})}});return out},
 parse(b){if(this.typ(b,4)!=='ftyp')return null;let res=null;this.kids(b,0,b.length,(t,a,z,cut)=>{if(t==='moov'){if(cut){res={tail:false,cut:true};return false}res={tk:this.moov(b,a,z)};return false}if(t==='mdat'){res={tail:true};return false}});
  return res&&res.cut?null:res||{tail:true}},
 scan(b){for(let i=4;i+4<b.length;i++){if(b[i]===0x6d&&b[i+1]===0x6f&&b[i+2]===0x6f&&b[i+3]===0x76){const sz=this.u32(b,i-4);if(sz>16&&i-4+sz<=b.length){const tk=this.moov(b,i+4,i-4+sz);return tk}}}return null}};
const normLang=c=>{c=String(c||'').toLowerCase().split(/[-_]/)[0];return({is:'isl',ice:'isl',et:'est',lt:'lit',lv:'lav',mk:'mkd',mac:'mkd',ms:'msa',may:'msa',sk:'slk',slo:'slk',sl:'slv',vi:'vie',ca:'cat',eu:'eus',gl:'glg',kk:'kaz',az:'aze',sq:'sqi',alb:'sqi',bs:'bos',ku:'kur',ur:'urd',bn:'ben',ta:'tam',te:'tel',tr:'tur',en:'eng',de:'deu',ger:'deu',fr:'fra',fre:'fra',es:'spa',it:'ita',ru:'rus',ar:'ara',pt:'por',nl:'nld',dut:'nld',pl:'pol',ro:'ron',rum:'ron',sv:'swe',no:'nor',nob:'nor',da:'dan',cs:'ces',cze:'ces',hu:'hun',fi:'fin',id:'ind',hr:'hrv',uk:'ukr',bg:'bul',sr:'srp',el:'ell',gre:'ell',he:'heb',fa:'fas',per:'fas',ja:'jpn',ko:'kor',zh:'zho',chi:'zho',th:'tha',hi:'hin'})[c]||(c==='und'?'':c)};
const tlang=x=>x?(x.lang||TLD[x.i]||''):'';
const tname=(x,j)=>{const l=tlang(x);if(!l)return'Altyazı '+(j+1);const m=MKN[x.i];if(m&&(m.forced||m.sdh))return lname(l)+(m.forced?' (yalnız yabancı konuşmalar)':' (işitme engelli)');const same=TRK.tx.filter(y=>lname(tlang(y))===lname(l)&&!(MKN[y.i]&&(MKN[y.i].forced||MKN[y.i].sdh)));const k=same.indexOf(x);return lname(l)+(same.length>1&&k>0?' '+(k+1):'')};
const wantSub=()=>{const pr=pref(PK);return pr.s||['tur','off','eng'][ST.sub||0]};
function applyTracks(){extStop();OS.res=null;const pr=pref(PK),au=AV.tracks('AUDIO'),tx=AV.tracks('TEXT');TRK={au,tx,ca:au[0]?au[0].i:-1,cs:-1};scanStop();LRN=null;if(pr.tlv!==2){delete pr.tl;pr.tlv=2}TLD=Object.assign({},pr.tl||{});MKN={};MKOK=false;
 if(pr.mk&&tx.length){const txt=pr.mk.filter(m=>!m.codec||/^S_TEXT|^tx3g|^wvtt|^text|^stpp/i.test(m.codec)),L=pr.mk.length===tx.length?pr.mk:txt.length===tx.length?txt:null;
  if(L){TLD={};tx.forEach((x,j)=>{const m=L[j];if(m.lang)TLD[x.i]=m.lang;MKN[x.i]=m});MKOK=tx.every(x=>!!tlang(x))}
  else{LOG.add('warn','Altyazı sayısı tutmadı',{dosyada:pr.mk.length,metin:txt.length,tv:tx.length,kodekler:[...new Set(pr.mk.map(m=>m.codec))].join(' ')});delete pr.mk;delete pr.mkx;savePF()}}
 if(au.length||tx.length)LOG.add('info','Parçalar: '+clean(PL.k==='ep'?PL.sname:PL.name),{ses:au.map(x=>x.raw).join(' | ').slice(0,700),altyazi:tx.map(x=>x.raw).join(' | ').slice(0,1200)});
 const want=pr.a||(ST.aud?null:'tur');const ta=want&&au.find(x=>lname(x.lang)===lname(want));if(ta){AV.sel('AUDIO',ta.i);TRK.ca=ta.i}
 const ws=wantSub(),same=ws!=='off'?tx.filter(x=>tlang(x)&&lname(tlang(x))===lname(ws)):[];const ts=same.find(x=>!(MKN[x.i]&&(MKN[x.i].forced||MKN[x.i].sdh)))||same[0];
 if(ts){AV.silent(false);AV.sel('TEXT',ts.i);TRK.cs=ts.i;if(!ts.lang)LRN={i:ts.i,txt:'',n:0,verify:ws}}
 else{AV.silent(true);if(tx.some(x=>!tlang(x)))scanStart(ws==='off'?null:ws);else if(ws!=='off')osAuto()}
 trkLabel()}
function trkLabel(){const a=TRK.au.find(x=>x.i===TRK.ca),j=TRK.tx.findIndex(x=>x.i===TRK.cs);$('#trk').textContent=`${a?lname(a.lang)+' ses':'Varsayılan ses'}, ${EXT?lname(EXT.info.lang)+' altyazı (internet)':SC?'altyazı dilleri tanınıyor':j>=0?tname(TRK.tx[j],j)+' altyazı':'altyazı kapalı'}`}
/* dili yazmayan altyazıları sırayla dinleyip tanı; istenen dil bulununca onu aç */
function scanStart(want,restore,pan){scanStop();const q=TRK.tx.filter(x=>!tlang(x)).map(x=>x.i);if(!q.length)return;SC={q,want:want||null,restore:restore==null?-1:restore,pan:pan?1:0,miss:0,cur:-1,txt:'',n:0,t:null,t0:Date.now()};$('#sub').style.display='none';AV.silent(false);scanNext();trkLabel()}
function panRefresh(){if(scr==='player'&&!$('#pan').classList.contains('hide')&&!panLive){const f=cur&&cur.dataset.k?`#pan [data-k="${cur.dataset.k}"][data-v="${cur.dataset.v}"]`:null;drawPan();focus((f&&$(f))||$('#pan [data-f]'))}}
function scanNext(timeout){if(!SC)return;clearTimeout(SC.t);if(paused&&scr==='player')return;if(timeout===true&&SC.cur>=0&&!TLD[SC.cur]&&SC.miss<TRK.tx.length*2){SC.miss++;SC.q.push(SC.cur)}if(!SC.q.length)return scanEnd(SC.restore);SC.prev=SC.lastTx||'';SC.cur=SC.q.shift();SC.txt='';SC.n=0;SC.seen={};SC.sw=Date.now();AV.sel('TEXT',SC.cur);SC.t=setTimeout(()=>scanNext(true),SC.pan?6000:9000);panRefresh()}
function scanEnd(sel){const c=SC;if(!c)return;clearTimeout(c.t);SC=null;if(c.want&&!c.pan&&sel===c.restore&&!TRK.tx.some(x=>lname(tlang(x))===lname(c.want)))setTimeout(osAuto,300);LOG.add('info','Altyazı dilleri: '+TRK.tx.map((x,j)=>(j+1)+'='+(tlang(x)||'?')).join(' '),{sure_sn:Math.round((Date.now()-(c.t0||Date.now()))/1000)});const t=TRK.tx.find(x=>x.i===sel);if(t){AV.silent(false);AV.sel('TEXT',t.i);TRK.cs=t.i}else{AV.silent(true);TRK.cs=-1;$('#sub').style.display='none'}
 pref(PK).tl=Object.assign({},TLD);savePF();trkLabel();panRefresh()}
function scanStop(){if(SC){clearTimeout(SC.t);SC=null}}
function subLearn(tx){tx=tx&&subClean(tx);if(SC){if(!tx)return true;const nt=String(tx).trim();if(Date.now()-(SC.sw||0)<1200||nt===SC.prev||(SC.seen&&SC.seen[nt]))return true;SC.seen=SC.seen||{};SC.seen[nt]=1;SC.txt+=' '+tx;SC.n++;const g=detectLang(SC.txt,SC.n);if(g){TLD[SC.cur]=g;if(SC.want&&lname(g)===lname(SC.want)){const i=SC.cur;scanEnd(i);osd(lname(g)+' altyazı bulundu')}else scanNext()}return true}
 if(LRN&&tx&&LRN.i===TRK.cs){LRN.txt+=' '+tx;LRN.n++;const g=detectLang(LRN.txt,LRN.n);if(g){const L=LRN;LRN=null;TLD[L.i]=g;if(L.setPref)pref(PK).s=g;pref(PK).tl=Object.assign({},TLD);savePF();trkLabel();
   if(L.verify&&lname(g)!==lname(L.verify)){$('#sub').style.display='none';AV.silent(true);TRK.cs=-1;scanStart(L.verify);return true}}}
 return false}
const subClean=t=>String(t||'').replace(/\{\\[^}]*\}/g,'').replace(/\\[Nn]/g,'\n').replace(/\\h/g,' ').replace(/<[^>]+>/g,'').trim();
function showSub(tx,d){if(SC&&tx)SC.lastTx=String(tx).trim();if(scr==='player'&&subLearn(tx))return;if(EXT||TRK.cs<0)return;const sd=scr==='player'?(pref(PK).sd||0):0;if(sd>0){setTimeout(()=>{if(!EXT&&TRK.cs>=0)showSub0(tx,d)},sd*1000);return}showSub0(tx,d)}
function showSub0(tx,d){const el=$('#sub'),pr=pref(PK);clearTimeout(subT);if(!tx){el.style.display='none';return}
 el.innerHTML=esc(subClean(tx)).replace(/\n/g,'<br>');el.style.display='block';el.className='p-'+pr.pos;el.style.fontSize={s:'22px',m:'28px',l:'36px'}[pr.size];el.style.color=pr.color;
 el.style.background={none:'transparent',semi:'rgba(0,0,0,.55)',box:'#000'}[pr.bg];el.style.textShadow=pr.bg==='none'?'0 2px 6px #000,0 0 2px #000':'none';subT=setTimeout(()=>el.style.display='none',Math.max(1200,+d||3000))}
function drawT(t){const d=AV.dur()/1000;$('#t1').textContent=fmt(t);$('#t2').textContent=d?fmt(d):'';$('#fl').style.width=d?Math.min(100,t/d*100)+'%':'0'}
function drawPP(){$('#bpp').innerHTML=paused?IC.play+' Devam':IC.pause+' Durdur'}
function osd(t,keep){const o=$('#'+scr+' .osd');if(!o)return;o.innerHTML=t;o.classList.toggle('ic',/^\s*<svg/.test(t));o.style.display='block';clearTimeout(osdT);if(!keep)osdT=setTimeout(()=>o.style.display='none',1100)}
function loadingOn(s,t){const l=$('#'+s+' .ld');l.querySelector('span').textContent=t||'';l.classList.add('on')}
function loadingOff(s){$('#'+s+' .ld').classList.remove('on')}
function wake(){if(!$('#player').classList.contains('ui')&&SK==null&&PL&&AV.st!=='none')drawT(AV.time()/1000);$('#player').classList.add('ui');clearTimeout(wT);wT=setTimeout(()=>{if(scr==='player'&&!paused&&$('#pan').classList.contains('hide')&&!cur&&!$('#player .ov.on'))$('#player').classList.remove('ui')},4000)}
function pause(){if(AV.st==='none')return;paused=!paused;paused?AV.pause():AV.play();if(SC){if(paused)clearTimeout(SC.t);else{SC.sw=Date.now();SC.t=setTimeout(()=>scanNext(true),9000)}}osd(paused?IC.pause:IC.play,paused);drawPP();wake();if(paused)histSet(PL,AV.time()/1000,AV.dur()/1000)}
function seek(st){const d=AV.dur()/1000;if(!d)return osd('Bu içerikte sarma yok');if(SK==null)SK=AV.time()/1000;SK=Math.max(0,Math.min(d-2,SK+st));drawT(SK);osd(fmt(SK),paused);
 clearTimeout(SKT);SKT=setTimeout(()=>{AV.seek(SK*1000);SK=null},700)}
function nextEp(){if(!PL||PL.k!=='ep')return null;const i=EPS.findIndex(e=>e.id===PL.id);return i>=0?EPS[i+1]||null:null}
function prevEp(){if(!PL||PL.k!=='ep')return null;const i=EPS.findIndex(e=>e.id===PL.id);return i>0?EPS[i-1]:null}
function showNext(){nxOn=1;const n=nextEp();if(!n)return;nxC=10;$('#nxt').textContent=`S${n.season}:B${n.num}, ${n.name}`;$('#nxc').textContent='10 sn içinde başlıyor';$('#nx').classList.add('on');wake();focus($('[data-act=nxY]'))}
function playNext(){const n=nextEp();$('#nx').classList.remove('on');if(n){histSet(PL,AV.dur()/1000,AV.dur()/1000);openPlayer(n,0)}}
async function ensureEps(it){if(it.k!=='ep'||EPS.some(e=>e.id===it.id))return;try{const j=await API.seriesInfo(it.sid),E=j.episodes||{};EPS=[];Object.keys(E).sort((a,b)=>a-b).forEach(s=>(E[s]||[]).forEach(e=>EPS.push({k:'ep',id:String(e.id),ext:e.container_extension||'mp4',name:e.title||('Bölüm '+e.episode_num),season:+s,num:+e.episode_num||0,sid:it.sid,sname:it.sname,scover:it.scover,icon:(e.info&&e.info.movie_image)||it.scover,plot:(e.info&&e.info.plot)||''})))}catch(e){}}

/* ---------- ses/altyazı ve kanal ayarları paneli ---------- */
let panLive=false,SLEEP=null;
function openPan(){panLive=scr==='live';$('#'+scr).append($('#pan'));if(!panLive&&!SC&&TRK.tx.some(x=>!tlang(x)))scanStart(null,TRK.cs,1);drawPan();$('#pan').classList.remove('hide');clearTimeout(hideT);focus($('#pan .sel')||$('#pan [data-f]'))}
function panLeftClose(){if(!cur||!cur.closest('#pan'))return false;const g=cur.parentElement;if(g&&g.classList.contains('opts')){let p=cur.previousElementSibling;while(p&&!p.hasAttribute('data-f'))p=p.previousElementSibling;if(p)return false}
 if(scr==='live'){hidePan();return focus($('[data-act=lset]')),true}hidePan();unf();return true}
function hidePan(){$('#pan').classList.add('hide');if(SC&&SC.pan)scanEnd(SC.restore)}
function drawPan(){const k=panLive?'l:'+LV.id:PK,pr=pref(k),au=TRK.au,tx=TRK.tx;let g=[];
 g.push(['Ses','audio',au.length?au.map(x=>[x.i,lname(x.lang),[x.codec,x.ch?x.ch+' kanal':''].filter(Boolean).join(', ')]):[[-1,'Varsayılan','Yayında tek ses var']],TRK.ca]);
 const subNote=!panLive&&!MKOK&&!EXT&&tx.some(x=>!tlang(x));
 g.push([subNote?'Altyazı<small class="pnote">Altyazıların dilini tanımak için ekranda konuşma geçmesi gerekiyor; adlar izledikçe dolar.</small>':'Altyazı','sub',[[-1,'Kapalı'],...tx.map((x,j)=>[x.i,panLive?(x.lang?lname(x.lang):'Altyazı '+(j+1)):tname(x,j)+(SC&&!tlang(x)?' (tanınıyor)':'')])],SC?SC.restore:TRK.cs]);
 if(!panLive&&OS.on()){const R=OS.res;g.push(['İnternetten altyazı'+(OS.busy?'<small class="pnote">Aranıyor…</small>':R&&!R.length?'<small class="pnote">Bu içerik için bulunamadı.</small>':OS.fb?'<small class="pnote">'+lname(OS.fb)+' bulunamadı, İngilizce seçenekler gösteriliyor.</small>':''),'os',R&&R.length?R.map(x=>[x.fid,lname(x.lang)+(x.hi?' (işitme engelli)':'')+(x.ai?' (makine çevirisi)':''),(x.rel||'').slice(0,46)+' · '+x.dl+' indirme']):[['find',OS.busy?'Aranıyor…':(lname(wantSub()==='off'?'tur':wantSub())+' altyazı ara')]],EXT?EXT.info.fid:null])}
 if(!panLive){const sd=pref(PK).sd||0;g.push(['Altyazı zamanlaması<small class="pnote">Şu an: '+(sd>0?'+':'')+sd.toFixed(1)+' sn'+(sd?(sd>0?' (geç gösteriliyor)':' (erken gösteriliyor)'):'')+'</small>','sd',[['-0.5','− 0,5 sn'],['0','Sıfırla'],['0.5','+ 0,5 sn']],null])}
 if(!panLive){g.push(['Boyut','size',[['s','Küçük'],['m','Orta'],['l','Büyük']],pr.size],['Renk','color',[['#fff'],['#ffd84a'],['#7fdcff'],['#b6f08a']],pr.color],['Arka plan','bg',[['none','Yok'],['semi','Yarı saydam'],['box','Kutu']],pr.bg],['Konum','pos',[['alt','Alt'],['mid','Yukarı'],['top','Üst']],pr.pos])}
 else g.push(['Görüntü','fit',[[1,'Sığdır'],[0,'Doldur']],pr.fit],['Akış türü','hls',[[0,'TS'],[1,'HLS']],pr.hls],['Uyku zamanlayıcısı','sleep',[[0,'Kapalı'],[30,'30 dk'],[60,'60 dk'],[90,'90 dk']],ST.sleepSel||0],['Favori kanal','fav',[[0,'Favori değil'],[1,'Favorilerde']],isFav(LV.id)?1:0]);
 $('#pan').innerHTML=`<div class="btn sm" data-f data-act="panx" style="float:right">Kapat</div><h2>${panLive?'Kanal ayarları':'Ses ve altyazı'}</h2><small>Seçimlerin bu ${panLive?'kanal':PL&&PL.k==='ep'?'dizi':'film'} için hatırlanır</small>`+g.map(([t,k,o,sel])=>`<div class="lbl">${t}</div><div class="${k==='audio'||k==='os'||k==='sub'&&o.length>3?'':'opts'}">${o.map(x=>{const s=String(x[0])===String(sel)?' sel':'';
  return k==='audio'||k==='os'&&x[2]?`<div class="op au${s}" data-f data-k="${k}" data-v="${x[0]}"><span>${esc(x[1])}</span><small>${esc(x[2]||'')}</small></div>`:k==='color'?`<div class="op sw${s}" data-f data-k="${k}" data-v="${x[0]}" style="background:${x[0]}"></div>`:`<div class="op${s}${k==='sub'&&o.length>3?' au':''}" data-f data-k="${k}" data-v="${x[0]}">${esc(x[1])}</div>`}).join('')}</div>`).join('')}
function pick(k,v){const pk=panLive?'l:'+LV.id:PK,pr=pref(pk);
 if(k==='audio'){const t=TRK.au.find(x=>String(x.i)===v);if(t){AV.sel('AUDIO',t.i);TRK.ca=t.i;pr.a=t.lang}}
 else if(k==='os'){if(v==='find'){osFind(false);drawPan();return focus($('#pan [data-k="os"]'))}const x=(OS.res||[]).find(r=>String(r.fid)===v);if(x)osUse(x,false);return}
 else if(k==='sd'){const was=pr.sd||0;let n=v==='0'?0:Math.round((was+(+v))*10)/10;n=Math.max(-10,Math.min(10,n));if(n<0&&!EXT){osd('Dosyadaki altyazı yalnızca geciktirilebilir; öne almak internet altyazısında çalışır');n=0}pr.sd=n;if(EXT)EXT.last=-2;savePF();drawPan();return focus($(`#pan [data-k="sd"][data-v="${v}"]`))}
 else if(k==='sub'){extStop();pr.os=null;scanStop();LRN=null;if(v==='-1'){AV.silent(true);TRK.cs=-1;pr.s='off';$('#sub').style.display='none'}else{const t=TRK.tx.find(x=>String(x.i)===v);if(t){AV.silent(false);AV.sel('TEXT',t.i);TRK.cs=t.i;if(panLive)pr.s=t.lang;else{const l=tlang(t);if(l)pr.s=l;else LRN={i:t.i,txt:'',n:0,setPref:1}}}}}
 else if(k==='fit'){pr.fit=+v;AV.mode(+v===1)}
 else if(k==='hls'){pr.hls=+v;savePF();drawPan();tuneLive(LV,true);return focus($(`#pan [data-k="${k}"][data-v="${v}"]`))}
 else if(k==='sleep'){ST.sleepSel=+v;clearTimeout(SLEEP);if(+v)SLEEP=setTimeout(()=>{exit();toast('Uyku zamanlayıcısı','Yayın kapatıldı.')},+v*60000)}
 else if(k==='fav'){favToggle(LV);favDraw()}
 else pr[k]=v;
 savePF();if(!panLive)trkLabel();drawPan();focus($(`#pan [data-k="${k}"][data-v="${v}"]`))}

const skMark=()=>$('#player').classList.toggle('sk',!cur);
function pKey(e,m,b,cu,cd,pp,ff,rw){wake();setTimeout(skMark,0);const pan=!$('#pan').classList.contains('hide'),ov=$('#player .ov.on'),nx=$('#nx').classList.contains('on');
 if(b){if(pan){hidePan();return unf()}if(nx){$('#nx').classList.remove('on');return unf()}if(cur&&!ov)return unf();histSet(PL,AV.time()/1000,AV.dur()/1000);return exit()}
 if(pan&&!ov&&m==='l'&&panLeftClose())return;
 if(pan||ov){if(m)move(m);else if(e.keyCode===13)ok(cur);return}
 if(pp)return pause();if(ff||rw)return seek(ff?30:-30);
 if(cu||cd){const n=cu?nextEp():prevEp();if(n){histSet(PL,AV.time()/1000,AV.dur()/1000);return openPlayer(n,0)}return osd(PL.k!=='ep'?'Film':cu?'Son bölüm':'İlk bölüm')}
 if(cur){if(m){const bot=cur.closest('.cbot'),top=cur.closest('.ctop');if((m==='u'&&bot)||(m==='d'&&top)){unf();return skMark()}if((m==='u'&&top)||(m==='d'&&bot))return;move(m);return}if(e.keyCode===13)return ok(cur)}
 if(m==='l'||m==='r'){if(!e.repeat)hold=0;hold++;const st=hold<5?10:hold<15?30:60;return seek(m==='r'?st:-st)}
 if(m==='u')return focus($('#player [data-act=back]'));
 if(m==='d'||e.keyCode===13)return focus($('#bpp'))}

/* ---------- canlı tv ---------- */
let LV=null,prevLV=null,hideT,lag=0,lpaused=false,pausedAt=0,LGT,LEPG=[],ltry=0;
function openLive(key,ctx){const it=REG.get(key);if(!it)return;const hadMini=scr==='app'&&AV.st!=='none';if(scr!=='live')retSel=cur?selOf(cur):null;if(ctx)CTX=ctx;else if(!CTX.some(c=>c.id===it.id))CTX=[it];
 miniStop();go('live');$('#live').append($('#pan'));hidePan();$('#epg').classList.remove('on');$('#lerr2').classList.remove('on');unf();
 if(hadMini){LV=null;liveDraw0(it);setTimeout(()=>tuneLive(it),900)}else tuneLive(it)}
function liveDraw0(it){LV=it;liveDraw();loadingOn('live','')}
function tuneLive(it,force){if(!it)return;if(!LV||LV.id!==it.id)LREC=[];if(LV&&LV.id!==it.id)prevLV=LV;LV=it;lag=0;lpaused=false;ltry=0;ST.lastCh=it;saveST();liveDraw();clearTimeout(tuneLive.t);AV.close();loadingOn('live','');tuneLive.t=setTimeout(()=>{if(LV===it)liveOpen(force)},250)}
const fmtKey=()=>'fmt_'+((ACC&&ACC.srv)||'');let LREC=[];
function recOK(){const n=Date.now();LREC=LREC.filter(t=>n-t<300000);if(LREC.length>=2)return false;LREC.push(n);return true}
const erTx=er=>(er&&(er.name||er.message||er.code))||(typeof er==='string'?er:'bilinmeyen hata');
function liveFail(it,er){loadingOff('live');$('#lerrt').textContent=`${clean(it.name)} şu an açılamıyor. Kanal yayında olmayabilir ya da sunucu yoğun olabilir. (Kod: ${erTx(er)})`;$('#lerr2').classList.add('on');focus($('[data-act=lretry]'))}
function liveOpen(){const it=LV,pr=pref('l:'+it.id);$('#lerr2').classList.remove('on');loadingOn('live','');TRK={au:[],tx:[],ca:-1,cs:-1};
 const arch=lag>0&&it.arch,pf=pr.hls===1||ST[fmtKey()]==='m3u8',alt=ltry===1?!pf:pf,url=arch?API.tsUrl(it,Date.now()-lag*1000,Math.max(60,Math.ceil(lag/60)+30)):API.url(it,alt),t0=Date.now();let ready=false;
 AV.open(url,null,{ready:()=>{ready=true;loadingOff('live');AV.mode(pr.fit!==0);const au=AV.tracks('AUDIO'),tx=AV.tracks('TEXT');TRK={au,tx,ca:au[0]?au[0].i:-1,cs:-1};const w=pr.a&&au.find(x=>lname(x.lang)===lname(pr.a));if(w){AV.sel('AUDIO',w.i);TRK.ca=w.i}AV.silent(true);
   if(!arch&&!it.url&&ltry===1){ST[fmtKey()]=alt?'m3u8':'ts';saveST()}
   LOG.add('info','Kanal açıldı: '+clean(it.name),{ms:Date.now()-t0,bicim:arch?'arsiv':alt?'m3u8':'ts',deneme:ltry})},
  buf:b=>b?loadingOn('live','Arabelleğe alınıyor'):loadingOff('live'),
  error:er=>{if(LV!==it)return;LOG.add('player','Canlı yayın hatası ('+clean(it.name)+'): '+erTx(er),{deneme:ltry,acildi:ready,ms:Date.now()-t0,bicim:alt?'m3u8':'ts',url:url,arsiv:arch});AV.close();
   if(ready){if(recOK()){loadingOn('live','Yeniden bağlanılıyor');setTimeout(()=>{if(LV===it)liveOpen()},1500);return}return liveFail(it,er)}
   if(ltry<1&&!arch&&!it.url){ltry=1;loadingOn('live','Diğer yayın biçimi deneniyor');setTimeout(()=>{if(LV===it)liveOpen()},1200);return}
   liveFail(it,er)}})}
function zap(d){const L=CTX.length?CTX:[LV];let p=L.findIndex(c=>c.id===LV.id);if(p<0)p=0;tuneLive(L[(p+d+L.length)%L.length])}
function liveDraw(){const L=CTX.length?CTX:[LV],n=L.length,p=Math.max(0,L.findIndex(c=>c.id===LV.id));
 $('#strip').innerHTML=(n>1?[2,1,0,-1,-2]:[0]).map(o=>{const c=L[(p+o+n*5)%n];return`<div class="chi${o?'':' cur'}" data-key="${reg(c)}"><span>${c.num||''}</span>${esc(clean(c.name))}</div>`}).join('');
 $('#bn').innerHTML=img(LV.icon)||String(LV.num||'');favDraw();$('#bt').textContent=(isFav(LV.id)?'★ ':'')+clean(LV.name);$('#lvl').textContent='';
 $('#bnow').textContent='…';$('#bnowt').textContent='';$('#bnext').textContent='';$('#bp').style.width='0';drawLag();showBand();const it=LV;
 LEPG=[];clearTimeout(liveDraw.t);liveDraw.t=setTimeout(()=>API.epg(it.id,4).then(ep=>{if(LV!==it)return;LEPG=ep;bandEpg()}).catch(()=>{}),800)}
function bandEpg(){const t=Date.now()-lag*1000,n=LEPG.find(e=>e.s<=t&&e.e>t),x=LEPG.find(e=>e.s>t);
 $('#bnow').textContent=n?n.title:'Program bilgisi yok';$('#bnowt').textContent=n?`${hhmm(n.s)} – ${hhmm(n.e)}`:'';$('#bp').style.width=n?Math.min(100,(t-n.s)/(n.e-n.s)*100)+'%':'0';$('#bnext').textContent=x?`${x.title}, ${hhmm(x.s)}`:'–'}
function showBand(){$$('#live .lf').forEach(x=>x.classList.remove('fade'));clearTimeout(hideT);hideT=setTimeout(()=>{if(!cur&&!lpaused)$$('#live .lf').forEach(x=>x.classList.add('fade'))},5000)}
function drawLag(){const b=$('#blag');b.textContent=lag?'−'+fmt(lag)+' geride':'● Canlı';b.classList.toggle('on',!lag);$('#lpp').innerHTML=lpaused?IC.play:IC.pause}
function lpause(){if(!lpaused){AV.pause();lpaused=true;pausedAt=Date.now();osd(IC.pause,true)}else{lpaused=false;const gone=(Date.now()-pausedAt)/1000;osd(IC.play);
  if(LV.arch&&gone>20){lag+=Math.round(gone);liveOpen()}else AV.play()}drawLag();showBand()}
function liveSeek(st){if(!LV.arch)return osd('Bu kanalda geri sarma yok');lag=Math.max(0,Math.min((LV.archD||1)*86400,lag+st));drawLag();showBand();bandEpg();osd(lag?'−'+fmt(lag):'● Canlı',lpaused);
 clearTimeout(LGT);LGT=setTimeout(()=>{lpaused=false;liveOpen()},900)}
function liveBack(){if(!$('#pan').classList.contains('hide')){hidePan();return focus($('[data-act=lset]'))}if($('#epg').classList.contains('on'))return closeEpg();const vis=$$('#live .lf').some(x=>!x.classList.contains('fade'));if(!$('#lerr2').classList.contains('on')&&(cur||vis)){unf();clearTimeout(hideT);if(!lpaused)$$('#live .lf').forEach(x=>x.classList.add('fade'));return}exit()}
function lKey(e,m,b,cu,cd,pp,ff,rw){const epg=$('#epg').classList.contains('on'),pan=!$('#pan').classList.contains('hide'),ov=$('#lerr2').classList.contains('on');
 if(b)return liveBack();
 if((cu||cd)&&!ov)return zap(cu?1:-1);if(pp&&!ov)return lpause();
 if(!epg&&!pan&&!ov&&cur&&cur.closest('#band')&&m==='u'){unf();showBand();return}
 if(pan&&!ov&&m==='l'&&panLeftClose())return;
 if(epg||pan||ov||(cur&&cur.closest('#band'))){if(!epg)showBand();if(m)move(m);else if(e.keyCode===13)ok(cur);return}
 if(pp)return lpause();if(cu||cd)return zap(cu?1:-1);if(ff||rw)return liveSeek(rw?60:-60);
 if(m==='u'||m==='d'){showBand();if(m==='d')focus($('[data-act=epg]'));return}
 if(m){if(!e.repeat)hold=0;hold++;const st=hold<5?10:hold<15?30:60;return liveSeek(m==='l'?st:-st)}
 if(e.keyCode===13){showBand();focus($('[data-act=epg]'))}}

/* ---------- tv rehberi ---------- */
async function openEpg(sel){const L=CTX.length?CTX:[LV],p=Math.max(0,L.findIndex(c=>c.id===LV.id)),rows=L.slice(Math.max(0,p-4),p+8),now=Date.now(),ws=now-90*60000,span=240*60000,W=960;
 const x=ms=>Math.max(0,Math.min(W,(ms-ws)/span*W));
 let h=`<div class="eh"><h2>TV rehberi</h2><div style="display:flex;gap:18px;align-items:center"><span class="hk3">${IC.re} geçmiş: arşivden izle</span><span class="hk3">${IC.bell} gelecek: hatırlat</span><div class="btn sm" data-f data-act="epgx">Kapat</div></div></div><div class="hd2">`;
 for(let t=Math.ceil(ws/1800000)*1800000;t<ws+span;t+=1800000)h+=`<span style="left:${x(t)}px">${hhmm(t)}</span>`;
 h+=`</div>`+rows.map(c=>`<div class="er" data-row="${esc(c.id)}"><div class="nm"><span>${c.num||''}</span>${esc(clean(c.name))}</div><div class="tlw"><div class="nowl" style="left:${x(now)}px"></div><div class="pgm now" data-f data-act="tune" data-key="${reg(c)}" style="left:0;width:${W}px">Yükleniyor…</div></div></div>`).join('');
 $('#epg').innerHTML=h;$('#epg').classList.add('on');clearTimeout(hideT);focus((sel&&$('#epg '+sel))||$(`#epg [data-row="${LV.id}"] [data-f]`));
 for(let i=0;i<rows.length;i+=4)await Promise.all(rows.slice(i,i+4).map(async c=>{if(!$('#epg').classList.contains('on'))return;const ep=await API.epg(c.id,10);const box=$(`#epg [data-row="${c.id}"] .tlw`);if(!box||!$('#epg').classList.contains('on'))return;
  const k=reg(c),vis=ep.filter(e=>e.e>ws&&e.s<ws+span),wasF=cur&&box.contains(cur);
  if(!vis.length)return;box.innerHTML=`<div class="nowl" style="left:${x(now)}px"></div>`+vis.map(e=>{const past=e.e<=now,nw=e.s<=now&&e.e>now,rk=c.id+'@'+e.s,rm=REM.some(r=>r.rk===rk);
   const act=past?`data-act="catch" data-s="${e.s}" data-e="${e.e}"`:nw?'data-act="tune"':`data-act="remind" data-rk="${rk}" data-s="${e.s}" data-t="${esc(e.title)}"`;
   return`<div class="pgm ${past?'past':nw?'now':'next'}" data-f ${act} data-key="${k}" style="left:${x(e.s)}px;width:${Math.max(4,x(e.e)-x(e.s)-4)}px">${past&&c.arch?IC.re:''}${rm?IC.bell:''}${esc(e.title)}<small>${hhmm(e.s)} – ${hhmm(e.e)}</small></div>`}).join('');
  if(wasF)focus(box.querySelector('.now')||box.querySelector('[data-f]'))}))}
function closeEpg(){$('#epg').classList.remove('on');unf();showBand()}
function checkRem(){const now=Date.now();let ch=false;REM=REM.filter(r=>{if(r.s-now<=60000&&!r.fired){r.fired=1;ch=true;const k=reg(r.ch);toast(`${r.t} başlıyor`,clean(r.ch.name),`<div class="bt"><div class="btn sm pri" data-f data-act="remgo" data-key="${k}">İzle</div><div class="btn sm" data-f data-act="toastx">Kapat</div></div>`,30000);focus($('#toast [data-act=remgo]'))}return r.s>now-3600000});if(ch)save('rg-rem',REM)}

/* ---------- numara ve PIN tuş takımı ---------- */
function pad(mode,cb){PAD={mode,val:'',cb,prev:cur,err:0};$('#ptitle').textContent={pin:'PIN kodunu gir',newpin:'Yeni PIN kodu',ch:'Kanal numarası'}[mode];drawPad();$('#pad').classList.add('on');cur&&cur.classList.remove('fx');cur=null;focus($('#pad [data-v="1"]'))}
function drawPad(){const v=PAD.val;$('#pdisp').textContent=PAD.mode!=='ch'?'●'.repeat(v.length)+'○'.repeat(4-v.length):(v||'–');let s='';
 if(PAD.mode==='ch'&&v){const c=CTX.find(x=>String(x.num)===v);s=c?clean(c.name):'Bu listede bu numara yok'}if(PAD.mode==='pin')s=PAD.err?'PIN hatalı, tekrar dene':'';if(PAD.mode==='newpin')s='4 haneli yeni PIN';$('#psub').textContent=s}
function padKey(k){if(!PAD)return;if(k==='DEL')PAD.val=PAD.val.slice(0,-1);else if(k==='ok')return padDone();else if(PAD.val.length<(PAD.mode==='ch'?5:4)){PAD.val+=k;PAD.err=0}drawPad();
 if(PAD.mode!=='ch'&&PAD.val.length===4)setTimeout(padDone,180);if(PAD.mode==='ch'){clearTimeout(padKey.t);padKey.t=setTimeout(()=>PAD&&PAD.val&&padDone(),1600)}}
function padDone(){const p=PAD;if(!p)return;if(p.mode==='pin'){if(p.val!==pinCode()){p.err=1;p.val='';return drawPad()}UNL=true;closePad();return p.cb()}
 if(p.mode==='newpin'){if(p.val.length!==4)return;ST.pinCode=p.val;saveST();closePad();return toast('PIN değiştirildi','')}
 const c=CTX.find(x=>String(x.num)===p.val);if(c){closePad();p.cb(c)}else{p.val='';drawPad()}}
function closePad(){$('#pad').classList.remove('on');const pv=PAD&&PAD.prev;PAD=null;unf();if(pv&&pv.isConnected)focus(pv)}

/* =========================================================
   EYLEMLER
   ========================================================= */
function ok(e){if(!e)return;if(e.tagName==='INPUT')return e.focus();const d=e.dataset,a=d.act,it=d.key&&REG.get(d.key);
 if(a==='pk')return padKey(d.v);
 if(cv==='search'&&Q&&scr==='app'&&['open','live','playv'].includes(a)){ST.rec=[Q,...ST.rec.filter(x=>x!==Q)].slice(0,6);saveST()}
 switch(a){
 case'login':{let acc;try{acc=parseLogin($('#in1').value,$('#in2').value,$('#in3').value)}catch(x){$('#lerr').textContent=x.message;return focus($('#in1'))}return doLogin(acc)}
 case'logout':AV.close();ACC=null;save('rg-acc',null);API.C={};go('login');return focus($('#in1'));
 case'reload':API.C={};['live','vod','series'].forEach(k=>save('rg-c-'+k+'-'+(ACC.u||''),null));toast('Liste yenileniyor','');return(ACC.type==='m3u'?M3U.load(ACC.url):Promise.resolve()).then(()=>render('home')).catch(x=>toast('Yenilenemedi',x.message));
 case'nav':if(d.v==='search')Q='';render(d.v==='live'?'tv':d.v);return focus($(`.sn[data-v="${d.v}"]`));
 case'srch':Q='';return render('search',d.s);
 case'rq':Q=d.q;return drawSearch();
 case'key':Q=d.v==='DEL'?Q.slice(0,-1):(Q+d.v).slice(0,24);return drawSearch();
 case'cat':{const lockd=d.ad&&pinOn()&&!UNL;const goIn=()=>{const f=$(d.t==='live'?'#chl [data-f]':'#vg [data-f]');if(f)focus(f)};
  if(lockd)return pad('pin',async()=>{e.innerHTML=e.textContent;await loadCat(d.t,d.c);goIn()});if(!e.classList.contains('sel')){clearTimeout(CT);return loadCat(d.t,d.c).then(goIn)}return goIn()}
 case'catpick':return catPick(d.t);
 case'catall':{const goC=()=>{$('#catov').classList.remove('on');if(d.t==='live'){return loadCat('live',d.c).then(()=>focus($('#chl [data-f]')||$(`#catl [data-c="${CSS.escape(d.c)}"]`)))}return render('cat',{t:d.t,c:d.c,n:d.n})};if(d.ad&&pinOn()&&!UNL)return pad('pin',goC);return goC()}
 case'open':if(!it)return;if(it.k==='live')return openLive(d.key);return render('detail',d.key);
 case'playv':return openPlayer(it);
 case'playe':return ensureEps(it).then(()=>openPlayer(it));
 case'cw':return it.k==='ep'?ensureEps(it).then(()=>openPlayer(it)):openPlayer(it);
 case'live':return openLive(d.key,e.closest('#chl')?CTX:e.closest('#hlive')?HL:e.closest('#hrows')?FAVL:null);
 case'season':return drawSeason(+d.s,`[data-s="${d.s}"]`);
 case'mylist':{if(inMy(it))MYL=MYL.filter(m=>!(m.k===it.k&&m.id===it.id));else MYL.push(it);save('rg-my',MYL);e.textContent=inMy(it)?'Listemde':'Listeme ekle';return}
 case'set':{const o=SET.find(s=>s[0]===d.k);ST[d.k]=((ST[d.k]||0)+1)%o[2].length;if(d.k==='pin')UNL=false;saveST();clock();return render('settings',0,false,`[data-k="${d.k}"]`)}
 case'pinchg':return pad('pin',()=>setTimeout(()=>pad('newpin',()=>{}),50));
 case'cats':return render('cats',d.t);
 case'diag':return render('diag');
 case'ctab':return render('cats',d.t,false,`[data-t="${d.t}"]`);
 case'cmv':case'chide':{const t=d.t;API.cats(t).then(cs=>{const h=ST['h_'+t]||[];const full=fullOrd(t,cs).map(c=>c.id);if(a==='chide'){ST['o_'+t]=full;ST['h_'+t]=h.includes(d.c)?h.filter(x=>x!==d.c):[...h,d.c]}
  else{const o=full,j=o.indexOf(d.c),k=j+(+d.d);if(j<0||k<0||k>=o.length)return;[o[j],o[k]]=[o[k],o[j]];ST['o_'+t]=o}saveST();drawCats(t,cs,`[data-act="${a}"][data-c="${CSS.escape(d.c)}"]${a==='cmv'?`[data-d="${d.d}"]`:''}`)});return}
 case'back':return scr==='player'?(histSet(PL,AV.time()/1000,AV.dur()/1000),exit()):exit();
 case'eps':{histSet(PL,AV.time()/1000,AV.dur()/1000);const k=reg({k:'series',id:PL.sid,name:PL.sname,icon:PL.scover});exit();return render('detail',k)}
 case'pp':return pause();
 case'rsY':return startPlay(+d.t||0);case'rsN':return startPlay(0);
 case'nxY':return playNext();case'nxN':$('#nx').classList.remove('on');return unf();
 case'retry':return startPlay(Math.max(0,AV.time()/1000||PL.start||0));
 case'panel':case'lset':return openPan();
 case'panx':hidePan();return panLive?focus($('[data-act=lset]')):unf();
 case'lpp':return lpause();case'prevch':return prevLV&&tuneLive(prevLV);case'num':return pad('ch',c=>tuneLive(c));
 case'lretry':ltry=0;LREC=[];return liveOpen();
 case'lfav':if(LV){favToggle(LV);favDraw();osd(isFav(LV.id)?'Favorilere eklendi':'Favorilerden çıkarıldı')}return;
 case'epg':return openEpg();case'epgx':return closeEpg();
 case'tune':closeEpg();return it.id===LV.id?(lag=0,liveOpen()):tuneLive(it);
 case'catch':{if(!it.arch)return osd('Bu kanalda arşiv yok');closeEpg();if(it.id!==LV.id){prevLV=LV;LV=it;liveDraw()}lag=Math.round((Date.now()-+d.s)/1000);drawLag();liveOpen();return osd('Arşivden oynatılıyor')}
 case'remind':{const i=REM.findIndex(r=>r.rk===d.rk);if(i>=0)REM.splice(i,1);else REM.push({rk:d.rk,s:+d.s,t:d.t,ch:{k:'live',id:it.id,name:it.name,icon:it.icon,num:it.num,arch:it.arch,url:it.url}});save('rg-rem',REM);
  osd(i>=0?'Hatırlatıcı kaldırıldı':'Hatırlatıcı kuruldu');const s=`[data-rk="${CSS.escape(d.rk)}"]`;e.innerHTML=(i>=0?'':IC.bell)+e.innerHTML.replace(/^<svg[\s\S]*?<\/svg>/,'');return}
 case'remgo':$('#toast').classList.remove('on');return openLive(d.key,[it]);
 case'toastx':$('#toast').classList.remove('on');return unf();
 case'quit':try{tizen.application.getCurrentApplication().exit()}catch(x){window.close()}return;
 case'noquit':$('#exitov').classList.remove('on');return focus(scr==='login'?$('#in1'):($('.sn.cur')||$('.sn')));
 }
 if(d.k)pick(d.k,d.v)}

/* =========================================================
   KUMANDA
   ========================================================= */
const KEYS=['MediaPlayPause','MediaPlay','MediaPause','MediaStop','MediaFastForward','MediaRewind','ChannelUp','ChannelDown','ChannelList','0','1','2','3','4','5','6','7','8','9','ColorF0Red','ColorF1Green','ColorF2Yellow','ColorF3Blue','Info'];
try{KEYS.forEach(k=>{try{tizen.tvinputdevice.registerKey(k)}catch(e){}})}catch(e){}
/* akıcılık ölçer: yalnızca tuşa basıldıktan sonraki 0,7 sn boyunca kare sürelerini sayar */
const PERF={n:0,slow:0,jank:0,max:0,sent:0,until:0,last:0,on:false,
 kick(){this.until=performance.now()+700;if(!this.on){this.on=true;this.last=0;requestAnimationFrame(t=>this.tick(t))}},
 tick(t){if(this.last){const d=t-this.last;this.n++;if(d>34)this.slow++;if(d>100)this.jank++;if(d>this.max)this.max=d}this.last=t;if(t<this.until)requestAnimationFrame(x=>this.tick(x));else this.on=false},
 text(){return this.n?`${this.n} kare ölçüldü, yüzde ${Math.round(this.slow/this.n*100)} yavaş, ${this.jank} takılma, en uzun kare ${Math.round(this.max)} ms`:'henüz ölçüm yok'},
 report(){if(this.n-this.sent<400)return;this.sent=this.n;LOG.add('perf','Akıcılık: '+this.text(),{sayfa:cv})}};
let MQ=null;function qmove(d){if(MQ){MQ=d;return}MQ=d;requestAnimationFrame(()=>{const x=MQ;MQ=null;move(x)})}
addEventListener('keydown',e=>{REP=e.repeat;if(scr==='app')PERF.kick();const kc=e.keyCode,inp=e.target.tagName==='INPUT';if(inp&&(kc===65376||kc===65385)){e.target.blur();return}if(inp&&![38,40,27,13,10009].includes(kc))return;
 const m={37:'l',39:'r',38:'u',40:'d'}[kc],b=kc===10009||kc===27||(kc===8&&!inp),cu=kc===427||kc===33,cd=kc===428||kc===34,pp=kc===10252||kc===415||kc===19||(kc===32&&!inp),ff=kc===417,rw=kc===412,dg=kc>=48&&kc<=57&&!inp?String(kc-48):null;
 if(m||b||cu||cd||pp||ff||rw||kc===13)e.preventDefault();
 if($('#toast').classList.contains('on')&&$('#toast').contains(cur)){if(m)return focus(m==='l'||m==='r'?[...$('#toast').querySelectorAll('[data-f]')].find(x=>x!==cur)||cur:cur);if(kc===13)return ok(cur);if(b){$('#toast').classList.remove('on');return unf()}}
 if(PAD){if(dg)return padKey(dg);if(b)return closePad();if(m)return move(m);if(kc===13&&!e.repeat)return ok(cur);return}
 if($('#exitov').classList.contains('on')){if(b)return ok($('[data-act=noquit]'));if(m)return move(m);if(kc===13)return ok(cur);return}
 if(kc===13&&e.repeat)return;
 if(scr==='live'&&dg&&!$('#epg').classList.contains('on')){pad('ch',c=>tuneLive(c));return padKey(dg)}
 if(scr==='player')return pKey(e,m,b,cu,cd,pp,ff,rw);if(scr==='live')return lKey(e,m,b,cu,cd,pp,ff,rw);
 if(m)qmove(m);else if(kc===13)ok(cur);else if(b){if(scr==='app')back();else if(scr==='login'){$('#exitov').classList.add('on');focus($('[data-act=noquit]'))}}});
document.addEventListener('click',e=>{const f=e.target.closest('[data-f]'),sd=e.target.closest('#side'),op=$('#side').classList.contains('open');
 if(PAD){if(f){focus(f);ok(f)}else if(!e.target.closest('.pbox'))closePad();return}
 const co=$('#catov');if(co.classList.contains('on')&&!e.target.closest('.catbox')){co.classList.remove('on');if(!sd){focus($('[data-act=catpick]'));return}}
 if(sd&&!op){focus(f||$('.sn.cur')||$('.sn'));return}
 if(!sd&&op&&!f){$('#side').classList.remove('open');$('#app').classList.remove('sopen');if(cur&&cur.closest('#side'))unf()}
 if(f){focus(f);return ok(f)}
 if(scr==='player'){if(e.target.closest('#pan,.ov,#nx'))return;if($('#player').classList.contains('ui')&&!cur&&!paused)$('#player').classList.remove('ui');else wake()}
 else if(scr==='live'){const ci=e.target.closest('.chi');if(ci)return tuneLive(REG.get(ci.dataset.key));if(!e.target.closest('#epg,#pan,.ov'))showBand()}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(scr==='player'&&PL)histSet(PL,AV.time()/1000,AV.dur()/1000);AV.suspend()}else{AV.restore();updCheck()}});
/* güncelleme: TV uygulamayı kapatmadan arka planda tuttuğu için, öne gelince ve saatte bir yeni sürüm var mı diye bak */
let UPD=null;
function updCheck(){const cfg=window.RAGNAR_CONFIG||{};if(!cfg.appBase||updCheck.busy||scr==='login')return;updCheck.busy=1;const el=document.createElement('script'),fin=()=>{updCheck.busy=0;el.remove()};
 el.src=cfg.appBase.replace(/\/?$/,'/')+'version.js?t='+Date.now();el.onerror=fin;
 el.onload=()=>{fin();const v=window.RAGNAR_REMOTE&&window.RAGNAR_REMOTE.version;let bad=null;try{bad=localStorage.getItem('rg-bad')}catch(e){}if(v&&v!==APPV&&v!==bad){UPD=v;updApply()}};document.head.appendChild(el)}
function updApply(){if(!UPD||scr!=='app'||Date.now()-(load('rg-upd-t',0)||0)<600000)return;save('rg-upd-t',Date.now());LOG.add('info','Yeni sürüme geçiliyor: '+APPV+' -> '+UPD,{});LOG.flush();toast('Güncelleme','Yeni sürüm yükleniyor.',0,1500);setTimeout(()=>location.reload(),1300)}
setInterval(updCheck,3600000);

/* ---------- saat, ilerleme kaydı, bekçi ---------- */
function clock(){$('#clk').style.display=ST.clock?'none':''}
let CLK='';
setInterval(()=>{const d=new Date(),hm=hhmm(d);if(hm!==CLK){CLK=hm;$('#clk').textContent=hm}
 if(AV.st==='play'&&(scr==='player'||scr==='live')&&!(scr==='player'&&paused)&&!(scr==='live'&&lpaused)){const t=AV.time();AV.bufN=AV.buf?(AV.bufN||0)+1:0;
  /* donma: oynatıcı oynuyorum derken 6 sn ilerlemezse; canlıda arabellek 10 sn sürerse */
  if(!AV.buf&&t!==AV.lt){AV.same=0;AV.lt=t;AV.adv++}
  else if(AV.adv>3&&((!AV.buf&&++AV.same>=6)||(AV.buf&&scr==='live'&&AV.bufN>=10))){const why=AV.buf?'arabellek 10 sn sürdü':'6 sn ilerlemedi';AV.same=0;AV.bufN=0;const okR=recOK();LOG.add('warn','Yayın takıldı ('+why+')'+(okR?', yeniden bağlanılıyor':', yeniden deneme hakkı doldu'),{ad:scr==='live'?(LV&&LV.name):(PL&&PL.name)});
   if(scr==='player'){const cb0=AV.cb;AV.close();if(okR){loadingOn('player','Yeniden bağlanılıyor');setTimeout(()=>{if(scr==='player')AV.open(API.url(PL),null,Object.assign(cb0,{start:t/1000}))},1200)}else{$('#perrt').textContent='Yayın takıldı ve yeniden bağlanılamadı. Biraz sonra tekrar dene.';$('#perr').classList.add('on');focus($('[data-act=retry]'))}}
   else{const it=LV;AV.close();if(okR){loadingOn('live','Yeniden bağlanılıyor');setTimeout(()=>{if(LV===it&&scr==='live')liveOpen()},1200)}else liveFail(it,'takıldı')}}}
 if(scr==='player'&&PL&&AV.st==='play'&&!paused){const t=AV.time()/1000,du=AV.dur()/1000;if(++saveT>=10){saveT=0;histSet(PL,t,du)}
  if($('#nx').classList.contains('on')){nxC--;$('#nxc').textContent=nxC+' sn içinde başlıyor';if(nxC<=0)playNext()}else if(!nxOn&&du>120&&du-t<=25&&nextEp())showNext()}
 if(scr==='live'&&LV&&d.getSeconds()%30===0)bandEpg();
 if(d.getSeconds()%20===0)checkRem();if(d.getSeconds()===7)PERF.report()},1000);


/* ---------- açılış sesi (Web Audio ile üretilir, dosya gerekmez) ---------- */
function introSound(){if(ST.snd===1)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const c=introSound.c||(introSound.c=new AC());if(c.state==='suspended')c.resume();introSynth(c)}catch(e){}}
/* tok, sinematik açılış: parçalar boğuk vuruşlarla yerine oturur, sonunda derin bir gümbürtü ve alçak metal yankı */
function introSynth(c){const t0=c.currentTime+.05,M=c.createGain(),cp=c.createDynamicsCompressor(),out0=c.createBiquadFilter();
 out0.type='lowpass';out0.frequency.value=5200;M.gain.value=.38;M.connect(out0);out0.connect(cp);cp.connect(c.destination);
 const sr=c.sampleRate,nz=c.createBuffer(1,sr*2,sr),nd=nz.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
 /* oda yankısı: kısa, koyu */
 const rv=c.createConvolver(),ir=c.createBuffer(2,sr*2.2|0,sr);for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3.2)}
 rv.buffer=ir;const rlp=c.createBiquadFilter(),rg=c.createGain();rlp.type='lowpass';rlp.frequency.value=1400;rg.gain.value=.34;rv.connect(rlp);rlp.connect(rg);rg.connect(M);
 const env=(g,t,a,p,d)=>{g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(p,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+d)};
 const bus=v=>{const g=c.createGain();g.connect(M);g.connect(rv);if(!c.createStereoPanner)return g;const p=c.createStereoPanner();p.pan.value=v*.7;p.connect(g);return p};
 /* parçalar: alçak hava süpürmesi + boğuk ahşap/metal vuruş */
 [[.1,-.6],[.1,.6],[.25,0],[.35,-.4],[.35,.4],[.45,-.7],[.45,.7],[.6,0],[.7,-.5],[.7,.5],[.78,-.3],[.78,.3],[.86,0]].forEach(([d,pv],i)=>{const ta=t0+d+.42,o=bus(pv);
  const n=c.createBufferSource(),bp=c.createBiquadFilter(),g=c.createGain();n.buffer=nz;bp.type='bandpass';bp.Q.value=1.2;bp.frequency.setValueAtTime(180,ta-.32);bp.frequency.exponentialRampToValueAtTime(700,ta);env(g,ta-.32,.28,.07,.06);
  n.connect(bp);bp.connect(g);g.connect(o);n.start(ta-.33,Math.random()*1.5);n.stop(ta+.08);
  const k=c.createOscillator(),kg=c.createGain(),f0=78-(i%4)*6;k.type='sine';k.frequency.setValueAtTime(f0*2.1,ta);k.frequency.exponentialRampToValueAtTime(f0,ta+.09);env(kg,ta,.004,.32,.2);k.connect(kg);kg.connect(o);k.start(ta);k.stop(ta+.3);
  const hn=c.createBufferSource(),hl=c.createBiquadFilter(),hg=c.createGain();hn.buffer=nz;hl.type='lowpass';hl.frequency.value=650;env(hg,ta,.002,.16,.06);hn.connect(hl);hl.connect(hg);hg.connect(o);hn.start(ta,Math.random()*1.5);hn.stop(ta+.1);
  [182,251].forEach((f,j)=>{const m=c.createOscillator(),mg=c.createGain();m.type='sine';m.frequency.value=f*(1+i*.012);env(mg,ta,.003,.035/(j+1),.18);m.connect(mg);mg.connect(o);m.start(ta);m.stop(ta+.25)})});
 /* miğfer tamamlanınca: derin gümbürtü */
 const ti=t0+1.12,k=c.createOscillator(),kg=c.createGain();k.type='sine';k.frequency.setValueAtTime(90,ti);k.frequency.exponentialRampToValueAtTime(30,ti+.7);env(kg,ti,.006,1.1,1.35);k.connect(kg);kg.connect(M);kg.connect(rv);k.start(ti);k.stop(ti+1.5);
 const s2=c.createOscillator(),sg=c.createGain();s2.type='triangle';s2.frequency.setValueAtTime(58,ti);s2.frequency.exponentialRampToValueAtTime(41,ti+1.2);env(sg,ti,.01,.22,1.6);s2.connect(sg);sg.connect(M);s2.start(ti);s2.stop(ti+1.8);
 const nb=c.createBufferSource(),lp=c.createBiquadFilter(),ng=c.createGain();nb.buffer=nz;lp.type='lowpass';lp.frequency.setValueAtTime(700,ti);lp.frequency.exponentialRampToValueAtTime(120,ti+.5);env(ng,ti,.003,.5,.45);nb.connect(lp);lp.connect(ng);ng.connect(M);ng.connect(rv);nb.start(ti);nb.stop(ti+.6);
 /* alçak metal yankı (çan değil, kalkan) */
 [98,147.5,203,268].forEach((f,j)=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;env(g,ti+.01,.02,.09/(1+j*.6),2.2-j*.3);o.connect(g);g.connect(M);g.connect(rv);o.start(ti);o.stop(ti+2.6)});
 /* isim belirirken koyu, kabaran gövde */
 const ts=t0+1.35,lp2=c.createBiquadFilter(),dg=c.createGain();lp2.type='lowpass';lp2.frequency.setValueAtTime(120,ts);lp2.frequency.linearRampToValueAtTime(380,ts+1.1);
 dg.gain.setValueAtTime(.0001,ts);dg.gain.exponentialRampToValueAtTime(.22,ts+.6);dg.gain.exponentialRampToValueAtTime(.0001,ts+2.5);lp2.connect(dg);dg.connect(M);dg.connect(rv);
 [41.2,55,61.7].forEach(f=>{const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f;o.connect(lp2);o.start(ts);o.stop(ts+2.6)})}
function replayIntro(){const s=$('#splash');s.replaceWith(s.cloneNode(true));introSound()}
/* ---------- başlangıç ---------- */
$('#side').innerHTML='<div class="brand"><svg viewBox="16 4 168 262" aria-hidden="true">'+HELM+'</svg><span>RAGNAR</span></div>'+[['home','Ana sayfa'],['live','Canlı TV'],['series','Diziler'],['films','Filmler'],['search','Ara'],['settings','Ayarlar']].map(([v,n])=>`<div class="sn" data-f data-act="nav" data-v="${v}">${IC[v]}<span>${n}</span></div>`).join('');
$('#pad .pgrid').innerHTML=['1','2','3','4','5','6','7','8','9','DEL','0','ok'].map(k=>`<div class="pk" data-f data-act="pk" data-v="${k}">${k==='ok'?'Tamam':k==='DEL'?'Sil':k}</div>`).join('');
$$('[data-ic]').forEach(e=>e.insertAdjacentHTML('afterbegin',IC[e.dataset.ic]));
introSound();$('#login .wm').style.cursor='pointer';$('#login .wm').onclick=replayIntro;
let STS=1,STX=0,STY=0;
function fit(){const de=document.documentElement,W=innerWidth||de.clientWidth||1920,H=innerHeight||de.clientHeight||1080,s=Math.min(W/1280,H/720),st=$('#stage');
 STS=s;STX=Math.round((W-1280*s)/2);STY=Math.round((H-720*s)/2);
 if(Math.abs(W/H-16/9)<0.02&&'zoom' in st.style){st.style.transform='';st.style.zoom=s;STX=0;STY=0}
 else{st.style.zoom='1';st.style.transform=`translate(${STX}px,${STY}px) scale(${s})`}}
addEventListener('resize',fit);fit();setTimeout(fit,300);setTimeout(fit,1500);clock();
/* TV'de: HTML5 yedek videoyu kaldır (AVPlay görüntüsünü örtmesin), AVPlay yüzeyini ekle */
if(isTV){try{tizen.systeminfo.addPropertyValueChangeListener('MEMORY',m=>{if(m&&m.status==='WARNING'){API.purge(true);IMG.bad.clear();LOG.add('warn','TV bellek uyarısı verdi, önbellekler boşaltıldı',{})}})}catch(e){}
 document.documentElement.classList.add('tv');const hv=$('#hv');if(hv)hv.remove();
 if(!$('#avp')){const o=document.createElement('object');o.id='avp';o.type='application/avplayer';o.style.cssText='position:fixed;left:0;top:0;width:100%;height:100%;z-index:-2';document.body.insertBefore(o,document.body.firstChild)}}
(async()=>{scr='login';$$('.scr').forEach(x=>x.classList.toggle('on',x.id==='login'));if(!ACC)PAIR.start();focus($('#in1'));
 if(ACC){$('#in1').value=ACC.type==='xt'?ACC.srv:ACC.url;$('#in2').value=ACC.u||'';$('#in3').value=ACC.p||'';const wait=new Promise(r=>setTimeout(r,2200));
  if(ACC.type==='m3u'){await wait;return doLogin(ACC)}try{API.C={};const lp=API.login();lp.catch(()=>{});await wait;ACC.ui=await lp;save('rg-acc',ACC);startApp()}catch(e){$('#lerr').textContent=e.message+' Bilgileri kontrol edip tekrar giriş yap.';PAIR.start();focus($('[data-act=login]'))}}})();

try{localStorage.setItem('rg-boot','ok')}catch(e){}
