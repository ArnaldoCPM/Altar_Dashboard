import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const moduleUrl = s => 'data:text/javascript;base64,' + Buffer.from(s).toString('base64');
const datesUrl = moduleUrl(await readFile(new URL('../../js/services/birth-date.service.js', import.meta.url), 'utf8'));
const source = (await readFile(new URL('../../js/modules/servers/services/import.service.js', import.meta.url), 'utf8'))
  .replace('import { db, doc, writeBatch } from "../../../firebase.js";', `
export const effects={batches:0,sets:[],commits:0};
const db={};const doc=(...args)=>args;
const writeBatch=()=>{effects.batches++;return {set:(ref,payload)=>effects.sets.push({ref,payload}),commit:async()=>{effects.commits++;}};};`)
  .replace('../../../services/birth-date.service.js', datesUrl);
const csv=await import(moduleUrl(source));
const reset=()=>{csv.effects.batches=0;csv.effects.sets.length=0;csv.effects.commits=0;};
const sample={id:'s',Nome:'Ana',Data_nascimento:'2015-04-04',chapelId:'c',Capela:'Capela'};
const context={chapels:[{id:'c',name:'Capela'}]};
// Deliberately generate invalid input independently of the now-strict exporter.
const input=value=>csv.serializeOfficialCsv([sample]).replace('2015-04-04',value);

test('official import accepts real ISO/empty and rejects impossible or legacy dates',()=>{
  for(const v of ['2015-04-04','2016-02-29','']) {
    const p=csv.prepareOfficialImport(input(v),context);assert.deepEqual(p.errors,[]);assert.equal(p.items[0].payload.Data_nascimento,v);
  }
  for(const v of ['2015-02-29','2015-02-31','2015-13-01','03/04/2015','08/27/2014','28/07/17']) assert.ok(csv.prepareOfficialImport(input(v),context).errors.some(e=>e.includes('Data_nascimento')),v);
});
test('official writer validates all 401 rows before allocating even the first batch',async()=>{
  reset();const items=Array.from({length:401},(_,i)=>({id:String(i),payload:{Data_nascimento:i===400?'2015-02-31':'2015-04-04'}}));
  await assert.rejects(csv.importOfficialServers(items));assert.deepEqual(csv.effects,{batches:0,sets:[],commits:0});
  await csv.importOfficialServers([{id:'empty',payload:{Data_nascimento:''}},{id:'iso',payload:{Data_nascimento:'2016-02-29'}}]);
  assert.equal(csv.effects.sets[0].payload.Data_nascimento,'');assert.equal(csv.effects.sets[1].payload.Data_nascimento,'2016-02-29');
});
test('legacy preserves ISO, converts all safe forms and keeps empty semantics',async()=>{
  reset();const values=['2015-04-04','27/08/2014','08/27/2014','2014/08/27','04/04/2015',''];
  const items=values.map((v,i)=>({Id:String(i),Nome:'Ana',Data_nascimento:v}));
  const original=structuredClone(items);await csv.importServers(items,p=>({...p,chapelId:'c'}));
  assert.deepEqual(csv.effects.sets.map(s=>s.payload.Data_nascimento),['2015-04-04','2014-08-27','2014-08-27','2014-08-27','2015-04-04','']);
  assert.deepEqual(items,original);assert.equal(csv.effects.sets[0].payload.chapelId,'c');
});
test('legacy ambiguous/invalid row after 400 valid rows prevents all writes',async()=>{
  for(const v of ['03/04/2015','31/02/2015','28/07/17']) {
    reset();const items=Array.from({length:401},(_,i)=>({Id:String(i),Nome:'Ana',Data_nascimento:i===400?v:'27/08/2014'}));
    await assert.rejects(csv.importServers(items,p=>p),v==='03/04/2015'?/ambígua/:/inválida/);
    assert.deepEqual(csv.effects,{batches:0,sets:[],commits:0});
  }
});
test('final scoped legacy payload is validated before any batch',async()=>{
  reset();await assert.rejects(csv.importServers([{Id:'a',Data_nascimento:'27/08/2014'},{Id:'b',Data_nascimento:'27/08/2014'}],p=>({...p,Data_nascimento:p.id==='b'?'2015-02-31':p.Data_nascimento})));
  assert.equal(csv.effects.batches,0);
});
test('routing distinguishes official, genuine legacy and malformed official without fallback',()=>{
  const official=csv.serializeOfficialCsv([sample]);assert.equal(csv.detectCsvContract(official),'official');
  assert.equal(csv.detectCsvContract(official.slice(1)),'official');
  assert.equal(csv.detectCsvContract('Nome;Data nascimento\r\nAna;27/08/2014'),'legacy');
  const oldHeaders=csv.OFFICIAL_HEADERS.filter(h=>!['schema_version','chapelId'].includes(h));
  assert.equal(csv.detectCsvContract(oldHeaders.join(';')+'\r\n'),'legacy');
  for(const bad of [official.replace('schema_version','schema_versoin'),official.replace('schema_version;',''),official.replace(';Id;Nome;',';Nome;Id;'),official.replace('Data_nascimento','Data_nasciment'),official.replace('\r\n1;','\r\n2;'),official.replace(';chapelId;',';'),official.replaceAll(';',',')]) assert.equal(csv.detectCsvContract(bad),'malformed');
});
test('official exporter blocks safe legacy, ambiguous and invalid values without mutating them',()=>{
  for(const v of ['27/08/2014','04/04/2015','03/04/2015','28/07/17','2015-02-31']) {
    const servers=[sample,{...sample,id:'pending',Data_nascimento:v}];const before=structuredClone(servers);
    assert.throws(()=>csv.serializeOfficialCsv(servers),/pendente de normalização/);assert.deepEqual(servers,before);
  }
  for(const v of ['',null,undefined,' ']) {
    const text=csv.serializeOfficialCsv([{...sample,Data_nascimento:v}]);assert.equal(csv.parseCsv(text)[1][3],'');
  }
});
test('legacy preserves other-column mappings, formula escape roundtrip remains exact',async()=>{
  reset();await csv.importServers([{Id:'x',Nome:' Ana ',Data_nascimento:'27/08/2014',Sexo:'f',Tipo:'formando',Estado:'inativo',Batizado:'s',Whatsapp_mae:'+55 (11) 99999-9999',Bairro:'Centro'}],p=>p);
  const p=csv.effects.sets[0].payload;assert.equal(p.Nome,'Ana');assert.equal(p.Sexo,'Femenino');assert.equal(p.Tipo,'Formando');assert.equal(p.Estado,'Inativo');assert.equal(p.Batizado,'Sim');assert.equal(p.Whatsapp_mae,'5511999999999');assert.equal(p.Bairro,'Centro');
  for(const Nome of ['=SUM(A1)','+Ana','@Ana',"'Ana",'Ana; "Silva"\nFilha']) {const p=csv.prepareOfficialImport(csv.serializeOfficialCsv([{...sample,Nome}]),context);assert.deepEqual(p.errors,[]);assert.equal(p.items[0].payload.Nome,Nome);}
});
