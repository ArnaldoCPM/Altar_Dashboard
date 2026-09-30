import { readFile } from 'node:fs/promises';
const url = s => 'data:text/javascript;base64,' + Buffer.from(s).toString('base64');
let counter = 0;
export async function loadQuality() {
  const datesUrl = url(await readFile(new URL('../../js/services/birth-date.service.js', import.meta.url), 'utf8'));
  const repoSource = (await readFile(new URL('../../js/data/servers.js', import.meta.url), 'utf8')).replace(/^import .*;\r?\n/gm, '');
  const repoUrl = url(`// fixture ${++counter}
import { validateBirthDatePayload, assertBirthDateWrite } from '${datesUrl}';
export const fixture={admin:true,exists:true,data:{Data_nascimento:'03/04/2015'},writes:[],reads:0,attempts:1,error:null};
const canAccessAdminMode=()=>fixture.admin;const db={};const doc=(...args)=>args;
const refEqual=(a,b)=>a.firestore===b.firestore && a.path===b.path;
const runTransaction=async(db,callback)=>{let result;let pending;
 for(let i=0;i<fixture.attempts;i++){pending=[];result=await callback({get:async()=>{fixture.reads++;return {exists:()=>fixture.exists,data:()=>fixture.data};},update:(ref,patch)=>pending.push({ref,patch})});}
 if(fixture.error)throw fixture.error;fixture.writes.push(...pending);for(const w of pending)fixture.data={...fixture.data,...w.patch};return result;};
${repoSource}`);
  const repo = await import(repoUrl);
  const ctrlSource = (await readFile(new URL('../../js/modules/servers/birth-date-quality.controller.js', import.meta.url), 'utf8'))
    .replace('../../services/birth-date.service.js', datesUrl).replace('../../data/servers.js',repoUrl);
  const controller = await import(url(ctrlSource));
  const viewSource = (await readFile(new URL('../../js/modules/servers/views/birth-date-quality.view.js', import.meta.url), 'utf8')).replace('../../../services/birth-date.service.js',datesUrl);
  return {repo,...controller,view:await import(url(viewSource))};
}
