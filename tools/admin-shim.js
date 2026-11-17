/* ARAMI · administración sin Claude.
   En el teléfono del dueño (con su clave de GitHub guardada) imita las funciones que la página usaba dentro de Claude:
   - costos, ajustes, piezas y cotizaciones → archivo data.json en el repositorio PRIVADO aramiguia-lgtm/arami-privado
   - "Guardar y publicar" → actualiza el catálogo dentro de index.html del repositorio público (GitHub Pages lo publica en ~1 min)
   En el teléfono de un cliente no hay clave guardada: no se carga nada de esto. */
(function(){
"use strict";
var GH="https://api.github.com", OWN="aramiguia-lgtm", PUB="arami-watches", PRIV="arami-privado", BR="main";
var LS={get:function(k){try{return localStorage.getItem(k)}catch(e){return null}},set:function(k,v){try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}};
var SS={get:function(k){try{return sessionStorage.getItem(k)}catch(e){return null}},set:function(k,v){try{v==null?sessionStorage.removeItem(k):sessionStorage.setItem(k,v)}catch(e){}}};
var TOK=LS.get("arami-gh");
var CAT_OPEN='<script type="application/json" id="catalog">';

/* Catálogo recién publicado: mostrarlo mientras GitHub Pages termina de publicar */
(function(){ var el=document.getElementById("catalog"), p=SS.get("arami-pending"); if(!el||!p) return;
  try{ var o=JSON.parse(p); if(el.textContent===o.cat||Date.now()-o.t>15*60e3){ SS.set("arami-pending",null); return } el.textContent=o.cat }catch(e){ SS.set("arami-pending",null) } })();

function enc(s){ var b=new TextEncoder().encode(s), out="", CH=0x8000; for(var i=0;i<b.length;i+=CH) out+=String.fromCharCode.apply(null,b.subarray(i,i+CH)); return btoa(out) }
function dec(b64){ var bin=atob(String(b64).replace(/\s/g,"")), a=new Uint8Array(bin.length); for(var i=0;i<bin.length;i++) a[i]=bin.charCodeAt(i); return new TextDecoder().decode(a) }
function api(path,opt){ opt=opt||{}; var h={"Authorization":"Bearer "+TOK,"Accept":opt.raw?"application/vnd.github.raw+json":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"};
  if(opt.body) h["Content-Type"]="application/json";
  return fetch(GH+path,{method:opt.method||"GET",headers:h,body:opt.body?JSON.stringify(opt.body):undefined,cache:"no-store"}).then(function(r){
    if(!r.ok){ var e=new Error("github "+r.status); e.status=r.status; e.code=r.status===401||r.status===403?"not_granted":r.status===409||r.status===422?"conflict":"unavailable"; throw e }
    return opt.raw?r.text():r.json() }) }
function getFile(repo,path){ var u="/repos/"+OWN+"/"+repo+"/contents/"+path+"?ref="+BR+"&t="+Date.now();
  return api(u).then(function(j){ if(j.content) return {sha:j.sha,text:dec(j.content)};
    return api(u,{raw:true}).then(function(t){ return {sha:j.sha,text:t} }) }) }
function putFile(repo,path,text,sha,msg){ var b={message:msg,content:enc(text),branch:BR}; if(sha) b.sha=sha;
  return api("/repos/"+OWN+"/"+repo+"/contents/"+path,{method:"PUT",body:b}).then(function(j){ return j.content&&j.content.sha }) }

/* ---------- datos privados ---------- */
var DATA=null, DSHA=null, LOADP=null, LIS={}, QLIS=[], wq=Promise.resolve();
function clone(o){ return o==null?o:JSON.parse(JSON.stringify(o)) }
function load(){ if(!LOADP) LOADP=getFile(PRIV,"data.json").then(function(f){ DSHA=f.sha; DATA=JSON.parse(f.text) },function(e){
    if(e.status===404){ DATA={docs:{},quotes:{}}; DSHA=null; return } LOADP=null; throw e }).then(function(){ DATA.docs=DATA.docs||{}; DATA.quotes=DATA.quotes||{} });
  return LOADP }
function save(why){ wq=wq.then(function(){ var txt=JSON.stringify(DATA,null,1);
    return putFile(PRIV,"data.json",txt,DSHA,why).then(function(s){ DSHA=s },function(e){
      if(e.code!=="conflict") throw e;
      return getFile(PRIV,"data.json").then(function(f){ DSHA=f.sha; return putFile(PRIV,"data.json",txt,DSHA,why).then(function(s){ DSHA=s }) }) }) });
  return wq }
function snap(p){ var d=DATA.docs[p]; return {exists:d!=null,data:function(){return clone(d)},metadata:{fromCache:false}} }
function emit(p){ (LIS[p]||[]).forEach(function(cb){ try{cb(snap(p))}catch(e){} }) }
function qsnap(){ var arr=Object.keys(DATA.quotes).map(function(id){ return {id:id,d:DATA.quotes[id]} }).sort(function(a,b){ return (b.d.at||0)-(a.d.at||0) });
  return {docs:arr.map(function(x){ return {id:x.id,data:function(){return clone(x.d)}} })} }
function qemit(){ QLIS.forEach(function(q){ var s=qsnap(); s.docs=s.docs.slice(0,q.n); try{q.cb(s)}catch(e){} }) }
var db={
  doc:function(p){ var parts=p.split("/");
    if(parts[0]==="quotes") return {delete:function(){ return load().then(function(){ delete DATA.quotes[parts[1]]; qemit(); return save("Borrar cotización") }) }};
    return {
      onSnapshot:function(cb,err){ (LIS[p]=LIS[p]||[]).push(cb); load().then(function(){ cb(snap(p)) },function(e){ if(err) err(e) }); return function(){} },
      set:function(d){ return load().then(function(){ DATA.docs[p]=clone(d); emit(p); return save("Guardar "+p) }) } } },
  collection:function(c){ return {
    add:function(d){ return load().then(function(){ var id=Date.now().toString(36)+Math.random().toString(36).slice(2,6); DATA.quotes[id]=clone(d); qemit(); return save("Nueva cotización").then(function(){ return {id:id} }) }) },
    orderBy:function(){ var n=1000; var q={limit:function(k){ n=k; return q },onSnapshot:function(cb,err){ QLIS.push({cb:cb,n:n}); load().then(function(){ var s=qsnap(); s.docs=s.docs.slice(0,n); cb(s) },function(e){ if(err) err(e) }) }}; return q } } }
};

/* ---------- publicar ---------- */
var art={publish:function(html){
  var a=html.indexOf(CAT_OPEN); if(a<0) return Promise.reject({code:"bad_request"});
  var b=html.indexOf("<\/script>",a), cat=html.slice(a+CAT_OPEN.length,b);
  return getFile(PUB,"index.html").then(function(f){
    var x=f.text.indexOf(CAT_OPEN); if(x<0) throw {code:"bad_request"}; var y=f.text.indexOf("<\/script>",x);
    var out=f.text.slice(0,x+CAT_OPEN.length)+cat+f.text.slice(y);
    return putFile(PUB,"index.html",out,f.sha,"Actualizar vitrina desde Administrar") })
  .then(function(){ SS.set("arami-pending",JSON.stringify({cat:cat,t:Date.now()})); setTimeout(function(){ location.reload() },900) },
    function(e){ throw {code:(e&&e.code)||"unavailable"} }) }};

/* ---------- descargas ---------- */
var downloads={save:function(r){ return new Promise(function(res){ var blob=r.data instanceof Blob?r.data:new Blob([r.data]);
  var u=URL.createObjectURL(blob), a=document.createElement("a"); a.href=u; a.download=r.filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(u) },4000); res({status:"saved"}) }) }};

if(TOK){
  window.claude={use:function(n){ return Promise.resolve(n==="user"?{isOwner:function(){return Promise.resolve(true)},canEdit:function(){return Promise.resolve(true)}}:n==="db"?db:n==="artifact"||n==="self"?art:n==="downloads"?downloads:null) }};
  return;
}

/* ---------- sin clave: conectar este teléfono ---------- */
var wantSetup=location.hash==="#admin";
if(wantSetup) try{ history.replaceState(null,"",location.pathname+location.search) }catch(e){}
function setup(){
  var m=document.createElement("div"); m.className="modal"; m.innerHTML='<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="ghT">'+
    '<b id="ghT">Conectar este teléfono</b><p class="note">Pega tu clave de GitHub (token). Se guarda solo en este teléfono y no la ve nadie más. Después entras con tu clave de administrador de siempre.</p>'+
    '<div class="f"><label for="ghTok">Token de GitHub</label><input type="password" id="ghTok" autocomplete="off" placeholder="github_pat_…"></div>'+
    '<div class="row"><button type="button" class="btn primary" id="ghGo">Conectar</button><button type="button" class="btn ghost" id="ghNo">Cancelar</button></div>'+
    '<span class="warnmsg" id="ghMsg" aria-live="polite"></span></div>';
  document.body.appendChild(m);
  var msg=m.querySelector("#ghMsg");
  m.querySelector("#ghNo").onclick=function(){ m.remove() };
  m.querySelector("#ghGo").onclick=function(){ var t=m.querySelector("#ghTok").value.trim(); if(!t){ msg.textContent="Pega el token."; return }
    TOK=t; msg.textContent="Comprobando…";
    api("/repos/"+OWN+"/"+PRIV).then(function(){ return api("/repos/"+OWN+"/"+PUB) }).then(function(j){
      if(j.permissions&&j.permissions.push===false) throw {status:403};
      LS.set("arami-gh",t); msg.textContent="Listo. Abriendo Administrar…"; location.hash="#admin"; location.reload() },
    function(e){ TOK=null; msg.textContent=e&&e.status===404?"El token no tiene acceso a los repositorios arami-watches y arami-privado.":e&&(e.status===401||e.status===403)?"Ese token no es válido o no tiene permiso de escritura.":"No se pudo comprobar. Revisa tu conexión." }) };
  setTimeout(function(){ m.querySelector("#ghTok").focus() },50);
}
document.addEventListener("click",function(e){ var t=e.target&&e.target.closest&&e.target.closest("#adminLink"); if(!t) return; e.preventDefault(); e.stopImmediatePropagation(); setup() },true);
if(wantSetup) document.addEventListener("DOMContentLoaded",setup);
})();
