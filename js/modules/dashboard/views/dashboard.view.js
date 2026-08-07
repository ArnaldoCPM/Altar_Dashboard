import { getActiveChapels } from "../../../data/chapels.js";
import { canDelete as canDeleteServer, canEdit as canEditServer } from "../../../authorization.js";
import { cleanStr, generateWpLink } from "../../../utils.js";
import { getServerAge, updateKPIs } from "./kpis.view.js";
import { destroyCharts, getData as getDashboardData, getPagination, goToPage, nextPage, previousPage, setChart, updateFilteredItems } from "../controller.js";
function updateUI(data) {
    updateKPIs(data);
    renderCharts(data);
    renderTable(data);
    setupInteractiveEvents(data);
}

// Llenado de filtros dinámicos
async function populateFilters(chapelsList = null, authorizedData = getDashboardData()) {

    const selectCapilla = document.getElementById('filter-capilla');
    const savedVal = selectCapilla.value;

    try {

        const chapels = chapelsList || await getActiveChapels();
        const visibleChapelNames = new Set(
            (authorizedData || [])
                .map(item => (item.Capela || "").trim())
                .filter(Boolean)
        );

        selectCapilla.innerHTML =
            '<option value="all">Todas</option>';

        chapels.forEach(chapel => {
            if (visibleChapelNames.size > 0 && !visibleChapelNames.has(chapel.name)) {
                return;
            }

            const opt = document.createElement('option');

            opt.value = chapel.id;
            opt.textContent = chapel.name;

            selectCapilla.appendChild(opt);
        });

        selectCapilla.value = savedVal || "all";

    } catch (error) {

        console.error(
            "Erro ao carregar capelas:",
            error
        );

        selectCapilla.innerHTML =
            '<option value="all">Todas</option>';
    }
}

// Generar Gráficos Estadísticos con ChartJS
function renderCharts(data) {
    destroyCharts();

    // 1. CAPILLAS
    const capillasCount = {};
    data.forEach(d => {
        const c = (d.Capela || 'Não informada').trim();
        capillasCount[c] = (capillasCount[c] || 0) + 1;
    });

    setChart('capillas', new Chart(document.getElementById('chart-capillas'), {
        type: 'bar',
        data: {
            labels: Object.keys(capillasCount),
            datasets: [{
                label: 'Registros',
                data: Object.values(capillasCount),
                backgroundColor: '#1E3A8A',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    }));

    // 2. SACRAMENTOS
    let batizados = data.filter(d => ['sim', 'si', 's'].includes(cleanStr(d.Batizado))).length;
    let comunion = data.filter(d => ['sim', 'si', 's'].includes(cleanStr(d.Primeira_eucaristia))).length;
    let crisma = data.filter(d => ['sim', 'si', 's'].includes(cleanStr(d.Crismado))).length;

    setChart('sacramentos', new Chart(document.getElementById('chart-sacramentos'), {
        type: 'bar',
        data: {
            labels: ['Batizado', '1ª Comunhão', 'Crisma'],
            datasets: [
                {
                    label: 'Tem Sacramento',
                    data: [batizados, comunion, crisma],
                    backgroundColor: '#D4AF37',
                    borderRadius: 8
                },
                {
                    label: 'Em espera',
                    data: [data.length - batizados, data.length - comunion, data.length - crisma],
                    backgroundColor: '#E2E8F0',
                    borderRadius: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    }));

    // 3. GÉNERO MASCULINO / FEMENINO
    const generoCounts = { Masculino: 0, Femenino: 0, 'Sin dato': 0 };
    data.forEach(d => {
        const sexo = cleanStr(d.Sexo);
        if (['feminino', 'femenino', 'f'].includes(sexo)) {
            generoCounts.Femenino++;
        } else if (['masculino', 'm'].includes(sexo)) {
            generoCounts.Masculino++;
        } else {
            generoCounts['Sin dato']++;
        }
    });

    const generoLabels = Object.keys(generoCounts).filter(key => generoCounts[key] > 0);
    const generoValues = generoLabels.map(key => generoCounts[key]);
    const generoColors = ['#2563EB', '#DB2777', '#94A3B8'];

    setChart('genero', new Chart(document.getElementById('chart-genero'), {
        type: 'doughnut',
        data: {
            labels: generoLabels,
            datasets: [{
                data: generoValues,
                backgroundColor: generoColors.slice(0, generoValues.length),
                hoverOffset: 18,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        usePointStyle: true,
                        padding: 16,
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const value = context.parsed || 0;
                            const total = context.chart.data.datasets[0].data.reduce((sum, item) => sum + item, 0);
                            const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                            return `${context.label}: ${value} (${percent}%)`;
                        }
                    }
                }
            }
        }
    }));

    // 3. EDADES POR TIPO DE REGISTRO (Rangos: 6-11 y 12-24 años)
    const tiposEnRangos = {
        '6-11': { candidato: 0, formando: 0, instituido: 0 },
        '12-24': { candidato: 0, formando: 0, instituido: 0 }
    };

    data.forEach(d => {
        const edad = getServerAge(d);
        if (!isNaN(edad)) {
            const rawTipo = cleanStr(d.Tipo);
            let tipoKey = 'candidato';
            if (rawTipo.includes('form')) tipoKey = 'formando';
            else if (rawTipo.includes('inst') || rawTipo.includes('serv')) tipoKey = 'instituido';

            if (edad >= 6 && edad <= 11) {
                tiposEnRangos['6-11'][tipoKey]++;
            } else if (edad >= 12 && edad <= 24) {
                tiposEnRangos['12-24'][tipoKey]++;
            }
        }
    });

    setChart('edades', new Chart(document.getElementById('chart-edades'), {
        type: 'bar',
        data: {
            labels: ['6 - 11 anos', '12 - 24 anos'],
            datasets: [
                {
                    label: 'Candidato',
                    data: [tiposEnRangos['6-11'].candidato, tiposEnRangos['12-24'].candidato],
                    backgroundColor: '#F59E0B', // Amber
                    borderRadius: 6
                },
                {
                    label: 'Formando',
                    data: [tiposEnRangos['6-11'].formando, tiposEnRangos['12-24'].formando],
                    backgroundColor: '#10B981', // Emerald
                    borderRadius: 6
                },
                {
                    label: 'Instituído',
                    data: [tiposEnRangos['6-11'].instituido, tiposEnRangos['12-24'].instituido],
                    backgroundColor: '#6366F1', // Indigo
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    }));

    }
function renderTable(data) {
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
    const pagination = getPagination();
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

        const mayEditServer = canEditServer(server);
        const mayDeleteServer = canDeleteServer(server);

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
    updatePaginationControls(data.length);
}

// Función para actualizar controles de paginación
function updatePaginationControls(totalItems) {
    const pagination = getPagination();
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

    // Información de página
    const startItem = (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
    const endItem = Math.min(pagination.currentPage * pagination.itemsPerPage, totalItems);
    paginationInfo.textContent = `${startItem}-${endItem} de ${totalItems}`;

    // Botones anteriores/siguientes
    prevBtn.disabled = pagination.currentPage === 1;
    nextBtn.disabled = pagination.currentPage === totalPages;

    // Generar botones numéricos
    paginationButtons.innerHTML = '';
    const maxButtons = 5;
    let startPage = Math.max(1, pagination.currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (startPage > 1) {
        const btn = document.createElement('button');
        btn.textContent = '1';
        btn.onclick = () => window.goToPage(1);
        btn.className = 'p-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all';
        paginationButtons.appendChild(btn);
        if (startPage > 2) {
            paginationButtons.appendChild(document.createTextNode('...'));
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.onclick = () => window.goToPage(i);
        btn.className = i === pagination.currentPage
            ? 'p-1 px-2.5 bg-liturgical-blue text-white rounded-lg text-xs font-bold'
            : 'p-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all';
        paginationButtons.appendChild(btn);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationButtons.appendChild(document.createTextNode('...'));
        }
        const btn = document.createElement('button');
        btn.textContent = totalPages;
        btn.onclick = () => window.goToPage(totalPages);
        btn.className = 'p-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all';
        paginationButtons.appendChild(btn);
    }
}

// Funciones de navegación (expuestas globalmente)
window.goToPage = function(pageNum) {
    renderTable(goToPage(pageNum));
}

window.nextPage = function() {
    renderTable(nextPage());
}

window.previousPage = function() {
    renderTable(previousPage());
}

// Configuración de eventos interactivos y filtros
function setupInteractiveEvents(data) {
    const searchInput = document.getElementById('search-input');
    const filterCapilla = document.getElementById('filter-capilla');
    const filterEstado = document.getElementById('filter-estado');
    const filterAlergias = document.getElementById('filter-alergias');
    const filterTipo = document.getElementById('filter-tipo');

    function applyFilters() {
        const query = searchInput.value.toLowerCase();
        const capillaVal = filterCapilla.value;
        // Adaptación temporal hasta la migración completa a chapelId en M7.
        const selectedChapelName =
            capillaVal === 'all'
                ? 'all'
                : filterCapilla.options[filterCapilla.selectedIndex]?.textContent?.trim() || '';
        const estadoVal = filterEstado.value;
        const alergiasVal = filterAlergias.value;
        const tipoVal = filterTipo.value;

        const filtered = data.filter(d => {
            const matchesSearch = d.Nome.toLowerCase().includes(query) || d.id.toLowerCase().includes(query);
            const matchesCapilla = selectedChapelName === 'all' || (d.Capela || '').trim() === selectedChapelName;
            const matchesEstado = estadoVal === 'all' || (d.Estado || '').trim() === estadoVal;

            const itemAlergia = ['sim', 'si', 's'].includes(cleanStr(d.Possui_alergia_doenca)) ? 'Sim' : 'Não';
            const matchesAlergias = alergiasVal === 'all' || itemAlergia === alergiasVal;

            const itemTipo = cleanStr(d.Tipo);
            const filterTipoClean = cleanStr(tipoVal);
            const matchesTipo = tipoVal === 'all' || itemTipo === filterTipoClean;

            return matchesSearch && matchesCapilla && matchesEstado && matchesAlergias && matchesTipo;
        });

        renderTable(updateFilteredItems(filtered));
    }

    // Asignar listeners directamente para evitar solapamientos
    searchInput.oninput = applyFilters;
    filterCapilla.onchange = applyFilters;
    filterEstado.onchange = applyFilters;
    filterAlergias.onchange = applyFilters;
    filterTipo.onchange = applyFilters;
}
export { populateFilters, updateUI };
