import re,sys
from PIL import Image
src=sys.argv[1]; out=sys.argv[2]
s=open(src).read()
body=s.split('<body>',1)[1].rsplit('</body>',1)[0]
body=re.sub(r'<title>.*?</title>\s*','',body,count=1,flags=re.S)
body=body.replace('<meta name="claude:viewport-fit-sides" content="cover">\n','',1)
n=body.count('<button type="button" class="adminlink" id="adminLink">Administrar</button>'); assert n==1
import os
shim=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'admin-shim.js')).read()
assert body.count('<script id="appjs">')>=1  # first one is the real tag; later ones are text inside pageHTML()
body=body.replace('<script id="appjs">','<script id="shim">'+shim+'</script>\n<script id="appjs">',1)
head='''<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>ARAMI Watches</title>
<meta name="description" content="Relojes automáticos ARAMI: máquina japonesa, cristal de zafiro, acero o titanio. Elige tu modelo y pide por WhatsApp.">
<meta name="theme-color" content="#0E1C2B">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-DW34TXMY70"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","G-DW34TXMY70");</script>
<link rel="manifest" href="manifest.webmanifest?v=2">
<link rel="icon" type="image/png" href="icon-192.png?v=2">
<link rel="apple-touch-icon" href="apple-touch-icon.png?v=2">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="ARAMI">
<meta property="og:type" content="website">
<meta property="og:title" content="ARAMI Watches">
<meta property="og:description" content="Relojes automáticos con máquina japonesa y cristal de zafiro. Pide por WhatsApp.">
<meta property="og:image" content="https://aramiwatches.com/og-logo.jpg">
<style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style>
</head><body>
'''
tail='''
<script>(function(){
function num(t){var m=String(t||"").replace(/,/g,"").match(/\$\s*([0-9]+(?:\.[0-9]+)?)/);return m?+m[1]:0}
document.addEventListener("click",function(e){ if(!window.gtag||!e.target.closest)return;
  var t=e.target.closest(".w,#add,#wa"); if(!t)return;
  if(t.classList.contains("w")){ var b=t.querySelector("b"), p=t.querySelector(".p"); var n=b?b.textContent:"";
    gtag("event","view_item",{currency:"USD",value:num(p&&p.textContent),items:[{item_name:n,price:num(p&&p.textContent)}]}) }
  else if(t.id==="add"){ var n2=(document.getElementById("pName")||{}).textContent||"", pr=num((document.getElementById("pPrice")||{}).textContent), q=+((document.getElementById("qty")||{}).value)||1;
    gtag("event","add_to_cart",{currency:"USD",value:pr*q,items:[{item_name:n2,price:pr,quantity:q}]}) }
  else if(t.id==="wa"){ var tot=num((document.getElementById("total")||{}).textContent); if(tot>0) gtag("event","generate_lead",{currency:"USD",value:tot}) }
},true)})();</script>
<script>if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){})})}</script>
</body></html>
'''
assert 'priv/costs' in body  # owner code present but inert without claude runtime
open(out+'/index.html','w').write(head+body+tail)
