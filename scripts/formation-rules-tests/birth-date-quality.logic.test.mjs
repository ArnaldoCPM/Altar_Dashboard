import test from 'node:test';
import assert from 'node:assert/strict';
import { loadQuality } from './birth-date-quality.test-support.mjs';
const server=(id,date,extra={})=>({id,Nome:id,Data_nascimento:date,chapelId:'a',Tipo:'Formando',...extra});
test('dynamic queue excludes ISO, includes all pending categories and filters without writes',async()=>{
 const q=await loadQuality();const rows=[server('a','2015-04-04'),server('b','27/08/2014'),server('c','03/04/2015'),server('d','28/07/17'),server('e','')];
 assert.deepEqual(q.buildBirthDateQueue(rows).map(x=>x.classification.category),['legacy','ambiguous','invalid','empty']);
 const c=q.createBirthDateQualityController({isAdmin:()=>true});c.open(rows);assert.equal(c.getState().pending,4);c.setFilter('category','invalid');assert.equal(c.getState().filtered,1);c.setFilter('chapel','other');assert.equal(c.getState().filtered,0);assert.equal(q.repo.fixture.writes.length,0);
});
test('ambiguity starts unselected; each option and manual ISO produce correct commits',async()=>{
 for(const iso of ['2015-04-03','2015-03-04','2015-05-01']){
 const q=await loadQuality();const c=q.createBirthDateQualityController({isAdmin:()=>true});c.open([server('s','03/04/2015')]);assert.equal(c.getState().draft.choice,'');assert.equal(c.getState().canSave,false);
 c.setDraft(iso==='2015-05-01'?'manual':iso,iso==='2015-05-01'?iso:'');await c.submit();assert.equal(q.repo.fixture.data.Data_nascimento,iso);assert.equal(c.getState().pending,0);assert.equal(c.getState().resolved,1);}
});
test('manual invalid/empty cannot resolve until valid; safe legacy waits for confirmation',async()=>{
 const q=await loadQuality();const c=q.createBirthDateQualityController({isAdmin:()=>true});
 for(const value of ['','28/07/17']){c.open([server('s',value)]);c.setDraft('manual','2015-02-31');await c.submit();assert.equal(c.getState().canSave,false);c.setDraft('manual','');assert.equal(c.getState().canSave,false);c.setDraft('manual','2015-04-03');assert.equal(c.getState().canSave,true);}
 c.open([server('s','04/04/2015')]);assert.equal(q.repo.fixture.writes.length,0);q.repo.fixture.data={Data_nascimento:'04/04/2015'};await c.submit();assert.equal(q.repo.fixture.data.Data_nascimento,'2015-04-04');
});
test('skip and declined filter discard preserve pending records and never write',async()=>{
 const q=await loadQuality();const c=q.createBirthDateQualityController({isAdmin:()=>true,confirmDiscard:()=>false});c.open([server('s','03/04/2015')]);c.setDraft('2015-04-03');assert.equal(c.setFilter('category','empty'),false);assert.equal(c.getState().draft.choice,'2015-04-03');
 c.open([server('s','')]);c.skip();assert.equal(c.getState().selected,null);assert.equal(c.getState().skipped,1);assert.equal(c.getState().pending,1);c.restart();assert.equal(c.getState().selected.server.id,'s');assert.equal(q.repo.fixture.writes.length,0);
});
test('listener preserves reviewed original and draft; conflict requires a fresh choice',async()=>{
 const q=await loadQuality();const c=q.createBirthDateQualityController({isAdmin:()=>true});c.open([server('s','03/04/2015')]);c.setDraft('2015-04-03');c.update([server('s','05/06/2015')]);
 assert.equal(c.getState().selected.expected.value,'03/04/2015');assert.equal(c.getState().draft.choice,'2015-04-03');assert.equal(c.getState().stale,true);
 q.repo.fixture.data={Data_nascimento:'05/06/2015'};await c.submit();assert.equal(c.getState().selected.expected.value,'05/06/2015');assert.equal(c.getState().draft.choice,'');assert.equal(c.getState().resolved,0);assert.equal(q.repo.fixture.writes.length,0);
});
test('not-found removes card; network/permission failure retains it without success',async()=>{
 for(const msg of ['permission-denied','unavailable']){const q=await loadQuality();q.repo.fixture.error=new Error(msg);const c=q.createBirthDateQualityController({isAdmin:()=>true});c.open([server('s','03/04/2015')]);c.setDraft('2015-04-03');await c.submit();assert.equal(c.getState().resolved,0);assert.equal(c.getState().selected.server.id,'s');assert.match(c.getState().message,/Não foi possível/);}
 const q=await loadQuality();q.repo.fixture.exists=false;const c=q.createBirthDateQualityController({isAdmin:()=>true});c.open([server('s','03/04/2015')]);c.setDraft('2015-04-03');await c.submit();assert.equal(c.getState().pending,0);assert.match(c.getState().message,/não existe/);
});
test('role is checked on open and save; double submit and retries count once',async()=>{
 const q=await loadQuality();let admin=false;let finish;let calls=0;const c=q.createBirthDateQualityController({isAdmin:()=>admin,save:()=>{calls++;return new Promise(r=>finish=r);}});
 assert.equal(c.open([server('s','')]),false);admin=true;c.open([server('s','')]);c.setDraft('manual','2015-04-03');admin=false;await c.submit();assert.equal(calls,0);admin=true;const pending=c.submit();await c.submit();assert.equal(calls,1);finish({status:'saved',serverId:'s',value:'2015-04-03'});await pending;assert.equal(c.getState().resolved,1);
 q.repo.fixture.attempts=3;const d=q.createBirthDateQualityController({isAdmin:()=>true});d.open([server('s','03/04/2015')]);d.setDraft('2015-04-03');await d.submit();assert.equal(d.getState().resolved,1);
});
test('destroy ignores late commit feedback; listener correction does not clobber newer date',async()=>{
 const q=await loadQuality();let finish;let feedback=0;const c=q.createBirthDateQualityController({isAdmin:()=>true,onSaved:()=>feedback++,save:()=>new Promise(r=>finish=r)});
 c.open([server('s','')]);c.setDraft('manual','2015-04-03');const promise=c.submit();c.destroy();finish({status:'saved',serverId:'s',value:'2015-04-03'});await promise;assert.equal(feedback,0);
 c.open([server('s','')]);c.setDraft('manual','2015-04-03');const second=c.submit();c.update([server('s','2015-05-01')]);finish({status:'saved',serverId:'s',value:'2015-04-03'});await second;assert.equal(c.getState().servers[0].Data_nascimento,'2015-05-01');
});
