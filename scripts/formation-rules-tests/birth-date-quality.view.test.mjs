import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadQuality } from './birth-date-quality.test-support.mjs';
test('view escapes raw and names, shows both human interpretations without preselection',async()=>{
 const q=await loadQuality();const c=q.createBirthDateQualityController({isAdmin:()=>true});c.open([{id:'s',Nome:'<img onerror=evil>',Data_nascimento:'03/04/2015'}]);
 const html=q.view.birthDateQualityHtml(c.getState());assert.ok(html.includes('03/04/2015 — 3 de abril de 2015'));assert.ok(html.includes('04/03/2015 — 4 de março de 2015'));assert.ok(!html.includes('checked'));assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img'));
 c.open([{id:'s',Data_nascimento:'<script>evil()</script>'}]);const invalid=q.view.birthDateQualityHtml(c.getState());assert.ok(invalid.includes('&lt;script&gt;'));assert.ok(!invalid.includes('<script>'));
});
test('existing workspace entry is visible only for admin',async()=>{
 const source=await readFile(new URL('../../js/modules/servers/views/servers.view.js',import.meta.url),'utf8');const view=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 for(const role of ['admin','coordinator','viewer']){const root={innerHTML:''};view.renderServersWorkspace(root,{isAdmin:role==='admin',canCreate:false});assert.equal(root.innerHTML.includes('id="servers-quality"'),role==='admin');}
 const index=await readFile(new URL('../../js/modules/servers/index.js',import.meta.url),'utf8');assert.match(index,/function openQuality\(\)\s*\{\s*if \(!canAccessAdminMode\(\)\) return/);
});
test('view displays manual input, safe normalization and skipped-pass feedback',async()=>{
 const q=await loadQuality();const c=q.createBirthDateQualityController({isAdmin:()=>true});
 c.open([{id:'s',Data_nascimento:''}]);assert.match(q.view.birthDateQualityHtml(c.getState()),/Data de nascimento não informada/);assert.match(q.view.birthDateQualityHtml(c.getState()),/type="date"/);
 c.open([{id:'s',Data_nascimento:'27/08/2014'}]);assert.match(q.view.birthDateQualityHtml(c.getState()),/Normalizar e próximo/);c.skip();assert.match(q.view.birthDateQualityHtml(c.getState()),/Restam 1 registros pulados/);
});

test('DOM adapter wires actions, filters, radio and manual date events',async()=>{
 const q=await loadQuality();const c=q.createBirthDateQualityController({isAdmin:()=>true});c.open([{id:'s',Data_nascimento:'03/04/2015'}]);
 const node=(dataset={},value='')=>({dataset,value,events:{},addEventListener(name,fn){this.events[name]=fn;}});
 const save=node({qualityAction:'submit'}),filter=node({qualityFilter:'category'},'empty'),choice=node({},'2015-04-03'),date=node();
 const root={innerHTML:'',querySelectorAll:selector=>selector==='[data-quality-action]'?[save]:selector==='[data-quality-filter]'?[filter]:[choice],querySelector:()=>date};
 const calls=[];q.view.renderBirthDateQuality(root,c.getState(),{submit:()=>calls.push('save'),setFilter:(...v)=>calls.push(v),setDraft:(...v)=>calls.push(v)});
 save.events.click();filter.events.change();choice.events.change();date.events.change({target:{value:'2015-05-01'}});
 assert.deepEqual(calls,['save',['category','empty'],['2015-04-03',''],['manual','2015-05-01']]);assert.match(root.innerHTML,/Qualidade dos dados/);
});
