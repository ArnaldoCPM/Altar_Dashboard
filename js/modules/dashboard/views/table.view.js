import { cleanStr, generateWpLink } from "../../../utils.js";
import { getServerAge } from "./kpis.view.js";
function renderTable(data, pagination, getActions) {
    const tableBody = document.getElementById('table-body');
    const emptyState = document.getElementById('empty-state');
    const paginationContainer = document.getElementById('pagination-container');
    tableBody.innerHTML = '';

    // Guardar datos filtrados para paginación

    if (data.length === 0) {
        emptyState.classList.remove('hidden');
        paginationContainer.classList.add('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }

    // Calcular rango de items para la página actual
    const startIdx = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIdx = startIdx + pagination.itemsPerPage;
    const pageData = data.slice(startIdx, endIdx);

    pageData.forEach(server => {
        const row = document.createElement('tr');
        row.className = "hover:bg-slate-50 transition-colors";

        const initials = server.Nome ? server.Nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : 'SR';

        const isActivo = cleanStr(server.Estado) === 'ativo';
        const statusColor = isActivo ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800';
        const statusText = isActivo ? 'Ativo' : 'Inativo';

        // Mapeo de colores para Tipos
        let typeColor = 'bg-slate-100 text-slate-800';
        const roleType = cleanStr(server.Tipo);
        if (roleType.includes('cand')) {
            typeColor = 'bg-amber-100 text-amber-800';
        } else if (roleType.includes('form')) {
            typeColor = 'bg-emerald-100 text-emerald-800';
        } else if (roleType.includes('inst') || roleType.includes('serv')) {
            typeColor = 'bg-indigo-100 text-indigo-800';
        }

        let displayTipo = server.Tipo || 'Candidato';
        if (cleanStr(displayTipo).includes('serv')) {
            displayTipo = 'Instituído';
        }

        const isFeminino = ['femenino', 'feminino', 'f'].includes(cleanStr(server.Sexo));
        const genderColor = isFeminino ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800';
        const genderText = isFeminino ? 'Feminino' : 'Masculino';

        const tieneAlergia = ['sim', 'si', 's'].includes(cleanStr(server.Possui_alergia_doenca));
        const alertClass = tieneAlergia
            ? 'bg-rose-50 border-l-4 border-rose-500 font-medium text-rose-700'
            : 'text-slate-500';

        const batizadoIcon = ['sim', 'si', 's'].includes(cleanStr(server.Batizado)) ? '\u{1F7E2}' : '\u26AA';
        const eucaristiaIcon = ['sim', 'si', 's'].includes(cleanStr(server.Primeira_eucaristia)) ? '\u{1F7E2}' : '\u26AA';
        const crismaIcon = ['sim', 'si', 's'].includes(cleanStr(server.Crismado)) ? '\u{1F7E2}' : '\u26AA';

        const wpCandidate = server.Whatsapp_candidato ? generateWpLink(server.Whatsapp_candidato, `Olá ${server.Nome}, tudo bem? Aqui é da coordenação...`) : null;
        const wpMother = server.Whatsapp_mae ? generateWpLink(server.Whatsapp_mae, `Olá ${server.Nome_mae || 'Mãe'}, tudo bem? Gostaria de falar sobre o coroinha ${server.Nome}...`) : null;
        const wpFather = server.Whatsapp_pai ? generateWpLink(server.Whatsapp_pai, `Olá ${server.Nome_pai || 'Pai'}, tudo bem? Gostaria de falar sobre o coroinha ${server.Nome}...`) : null;
        const wpTutor = server.Whatsapp_tutor_guardiao ? generateWpLink(server.Whatsapp_tutor_guardiao, `Olá ${server.Nome_tutor_guardiao || 'Tutor'}, tudo bem? Gostaria de falar sobre o coroinha ${server.Nome}...`) : null;

        const contactLinks = [];
        if (wpCandidate) {
            contactLinks.push(`<a href="${wpCandidate}" target="_blank" class="text-center text-[11px] text-emerald-600 hover:text-emerald-800 font-semibold bg-emerald-50 px-2 py-1 rounded-md">📲 Candidato</a>`);
        }
        if (wpMother) {
            contactLinks.push(`<a href="${wpMother}" target="_blank" class="text-center text-[11px] text-blue-600 hover:text-blue-800 font-semibold bg-blue-50 px-2 py-1 rounded-md">👩‍👧 Mãe${server.Nome_mae ? `: ${server.Nome_mae}` : ''}</a>`);
        }
        if (wpFather) {
            contactLinks.push(`<a href="${wpFather}" target="_blank" class="text-center text-[11px] text-blue-600 hover:text-blue-800 font-semibold bg-blue-50 px-2 py-1 rounded-md">👨‍👦 Pai${server.Nome_pai ? `: ${server.Nome_pai}` : ''}</a>`);
        }
        if (wpTutor) {
            contactLinks.push(`<a href="${wpTutor}" target="_blank" class="text-center text-[11px] text-blue-600 hover:text-blue-800 font-semibold bg-blue-50 px-2 py-1 rounded-md">🧑‍🏫 Tutor</a>`);
        }

        let actionsHtml = '';

        const { mayEditServer, mayDeleteServer } = getActions(server);

        if (mayEditServer || mayDeleteServer) {
            actionsHtml = `
                <div class="flex gap-1.5 justify-center">
                    ${mayEditServer ? `<button onclick="editServer('${server.id}')" class="p-1 px-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold transition-all">Editar</button>` : ''}
                    ${mayDeleteServer ? `<button onclick="deleteServer('${server.id}', '${server.Nome.replace(/'/g, "\\'")}')" class="p-1 px-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition-all">Apagar</button>` : ''}
                </div>
            `;
        }

        row.innerHTML = `
            <td class="py-4 px-6">
                <div class="flex items-center space-x-3">
                    <div class="w-9 h-9 bg-slate-200 text-slate-700 rounded-full flex items-center justify-center font-bold text-xs">
                        ${initials}
                    </div>
                    <div>
                        <div class="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                            ${server.Nome}
                            <span class="text-[10px] px-1.5 py-0.5 rounded-full ${statusColor}">${statusText}</span>
                            <span class="text-[10px] px-1.5 py-0.5 rounded-full font-bold ${typeColor}">${displayTipo}</span>
                        </div>
                        <div class="text-xs text-slate-400 font-mono mt-0.5">${server.id}</div>
                    </div>
                </div>
            </td>
            <td class="py-4 px-6">
                <div class="font-medium text-slate-700">${getServerAge(server) ?? 0} anos</div>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium ${genderColor}">${genderText}</span>
            </td>
            <td class="py-4 px-6">
                <div class="font-medium text-slate-800">${server.Capela || 'S/D'}</div>
                <div class="text-xs text-slate-400">${server.Bairro || 'Sem bairro'}</div>
            </td>
            <td class="py-4 px-6">
                <div class="flex flex-col space-y-1 text-xs">
                    <span class="flex items-center gap-1">${batizadoIcon} Batismo</span>
                    <span class="flex items-center gap-1">${eucaristiaIcon} Comunh\u00E3o</span>
                    <span class="flex items-center gap-1">${crismaIcon} Crisma</span>
                </div>
            </td>
            <td class="py-4 px-6 text-xs max-w-xs ${alertClass}">
                ${tieneAlergia ? `🚨 ${server.Descricao_alergia_doenca || 'Sim, é preciso ter cuidado.'}` : 'Sem condições relatadas'}
            </td>
            <td class="py-4 px-6 text-xs font-semibold text-center">
                <div class="flex flex-col gap-1.5">
                    ${contactLinks.length > 0 ? contactLinks.join('') : '<span class="text-slate-400 text-center">Sem números</span>'}
                </div>
            </td>
            <td class="py-4 px-6 text-xs font-semibold text-center">
                ${actionsHtml}
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Actualizar controles de paginación
    updatePaginationControls(data.length, pagination);
}


function updatePaginationControls(totalItems, pagination) {
    const totalPages = Math.ceil(totalItems / pagination.itemsPerPage);
    const paginationContainer = document.getElementById('pagination-container');
    const paginationInfo = document.getElementById('pagination-info');
    const paginationButtons = document.getElementById('pagination-buttons');
    const prevBtn = document.getElementById('pagination-prev');
    const nextBtn = document.getElementById('pagination-next');

    if (totalItems === 0) {
        paginationContainer.classList.add('hidden');
        return;
    }

    paginationContainer.classList.remove('hidden');
    const startItem = (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
    const endItem = Math.min(pagination.currentPage * pagination.itemsPerPage, totalItems);
    paginationInfo.textContent = `${startItem}-${endItem} de ${totalItems}`;
    prevBtn.disabled = pagination.currentPage === 1;
    nextBtn.disabled = pagination.currentPage === totalPages;

    paginationButtons.innerHTML = '';
    const maxButtons = 5;
    let startPage = Math.max(1, pagination.currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    const appendPageButton = (page, active = false) => {
        const btn = document.createElement('button');
        btn.textContent = page;
        btn.onclick = () => window.goToPage(page);
        btn.className = active
            ? 'p-1 px-2.5 bg-liturgical-blue text-white rounded-lg text-xs font-bold'
            : 'p-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all';
        paginationButtons.appendChild(btn);
    };

    if (startPage > 1) {
        appendPageButton(1);
        if (startPage > 2) paginationButtons.appendChild(document.createTextNode('...'));
    }

    for (let page = startPage; page <= endPage; page++) {
        appendPageButton(page, page === pagination.currentPage);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) paginationButtons.appendChild(document.createTextNode('...'));
        appendPageButton(totalPages);
    }
}

export { renderTable };
