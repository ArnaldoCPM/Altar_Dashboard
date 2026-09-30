import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadQuality } from './birth-date-quality.test-support.mjs';
test('transaction updates only birth date after commit, including retries',async()=>{
 const {repo}=await loadQuality();repo.fixture.attempts=3;repo.fixture.data={Data_nascimento:'03/04/2015',Idade:9,Nome:'Ana'};
 const result=await repo.saveReviewedBirthDate({serverId:'real',expected:{present:true,value:'03/04/2015'},nextIso:'2015-04-03'});
 assert.equal(result.status,'saved');assert.equal(repo.fixture.reads,3);assert.equal(repo.fixture.writes.length,1);
 assert.deepEqual(repo.fixture.writes[0].patch,{Data_nascimento:'2015-04-03'});assert.equal(repo.fixture.writes[0].ref.at(-1),'real');assert.equal(repo.fixture.data.Idade,9);assert.equal(repo.fixture.data.Nome,'Ana');
});
test('changed date and deleted document never write or recreate',async()=>{
 const {repo}=await loadQuality();const args={serverId:'s',expected:{present:true,value:'different'},nextIso:'2015-04-03'};
 assert.equal((await repo.saveReviewedBirthDate(args)).status,'conflict');repo.fixture.exists=false;
 assert.equal((await repo.saveReviewedBirthDate(args)).status,'not-found');assert.equal(repo.fixture.writes.length,0);
});
test('comparison distinguishes absent, null, empty, whitespace and non-textual values',async()=>{
 const {repo}=await loadQuality();const values=[{}, {Data_nascimento:null},{Data_nascimento:''},{Data_nascimento:' '},{Data_nascimento:0},{Data_nascimento:false},{Data_nascimento:{a:[1,'x']}}];
 for(let i=0;i<values.length;i++) for(let j=0;j<values.length;j++) assert.equal(repo.sameBirthDateState(repo.birthDateState(values[i]),repo.birthDateState(values[j])),i===j);
 assert.equal(repo.sameBirthDateState({present:true,value:{a:[1,2],b:null}},{present:true,value:{b:null,a:[1,2]}}),true);
 assert.equal(repo.sameBirthDateState({present:true,value:new Date(0)},{present:true,value:new Date(0)}),true);
 assert.equal(repo.sameBirthDateState({present:true,value:new Uint8Array([1])},{present:true,value:new Uint8Array([2])}),false);
 for(const original of values){repo.fixture.data=original;assert.equal((await repo.saveReviewedBirthDate({serverId:'s',expected:repo.birthDateState(structuredClone(original)),nextIso:'2015-04-03'})).status,'saved');}
});
test('invalid ISO, malformed IDs and unauthorized roles fail before reading',async()=>{
 const {repo}=await loadQuality();const args={serverId:'s',expected:{present:false},nextIso:'2015-04-03'};
 for(const nextIso of ['','2015-02-31','03/04/2015']) await assert.rejects(repo.saveReviewedBirthDate({...args,nextIso}));
 for(const serverId of ['','a/b',null]) await assert.rejects(repo.saveReviewedBirthDate({...args,serverId}));
 repo.fixture.admin=false;await assert.rejects(repo.saveReviewedBirthDate(args));assert.equal(repo.fixture.reads,0);assert.equal(repo.fixture.writes.length,0);
});
test('canonical snapshot identity cannot be replaced by stored id',async()=>{
 const {repo}=await loadQuality();const source=await readFile(new URL('../../js/modules/servers/index.js',import.meta.url),'utf8');
 const mapper=source.match(/data=snap\.docs\.map\((.*?)\);render/)[1];
 const server=Function('d',`return (${mapper})(d)` )({id:'real',data:()=>({id:'victim',Data_nascimento:'03/04/2015'})});
 await repo.saveReviewedBirthDate({serverId:server.id,expected:repo.birthDateState(server),nextIso:'2015-04-03'});
 assert.equal(repo.fixture.writes[0].ref.at(-1),'real');
});

test('reviewed nested value is isolated from mutation of the listener data',async()=>{
 const {repo}=await loadQuality();const raw={Data_nascimento:{nested:['original']}};
 const expected=repo.birthDateState(raw);raw.Data_nascimento.nested[0]='changed';
 assert.deepEqual(expected.value,{nested:['original']});
 repo.fixture.data=raw;assert.equal((await repo.saveReviewedBirthDate({serverId:'s',expected,nextIso:'2015-04-03'})).status,'conflict');assert.equal(repo.fixture.writes.length,0);
});
