// Run with `npm run diagnose:neuro` after `npm run dev:all`.
// Tests the exact HTML-generated paths to catch nested-Vite/base mistakes.
const base = process.env.APP_URL || 'http://localhost:5173';
const url = new URL('/modules/neuro/',base);
const failures=[];
const timeout=6000;
async function check(path,label,mime) {
  const u = new URL(path,url);
  try {
   const r=await fetch(u,{signal:AbortSignal.timeout(timeout)});
   const ct=r.headers.get('content-type')||'';
   const ok=r.ok && ct.includes(mime);
   console.log(`${ok?'PASS':'FAIL'} ${label}: ${r.status} ${ct} ${u}`);
   if(!ok) failures.push(label);
   return {ok,response:r};
  } catch (e){console.log(`FAIL ${label}: ${e.message} ${u}`);failures.push(label);return {ok:false};}
}
const page = await check('/modules/neuro/','NeuroScan HTML','text/html');
if(page.ok){
 const html=await page.response.text();
 const scripts=[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(m=>m[1]);
 const styles=[...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["']/gi)].map(m=>m[1]);
 const paths=[...scripts,...styles].filter(x=>x.includes('main.tsx')||x.includes('doosra-preloader'));
 if(!paths.length){console.log('FAIL no React entry or preloader linked in HTML');failures.push('HTML assets');}
 for(const path of paths){
  const mime=path.includes('.css')?'text/css':'javascript';
  await check(path,`asset ${path}`,mime);
 }
 if(paths.some(p=>p.includes('/modules/neuro/modules/neuro/'))){console.log('FAIL double prefix in HTML');failures.push('double base');}
}
if(failures.length){
 console.log(`\n${failures.length} failures. Check that HOME and NEURO_UI both started. If 5175 is in use, free it and restart npm run dev:all.`);
 process.exitCode=1;
} else console.log('\nNeuroScan entry assets resolved correctly. Open in Chrome to verify runtime.');
