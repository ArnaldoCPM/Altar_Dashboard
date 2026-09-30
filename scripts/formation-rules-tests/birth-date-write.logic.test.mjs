import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const asModule = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const datesUrl = asModule(await readFile(new URL('../../js/services/birth-date.service.js', import.meta.url), 'utf8'));
const dates = await import(datesUrl);
const repoSource = (await readFile(new URL('../../js/data/servers.js', import.meta.url), 'utf8'))
    .replace(/^import .*;\r?\n/gm, '');
// Import the real repository with all Firebase effects replaced by in-memory stubs.
const repo = await import(asModule(`
import { validateBirthDatePayload } from '${datesUrl}';
export const writes=[]; export const records=new Map();
const db={}; const doc=(...args)=>args;
const setDoc=async(ref,payload,options)=>{writes.push({ref,payload:{...payload},options});const id=ref.at(-1);records.set(id,{...records.get(id),...payload});};
const deleteDoc=()=>{throw Error('Unexpected delete');};
${repoSource}`));
const uiSource = await readFile(new URL('../../js/modules/servers/index.js', import.meta.url), 'utf8');
const modalSource = uiSource.slice(uiSource.indexOf('let birthDateState ='), uiSource.indexOf('export async function initialize'));
const ui = await import(asModule(`
import { createBirthDateEditState,birthDateEditPatch,assertBirthDateWrite } from '${datesUrl}';
export function harness(document, createServer, data) {
const errors=[]; const error=m=>errors.push(m); const canEdit=()=>true; const canCreateServer=()=>true;
const getCurrentChapelId=()=> 'chapel'; const canAccessAdminMode=()=>true;
const ensureHistoricalChapelOption=()=>{}; const canChangeChapel=()=>true; const scoped=p=>p;
const cleanStr=v=>String(v||'').toLowerCase(); const age=()=>null; const calculateAge=()=>null;
${modalSource}
return {openEdit,openNew,bindModal,errors};
}`));
function formHarness(server) {
    const elements = new Map();
    const document = {
        getElementById(id) { if (!elements.has(id)) elements.set(id, {value:'',checked:false,disabled:false,textContent:'',classList:{hidden:false,add(){},remove(){},toggle(_,v){this.hidden=v;}}, reset(){for(const el of elements.values()){el.value='';el.checked=false;}}}); return elements.get(id); },
        querySelectorAll:()=>[],
    };
    const h=ui.harness(document,repo.createServer,server?[server]:[]); h.bindModal();
    if(server){repo.records.set(server.id,{...server});h.openEdit(server);}else h.openNew();
    return {...h,el:id=>document.getElementById(id),submit:()=>document.getElementById('server-form').onsubmit({preventDefault(){}})};
}
test('repository create rejects impossible and legacy values before any write', async () => {
    for (const value of ['2015-02-31','2015-02-29','03/04/2015','08/27/2014',null]) {
        const before=repo.writes.length; await assert.rejects(repo.createServer({id:'new',Data_nascimento:value})); assert.equal(repo.writes.length,before);
    }
    for(const value of ['2016-02-29','']) { await repo.createServer({id:'new',Data_nascimento:value}); assert.equal(repo.records.get('new').Data_nascimento,value); }
});
test('repository update preserves partial payloads and rejects invalid supplied birth dates', async () => {
    repo.records.set('partial',{Data_nascimento:'03/04/2015',Idade:11});
    await repo.updateServer('partial',{Nome:'Novo nome'});
    assert.deepEqual(repo.records.get('partial'),{Data_nascimento:'03/04/2015',Idade:11,Nome:'Novo nome'});
    assert.deepEqual(repo.writes.at(-1).payload,{Nome:'Novo nome'});
    await assert.rejects(repo.updateServer('partial',{Data_nascimento:'2015-02-31'}));
    await repo.updateServer('partial',{Data_nascimento:'2015-04-04'});
    assert.deepEqual(repo.writes.at(-1).payload,{Data_nascimento:'2015-04-04'});
});
test('real edit form preserves legacy, ambiguous, invalid, ISO and historical empty values', async () => {
    const cases=[['27/08/2014','form-nome','Nome'],['03/04/2015','form-wp-mae','Whatsapp_mae'],['28/07/17','form-capela','Capela'],['2015-04-04','form-nome','Nome'],[null,'form-nome','Nome'],['','form-nome','Nome']];
    for(const [raw,field,key] of cases){
        const h=formHarness({id:'edit',Nome:'Antes',Data_nascimento:raw,Idade:99});
        assert.equal(h.el('form-data-nasc').value,dates.isValidBirthDateIso(raw)?raw:'');
        if(raw&&!dates.isValidBirthDateIso(raw)) assert.ok(h.el('form-data-nasc-warning').textContent.includes(raw));
        h.el(field).value=key==='Whatsapp_mae'?'5511999999999':'Depois';await h.submit();
        assert.deepEqual(h.errors,[]);assert.equal(repo.records.get('edit').Data_nascimento,raw);
        assert.equal(Object.hasOwn(repo.writes.at(-1).payload,'Data_nascimento'),false);
        assert.equal(Object.hasOwn(repo.writes.at(-1).payload,'Idade'),false);
        assert.equal(repo.records.get('edit').Idade,99);
        assert.equal(repo.records.get('edit')[key],h.el(field).value);
        assert.deepEqual(repo.writes.at(-1).ref.slice(1,-1),['artifacts','default-app-id','public','data','servers']);
    }
});
test('real form writes an explicitly chosen ISO but rejects an impossible replacement', async () => {
    const h=formHarness({id:'explicit',Data_nascimento:'03/04/2015'});
    h.el('form-data-nasc').value='2015-04-03';h.el('form-data-nasc').oninput();await h.submit();
    assert.equal(repo.writes.at(-1).payload.Data_nascimento,'2015-04-03');
    const before=repo.writes.length;h.el('form-data-nasc').value='2015-02-31';h.el('form-data-nasc').oninput();await h.submit();
    assert.equal(repo.writes.length,before);assert.equal(h.errors.length,1);
    assert.deepEqual(dates.birthDateEditPatch(dates.createBirthDateEditState('03/04/2015'),'2015-04-03',{changed:true}),{Data_nascimento:'2015-04-03'});
});
test('empty control after interaction cannot erase a date without explicit removal', async () => {
    const h=formHarness({id:'clear',Data_nascimento:'03/04/2015'});const before=repo.writes.length;
    h.el('form-data-nasc').oninput();await h.submit();assert.equal(repo.writes.length,before);
    h.el('form-data-nasc-clear').checked=true;h.el('form-data-nasc-clear').onchange({target:{checked:true}});
    assert.equal(h.el('form-data-nasc').disabled,true);await h.submit();assert.equal(repo.records.get('clear').Data_nascimento,'');
});
test('opening a different record resets date edits and removal intent', async () => {
    const h=formHarness({id:'reset',Data_nascimento:'2015-04-04'});
    h.el('form-data-nasc-clear').checked=true;
    h.openEdit({id:'reset',Data_nascimento:'28/07/17'});
    assert.equal(h.el('form-data-nasc-clear').checked,false);assert.equal(h.el('form-data-nasc').disabled,false);
    await h.submit();assert.equal(Object.hasOwn(repo.writes.at(-1).payload,'Data_nascimento'),false);
});
test('real create form allows empty or ISO and never writes derived Idade', async () => {
    for(const value of ['','2015-04-04']) {const h=formHarness();h.el('form-data-nasc').value=value;await h.submit();assert.deepEqual(h.errors,[]);assert.equal(repo.writes.at(-1).payload.Data_nascimento,value);assert.equal(Object.hasOwn(repo.writes.at(-1).payload,'Idade'),false);}
    const h=formHarness();h.el('form-data-nasc').value='2015-02-31';const before=repo.writes.length;await h.submit();assert.equal(repo.writes.length,before);assert.equal(h.errors.length,1);
});
