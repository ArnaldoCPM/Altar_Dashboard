import { db, onSnapshot } from "../../firebase.js";
import { buildServersQuery } from "../../serverQuery.js";
import { getAllChapels, getActiveChapels, normalizeChapelName } from "../../data/chapels.js";
import { createServer, deleteServer, getServerById } from "../../data/servers.js";
import { canAccessAdminMode } from "../../permissions.js";
import { canCreateServer, canDelete, canEdit, canChangeChapel } from "../../authorization.js";
import { getCurrentChapelId, getCurrentProfile } from "../../session.js";
import { calculateAge, cleanStr, generateWpLink } from "../../utils.js";
import { renderServersWorkspace } from "./views/servers.view.js";
import { csvToObjects, importServers } from "./services/import.service.js";
import { loadServerHistory } from "./services/server-history.service.js";
import { renderServerDetail } from "./views/server-detail.view.js";

let unsubscribe = null, data = [], chapels = [], allChapels = [], mount = null;
let selectedServerId = null, history = null, historyStatus = "idle", historyError = null, historyVersion = 0;
let visibleHistorical = 10;
let listFilters = { search: "", chapel: "all", state: "all", allergy: "all", type: "all" };
const age = s => calculateAge(s?.Data_nascimento) ?? (Number.isNaN(parseInt(s?.Idade)) ? null : parseInt(s?.Idade));
const error = message => { document.getElementById('error-alert-text').textContent=message; document.getElementById('error-alert').classList.remove('hidden'); };
const chapelByName = (name, list = chapels) => list.find((chapel) => normalizeChapelName(chapel.name) === normalizeChapelName(name));
const scoped = (payload, existing=null) => canAccessAdminMode() ? {...payload, chapelId: payload.chapelId ?? chapelByName(payload.Capela)?.id ?? existing?.chapelId ?? null} : {...payload, chapelId:getCurrentChapelId() ?? existing?.chapelId ?? null, Capela:getCurrentProfile()?.chapelName ?? existing?.Capela ?? payload.Capela};
function ensureHistoricalChapelOption(chapelId) { const select = document.getElementById('form-capela'); const chapel = allChapels.find((item) => item.id === chapelId); if (!chapel || [...select.options].some((option) => option.value === chapel.name)) return; const option = new Option(`${chapel.name} (inativa)`, chapel.name); option.disabled = true; select.add(option); }
function render() {
    if (!mount) return;
    if (selectedServerId) { renderDetail(); return; }
    const { search, chapel, state, allergy, type } = listFilters;
    const q = search.toLowerCase();
    const filtered = data
        .filter((s) => (s.Nome || '').toLowerCase().includes(q) || (s.id || '').toLowerCase().includes(q))
        .filter((s) => chapel === 'all' || s.Capela === chapel)
        .filter((s) => state === 'all' || s.Estado === state)
        .filter((s) => allergy === 'all' || (['sim', 'si', 's'].includes(cleanStr(s.Possui_alergia_doenca)) ? 'Sim' : 'Não') === allergy)
        .filter((s) => type === 'all' || cleanStr(s.Tipo) === cleanStr(type));
    const body = document.getElementById('servers-table-body');
    body.innerHTML = '';
    document.getElementById('servers-empty').classList.toggle('hidden', filtered.length > 0);
    filtered.forEach((server) => {
        const row = document.createElement('tr');
        row.className = 'border-t text-sm text-slate-600';
        const candidate = server.Whatsapp_candidato
            ? `<a target="_blank" class="text-emerald-600" href="${generateWpLink(server.Whatsapp_candidato, `Olá ${server.Nome}, tudo bem? Aqui é da coordenação...`)}">📲 Candidato</a>`
            : '—';
        row.innerHTML = `<td class="p-4"><b>${server.Nome || 'Sem nome'}</b><div class="text-xs text-slate-400">${server.id}</div></td><td class="p-4">${age(server) ?? '—'} anos<br><span class="text-xs">${server.Sexo || '—'}</span></td><td class="p-4">${server.Capela || 'S/D'}</td><td class="p-4">${candidate}</td><td class="p-4"><button data-open class="text-slate-700 font-bold">Abrir</button>${canEdit(server) ? '<button data-edit class="text-amber-600 font-bold ml-2">Editar</button>' : ''} ${canDelete(server) ? '<button data-delete class="text-rose-600 font-bold ml-2">Apagar</button>' : ''}</td>`;
        row.querySelector('[data-open]')?.addEventListener('click', () => openDetail(server.id));
        row.querySelector('[data-edit]')?.addEventListener('click', () => openEdit(server));
        row.querySelector('[data-delete]')?.addEventListener('click', () => remove(server));
        body.append(row);
    });
}
function captureListFilters() {
    if (!mount || selectedServerId) return;
    const search = mount.querySelector('#servers-search');
    const chapel = mount.querySelector('#servers-filter-chapel');
    const state = mount.querySelector('#servers-filter-state');
    const allergy = mount.querySelector('#servers-filter-allergy');
    const type = mount.querySelector('#servers-filter-type');
    if (!search || !chapel || !state || !allergy || !type) throw new Error('A lista de servidores não foi montada corretamente.');
    listFilters = {
        search: search.value,
        chapel: chapel.value,
        state: state.value,
        allergy: allergy.value,
        type: type.value,
    };
}
function mountListWorkspace() {
    renderServersWorkspace(mount, { isAdmin: canAccessAdminMode(), canCreate: canCreateServer(getCurrentChapelId()) });
    const chapel = mount.querySelector('#servers-filter-chapel');
    chapels.forEach((item) => chapel.add(new Option(item.name, item.name)));
    Object.entries({ 'servers-search': 'search', 'servers-filter-chapel': 'chapel', 'servers-filter-state': 'state', 'servers-filter-allergy': 'allergy', 'servers-filter-type': 'type' }).forEach(([id, key]) => {
        const control = mount.querySelector(`#${id}`);
        control.value = listFilters[key];
        control.addEventListener(id === 'servers-search' ? 'input' : 'change', () => { captureListFilters(); render(); });
    });
    mount.querySelector('#servers-add')?.addEventListener('click', openNew);
    mount.querySelector('#servers-import-toggle')?.addEventListener('click', () => mount.querySelector('#servers-import-panel').classList.toggle('hidden'));
    mount.querySelector('#servers-csv-file')?.addEventListener('change', (event) => {
        const file = event.target.files[0]; if (!file || !canAccessAdminMode()) return;
        const reader = new FileReader();
        reader.onload = () => { const items = csvToObjects(reader.result); if (!items?.length) return error('O formato do ficheiro CSV não foi reconhecido.'); const invalid = items.filter(item => !chapelByName(item.Capela)); if (invalid.length) return error(`A importação foi cancelada: ${invalid.length} linha(s) têm Capela sem correspondência ativa. Corrija o CSV antes de continuar.`); document.dispatchEvent(new CustomEvent('shell:confirm', { detail: { title: 'Sincronizar a base de dados', message: `Foram detetados ${items.length} servidores válidos. Deseja continuar?`, onConfirm: async () => { const bar = mount.querySelector('#servers-upload-progress'), fill = mount.querySelector('#servers-upload-progress-bar'); bar.classList.remove('hidden'); try { await importServers(items, scoped, progress => fill.style.width = progress + '%'); event.target.value = ''; } catch (err) { error('Ocorreu um erro ao carregar os lotes: ' + err.message); } finally { bar.classList.add('hidden'); } } } })); };
        reader.readAsText(file, 'UTF-8');
    });
}
function selectedServer() { return data.find((server) => server.id === selectedServerId) || null; }
function renderDetail() {
    const server = selectedServer();
    if (!server) { selectedServerId = null; mountListWorkspace(); render(); return; }
    renderServerDetail(mount, { server, history, historyStatus, historyError, visibleHistorical }, { action: (action) => {
        if (action === 'back') closeDetail();
        else if (action === 'more-history') { visibleHistorical += 10; renderDetail(); }
        else refreshHistory();
    } });
}
async function openDetail(serverId) {
    if (!data.some((server) => server.id === serverId)) {
        try { const fetched = await getServerById(serverId); if (fetched && !data.some((server) => server.id === fetched.id)) data = [...data, fetched]; } catch (_) { /* The normal collection subscription remains the source of truth. */ }
    }
    selectedServerId = serverId; history = null; historyError = null; historyStatus = 'loading'; visibleHistorical = 10; renderDetail();
    await refreshHistory();
}
async function refreshHistory() {
    const id = selectedServerId; if (!id) return;
    const version = ++historyVersion; historyStatus = 'loading'; historyError = null; renderDetail();
    try { const result = await loadServerHistory(id); if (version !== historyVersion || selectedServerId !== id) return; history = result; historyStatus = 'ready'; }
    catch (err) { if (version !== historyVersion || selectedServerId !== id) return; history = null; historyStatus = 'error'; historyError = err?.message || 'Tente novamente.'; }
    renderDetail();
}
function closeDetail() { historyVersion += 1; selectedServerId = null; history = null; historyStatus = 'idle'; historyError = null; visibleHistorical = 10; mountListWorkspace(); render(); }
function openNew(){ if(!canCreateServer(getCurrentChapelId()))return; const form=document.getElementById('server-form');form.reset();const last=data.reduce((m,s)=>Math.max(m,parseInt((s.id||'').match(/\d+/)?.[0]||0)),0);document.getElementById('edit-modal-title').textContent='Adicionar novo servidor';document.getElementById('form-id').value=`SRV-${String(last+1).padStart(4,'0')}`;const chapel=document.getElementById('form-capela');chapel.disabled=!canAccessAdminMode();if(!canAccessAdminMode())chapel.value=getCurrentProfile()?.chapelName||'';document.getElementById('edit-server-modal').classList.remove('hidden'); }
function openEdit(s){if(!canEdit(s))return;document.getElementById('edit-modal-title').textContent=`Editar Servidor: ${s.id}`;ensureHistoricalChapelOption(s.chapelId);for(const [id,key] of [['form-id','id'],['form-nome','Nome'],['form-data-nasc','Data_nascimento'],['form-sexo','Sexo'],['form-capela','Capela'],['form-tipo','Tipo'],['form-estado','Estado'],['form-desc-alergia','Descricao_alergia_doenca'],['form-nome-mae','Nome_mae'],['form-wp-candidato','Whatsapp_candidato'],['form-wp-mae','Whatsapp_mae'],['form-nome-pai','Nome_pai'],['form-wp-pai','Whatsapp_pai'],['form-nome-tutor','Nome_tutor_guardiao'],['form-wp-tutor','Whatsapp_tutor_guardiao']]) document.getElementById(id).value=s[key]||'';document.getElementById('form-idade').value=age(s)||'';document.getElementById('form-capela').disabled=!canAccessAdminMode();document.getElementById('form-batizado').checked=['sim','si','s'].includes(cleanStr(s.Batizado));document.getElementById('form-comunion').checked=['sim','si','s'].includes(cleanStr(s.Primeira_eucaristia));document.getElementById('form-crisma').checked=['sim','si','s'].includes(cleanStr(s.Crismado));document.getElementById('form-tem-alergia').value=['sim','si','s'].includes(cleanStr(s.Possui_alergia_doenca))?'Sim':'Não';document.querySelectorAll('input[name="form-horario-estudo"]').forEach(i=>i.checked=(s.Horario_estudo||'').split(';').map(cleanStr).includes(cleanStr(i.value)));document.getElementById('edit-server-modal').classList.remove('hidden');}
function remove(s){ if(!canDelete(s))return; document.dispatchEvent(new CustomEvent('shell:confirm',{detail:{title:'Eliminar Servidor',message:`Tem a certeza absoluta de que deseja eliminar "${s.Nome}" (${s.id})?`,onConfirm:async()=>{try{await deleteServer(s.id)}catch(e){error('Não foi possível eliminar o registo: '+e.message)}}}})); }
function bindModal(){const form=document.getElementById('server-form');form.onsubmit=async e=>{e.preventDefault();const id=document.getElementById('form-id').value, existing=data.find(s=>s.id===id);if(existing?!canEdit(existing):!canCreateServer(getCurrentChapelId()))return;const value=i=>document.getElementById(i).value;const payload=scoped({id,Nome:value('form-nome').trim(),Data_nascimento:value('form-data-nasc'),Sexo:value('form-sexo'),Capela:value('form-capela').trim(),Tipo:value('form-tipo'),Estado:value('form-estado'),Horario_estudo:[...document.querySelectorAll('input[name="form-horario-estudo"]:checked')].map(i=>i.value).join(';'),Batizado:document.getElementById('form-batizado').checked?'Sim':'Não',Primeira_eucaristia:document.getElementById('form-comunion').checked?'Sim':'Não',Crismado:document.getElementById('form-crisma').checked?'Sim':'Não',Possui_alergia_doenca:value('form-tem-alergia'),Descricao_alergia_doenca:value('form-desc-alergia').trim(),Nome_mae:value('form-nome-mae').trim(),Whatsapp_candidato:value('form-wp-candidato').replace(/\D/g,''),Whatsapp_mae:value('form-wp-mae').replace(/\D/g,''),Nome_pai:value('form-nome-pai').trim(),Whatsapp_pai:value('form-wp-pai').replace(/\D/g,''),Nome_tutor_guardiao:value('form-nome-tutor').trim(),Whatsapp_tutor_guardiao:value('form-wp-tutor').replace(/\D/g,'')},existing);if(existing&&!canChangeChapel(existing,payload.chapelId))return;try{await createServer(payload);document.getElementById('edit-server-modal').classList.add('hidden')}catch(err){error('Não foi possível guardar o registo: '+err.message)}};}
export async function initialize({mountElement}){destroy();mount=document.createElement('div');mount.dataset.moduleRoot='servers';mountElement.append(mount);[chapels,allChapels]=await Promise.all([getActiveChapels(),getAllChapels()]);mountListWorkspace();bindModal();unsubscribe=onSnapshot(buildServersQuery(),snap=>{data=snap.docs.map(d=>({id:d.id,...d.data()}));render()},err=>error('Erro ao carregar servidores: '+err.message));}
export function destroy(){unsubscribe?.();unsubscribe=null;historyVersion += 1;selectedServerId=null;history=null;historyStatus='idle';historyError=null;visibleHistorical=10;listFilters={search:'',chapel:'all',state:'all',allergy:'all',type:'all'};document.getElementById('server-form')&&(document.getElementById('server-form').onsubmit=null);document.getElementById('edit-server-modal')?.classList.add('hidden');mount?.remove();mount=null;data=[];chapels=[];allChapels=[];}
export function refresh(){render();}
