import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const base=new URL('../../',import.meta.url);
const asUrl=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const coreUrl=asUrl(await readFile(new URL('js/services/birth-date.service.js',base),'utf8'));
const core=await import(coreUrl);
const utilsUrl=asUrl((await readFile(new URL('js/utils.js',base),'utf8')).replace('./services/birth-date.service.js',coreUrl));
const utils=await import(utilsUrl);
const kpi=await import(asUrl((await readFile(new URL('js/modules/dashboard/views/kpis.view.js',base),'utf8')).replace('../../../utils.js',utilsUrl)));
const formation=await import(asUrl((await readFile(new URL('js/modules/formation/services/date.service.js',base),'utf8')).replace('../../../services/birth-date.service.js',coreUrl)));
test('read resolves only unique calendar dates and rejects coercion',()=>{
 for(const value of ['2014-08-27','2014/08/27','27/08/2014','08/27/2014']) assert.equal(core.resolveBirthDate(value),'2014-08-27');
 assert.equal(core.resolveBirthDate('04/04/2015'),'2015-04-04');
 for(const value of ['',null,undefined,' ',' 2015-04-03 ','03/04/2015','28/07/17','1900-02-29','2015-02-31',{},42,new Date(),'2015-04-03junk']) assert.equal(core.resolveBirthDate(value),null);
});
test('age is pure calendar arithmetic across birthdays, leap years and year boundaries',()=>{
 const cases=[['2015-04-03','2026-09-30',11],['2015-04-03','2026-04-03',11],['2015-04-04','2026-04-03',10],['2015-12-31','2026-01-01',10],['2016-02-29','2020-02-29',4],['2016-02-29','2021-02-28',4],['2016-02-29','2021-03-01',5],['2026-09-30','2026-09-30',0],['2099-01-01','2026-09-30',null],['0001-01-01','0002-01-01',1]];
 const NativeDate=globalThis.Date;globalThis.Date=class {constructor(){throw Error('Date forbidden');}};
 try{for(const [birth,ref,expected] of cases) assert.equal(core.ageOnCalendar(birth,ref),expected);for(const birth of ['',null,undefined,'03/04/2015','28/07/17'])assert.equal(core.ageOnCalendar(birth,'2026-09-30'),null);assert.equal(core.ageOnCalendar('2015-04-03','2026-02-31'),null);}finally{globalThis.Date=NativeDate;}
});
test('general age and dashboard never fall back to Idade',()=>{
 for(const Idade of ['14','12abc','-5','12.9'])for(const Data_nascimento of ['',null,'28/07/17','03/04/2015'])assert.equal(kpi.getServerAge({Data_nascimento,Idade},'2026-09-30'),null);
 assert.equal(kpi.getServerAge({Data_nascimento:'2015-04-03',Idade:'99'},'2026-09-30'),11);
 assert.equal(utils.calculateAge('04/04/2015','2026-09-30'),11);
});
test('dashboard excludes unknown ages from average and preserves zero',()=>{
 const elements={};const previous=globalThis.document;globalThis.document={getElementById:id=>elements[id]??={}};
 try{for(const [rows,expected] of [[[{Data_nascimento:'2015-04-03'},{}],'11.0'],[[{},{}],'—'],[[{Data_nascimento:'2026-09-30'},{}],'0.0']]){kpi.updateKPIs(rows,'2026-09-30');assert.ok(elements['kpi-edad'].innerHTML.startsWith(expected));}}finally{globalThis.document=previous;}
});
test('formation adapts roster and encounter reference values, never birth timestamps',()=>{
 const ref=new Date(2026,8,30);for(const reference of ['2026-09-30',ref,{toDate:()=>ref}])for(const birth of ['2015-04-04','04/04/2015','2015/04/04'])assert.equal(formation.ageOn(birth,reference),11);
 for(const birth of ['03/04/2015','28/07/17','2099-01-01',new Date(2015,3,4)])assert.equal(formation.ageOn(birth,ref),null);
});
test('chart excludes unknowns and preserves existing range boundaries',async()=>{
 const source=await readFile(new URL('js/modules/dashboard/views/dashboard.view.js',base),'utf8');
 const start=source.indexOf('const tiposEnRangos =');const end=source.indexOf("setChart('edades'",start);
 const classify=Function('data','getServerAge','cleanStr',source.slice(start,end)+';return tiposEnRangos;');
 const rows=[null,5,6,11,12,24,25].map(age=>({age,Tipo:'Candidato'}));
 assert.deepEqual(classify(rows,s=>s.age,s=>s.toLowerCase()),{'6-11':{candidato:2,formando:0,instituido:0},'12-24':{candidato:2,formando:0,instituido:0}});
 assert.match(source,/Number.isInteger\(edad\)/);
});

test('server list/detail age helpers ignore legacy and preserve modal zero',async()=>{
 for(const name of ['js/modules/servers/index.js','js/modules/servers/views/server-detail.view.js']){
  const source=await readFile(new URL(name,base),'utf8');
  const expression=source.match(/const age = (.*);/)[1];
  const age=Function('calculateAge','return '+expression)(value=>utils.calculateAge(value,'2026-09-30'));
  assert.equal(age({Data_nascimento:'',Idade:'14'}),null);
  assert.equal(age({Data_nascimento:'2026-09-30',Idade:'14'}),0);
  if(name.endsWith('/index.js'))assert.ok(source.includes("value=age(s)??''"));
 }
});
test('formation safe legacy and reference boundaries match central ages',()=>{
 for(const birth of ['2014-08-27','2014/08/27','27/08/2014','08/27/2014'])assert.equal(formation.ageOn(birth,{toDate:()=>new Date(2026,7,27)}),12);
 assert.equal(formation.ageOn('2014-08-27',new Date(2026,7,26)),11);
 assert.equal(formation.ageOn('2014-08-27',new Date(NaN)),null);
});
