import { app, db, collection, doc, getDoc, onSnapshot, deleteDoc, writeBatch } from "./firebase.js";
import { initAuth, setupAuthStateListener, loginWithEmailPassword, performLogout as performFirebaseLogout } from "./auth.js";
import { getAllUsers, resolveUserProfile, updateUser } from "./data/users.js";
import { createServer } from "./data/servers.js";
import { cleanStr, generateWpLink } from "./utils.js";
import { updateKPIs } from "./dashboard.js";
import { setCurrentUser, setCurrentProfile, setCurrentRole, getCurrentRole, clearSession } from "./session.js";
import "./permissions.js";
import { getActiveChapels } from "./data/chapels.js";

// import { renderTable } from "./table.js";
// import { renderCharts } from "./charts.js";
// import { populateFilters } from "./filters.js";
// import { updatePaginationControls, goToPage, nextPage, previousPage } from "./pagination.js";
// import { checkPermissions } from "./permissions.js";
// import { showConfirm } from "./modals.js";

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Rutas de Firestore (Cumpliendo la regla RULE 1 de Canvas)
const serversColRef = collection(db, 'artifacts', appId, 'public', 'data', 'servers');

// Estado global de la aplicación
let dataset = [];
let user = null;
let isAdmin = false;
const ADMIN_EMAIL = "seminariodeampere@gmail.com";
let charts = {};

// Variables de paginación
let currentPage = 1;
const ITEMS_PER_PAGE = 12;
let totalFilteredItems = [];

//temporal
function auditChapels() {

    const validChapels = [
        "Matriz",
        "Nossa Senhora Aparecida",
        "Nossa Senhora das Graças",
        "Nossa Senhora das Mercês",
        "Nossa Senhora de Fátima",
        "Santa Mônica",
        "Santa Paulina",
        "São Francisco",
        "XVI de Novembro"
    ];

    const problems = [];

    dataset.forEach(server => {

        const chapel = (server.Capela || "").trim();

        if (!chapel) {

            problems.push({
                id: server.id,
                nome: server.Nome,
                problema: "Capela vazia"
            });

            return;
        }

        if (!validChapels.includes(chapel)) {

            problems.push({
                id: server.id,
                nome: server.Nome,
                capela: chapel,
                problema: "Capela não encontrada"
            });
        }

    });

    console.table(problems);

    console.log(
        "Total de problemas encontrados:",
        problems.length
    );
}

async function loadChapelsIntoForm() {

    const select = document.getElementById('form-capela');

    if (!select) return;

    const chapels = await getActiveChapels();

    select.innerHTML = '';

    chapels
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(chapel => {

            const option = document.createElement('option');

            option.value = chapel.name;
            option.textContent = chapel.name;

            select.appendChild(option);
        });
}

// Auth state listener - Determina acceso de administrador exclusivamente por Firebase Auth
setupAuthStateListener(async (u) => {

    if (u) {

        user = u;
        const authUid = u.uid;
        const profilePromise = resolveUserProfile(user);
        setCurrentUser(user);

        // Verificar si es el administrador autorizado
        isAdmin = (u.email === ADMIN_EMAIL);

        document.getElementById('db-status').innerHTML =
            `<span class="w-2 h-2 bg-emerald-500 rounded-full"></span> Sincronizado`;

        document.getElementById('db-status').className =
            "text-xs px-3 py-1.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1.5";

        //updateAdminUI();

        subscribeToDatabase();

        const profile = await profilePromise;
        if (user?.uid === authUid) {
            setCurrentProfile(profile);
            // El rol se almacena ahora para ser aprovechado en fases futuras del sistema.
            setCurrentRole(profile?.role ?? null);
            await loadChapelsIntoForm();
            updateAdminUI();
            
            //temporal
            const chapels = await getActiveChapels();

            console.log("SGSA Profile:", profile);
            console.log("SGSA Role:", profile?.role ?? null);
            //console.log("SGSA Chapels:", chapels);
        }

    } else {

        user = null;
        clearSession();
        isAdmin = false;

        // document.getElementById('db-status').innerHTML = `<span class="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span> Desligado`;

        updateAdminUI();
    }
});

// Suscribirse a los datos de Firestore en tiempo real (Regla 2 y snapshot error)
function subscribeToDatabase() {
    if (!user) return;

    onSnapshot(serversColRef, (snapshot) => {
        const loadedData = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            loadedData.push({ 
                id: doc.id, 
                Id: doc.id,
                ...data 
            });
        });
        
        dataset = loadedData;
        //Temporal
        const capillasUnicas = [...new Set(
            dataset
                .map(s => (s.Capela || "").trim())
        )];

        console.table(capillasUnicas);
        updateUI(dataset);
        auditChapels();
        
        // Ocultar pantalla de carga inicial
        document.getElementById('loading-overlay').classList.add('opacity-0');
        setTimeout(() => {
            document.getElementById('loading-overlay').classList.add('hidden');
        }, 300);

    }, (error) => {
        showError('Erro ao carregar os dados da base de dados do Firestore: ' + error.message);
        document.getElementById('loading-overlay').classList.add('hidden');
    });
}


// EJECUCIÓN INICIAL: usar anonimamente (regla Canvas) y observar estado de auth
initAuth((err) => {
    showError('Error de autenticación con Firebase. Verifique sus claves.');
    document.getElementById('loading-overlay').classList.add('hidden');
});

// Actualizar UI
function updateUI(data) {
    updateKPIs(data);
    renderCharts(data);
    renderTable(data);
    setupInteractiveEvents(data);
}

// Llenado de filtros dinámicos
async function populateFilters() {

    const selectCapilla = document.getElementById('filter-capilla');
    const savedVal = selectCapilla.value;

    try {

        const chapels = await getActiveChapels();

        selectCapilla.innerHTML =
            '<option value="all">Todas</option>';

        chapels.forEach(chapel => {

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
    if (charts.capillas) charts.capillas.destroy();
    if (charts.sacramentos) charts.sacramentos.destroy();
    if (charts.genero) charts.genero.destroy();
    if (charts.edades) charts.edades.destroy();
    // if (charts.horarios) charts.horarios.destroy();

    // 1. CAPILLAS
    const capillasCount = {};
    data.forEach(d => {
        const c = (d.Capela || 'Não informada').trim();
        capillasCount[c] = (capillasCount[c] || 0) + 1;
    });

    charts.capillas = new Chart(document.getElementById('chart-capillas'), {
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
    });

    // 2. SACRAMENTOS
    let batizados = data.filter(d => ['sim', 'si', 's'].includes(cleanStr(d.Batizado))).length;
    let comunion = data.filter(d => ['sim', 'si', 's'].includes(cleanStr(d.Primeira_eucaristia))).length;
    let crisma = data.filter(d => ['sim', 'si', 's'].includes(cleanStr(d.Crismado))).length;

    charts.sacramentos = new Chart(document.getElementById('chart-sacramentos'), {
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
    });

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

    charts.genero = new Chart(document.getElementById('chart-genero'), {
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
    });

    // 3. EDADES POR TIPO DE REGISTRO (Rangos: 6-11 y 12-24 años)
    const tiposEnRangos = {
        '6-11': { candidato: 0, formando: 0, instituido: 0 },
        '12-24': { candidato: 0, formando: 0, instituido: 0 }
    };

    data.forEach(d => {
        const edad = parseInt(d.Idade);
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

    charts.edades = new Chart(document.getElementById('chart-edades'), {
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
    });

    /*
    // 4. TURNOS
    const turnos = {};
    data.forEach(d => {
        const t = d.Horario_estudo || 'Não definido';
        t.toString().split(';').forEach(subT => {
            const finalT = subT.trim();
            if(finalT) {
                turnos[finalT] = (turnos[finalT] || 0) + 1;
            }
        });
    });

    charts.horarios = new Chart(document.getElementById('chart-horarios'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(turnos),
            datasets: [{
                data: Object.values(turnos),
                backgroundColor: ['#8B5CF6', '#F59E0B', '#10B981', '#EC4899']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
    */
}

// Helper para lanzar modal de confirmación personalizada
function showConfirm(title, message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    
    const btnSubmit = document.getElementById('btn-confirm-submit');
    const btnCancel = document.getElementById('btn-confirm-cancel');
    
    const newSubmit = btnSubmit.cloneNode(true);
    const newCancel = btnCancel.cloneNode(true);
    btnSubmit.parentNode.replaceChild(newSubmit, btnSubmit);
    btnCancel.parentNode.replaceChild(newCancel, btnCancel);
    
    newSubmit.onclick = () => {
        modal.classList.add('hidden');
        onConfirm();
    };
    newCancel.onclick = () => {
        modal.classList.add('hidden');
    };
    
    modal.classList.remove('hidden');
}

// Renderizado del directorio con paginación
function renderTable(data) {
    const tableBody = document.getElementById('table-body');
    const emptyState = document.getElementById('empty-state');
    const paginationContainer = document.getElementById('pagination-container');
    tableBody.innerHTML = '';

    // Guardar datos filtrados para paginación
    totalFilteredItems = data;
    //currentPage = 1;

    if (data.length === 0) {
        emptyState.classList.remove('hidden');
        paginationContainer.classList.add('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }

    // Calcular rango de items para la página actual
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
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

        const batizadoIcon = ['sim', 'si', 's'].includes(cleanStr(server.Batizado)) ? '🟢' : '⚪';
        const eucaristiaIcon = ['sim', 'si', 's'].includes(cleanStr(server.Primeira_eucaristia)) ? '🟢' : '⚪';
        const crismaIcon = ['sim', 'si', 's'].includes(cleanStr(server.Crismado)) ? '🟢' : '⚪';

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

        // Controles de Administrador
        const currentRole = getCurrentRole();
        const isRoleAdmin = currentRole === "admin";

        let adminControlsHtml = '';

        if (isRoleAdmin) {
            adminControlsHtml = `
                <div class="flex gap-1.5 justify-center">
                    <button onclick="editServer('${server.id}')" class="p-1 px-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold transition-all">Editar</button>
                    <button onclick="deleteServer('${server.id}', '${server.Nome.replace(/'/g, "\\'")}')" class="p-1 px-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition-all">Apagar</button>
                </div>
            `;
        } else {
            adminControlsHtml = `
                <div class="flex flex-col gap-1.5">
                    ${contactLinks.length > 0 ? contactLinks.join('') : '<span class="text-slate-400 text-center">Sem números</span>'}
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
                <div class="font-medium text-slate-700">${server.Idade !== undefined ? server.Idade : 0} anos</div>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium ${genderColor}">${genderText}</span>
            </td>
            <td class="py-4 px-6">
                <div class="font-medium text-slate-800">${server.Capela || 'S/D'}</div>
                <div class="text-xs text-slate-400">${server.Bairro || 'Sem bairro'}</div>
            </td>
            <td class="py-4 px-6">
                <div class="flex flex-col space-y-1 text-xs">
                    <span class="flex items-center gap-1">${batizadoIcon} Batismo</span>
                    <span class="flex items-center gap-1">${eucaristiaIcon} Comunhão</span>
                    <span class="flex items-center gap-1">${crismaIcon} Crisma</span>
                </div>
            </td>
            <td class="py-4 px-6 text-xs max-w-xs ${alertClass}">
                ${tieneAlergia ? `🚨 ${server.Descricao_alergia_doenca || 'Sim, é preciso ter cuidado.'}` : 'Sem condições relatadas'}
            </td>
            <td class="py-4 px-6 text-xs font-semibold text-center">
                ${adminControlsHtml}
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Actualizar controles de paginación
    updatePaginationControls(data.length);
}

// Función para actualizar controles de paginación
function updatePaginationControls(totalItems) {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
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
    const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);
    paginationInfo.textContent = `${startItem}-${endItem} de ${totalItems}`;

    // Botones anteriores/siguientes
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;

    // Generar botones numéricos
    paginationButtons.innerHTML = '';
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
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
        btn.className = i === currentPage 
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
    currentPage = pageNum;
    renderTable(totalFilteredItems);
}

window.nextPage = function() {
    const totalPages = Math.ceil(totalFilteredItems.length / ITEMS_PER_PAGE);
    if (currentPage < totalPages) {
        currentPage++;
        renderTable(totalFilteredItems);
    }
}

window.previousPage = function() {
    if (currentPage > 1) {
        currentPage--;
        renderTable(totalFilteredItems);
    }
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
        const estadoVal = filterEstado.value;
        const alergiasVal = filterAlergias.value;
        const tipoVal = filterTipo.value;

        const filtered = data.filter(d => {
            const matchesSearch = d.Nome.toLowerCase().includes(query) || d.id.toLowerCase().includes(query);
            const matchesCapilla = capillaVal === 'all' || (d.Capela || '').trim() === capillaVal;
            const matchesEstado = estadoVal === 'all' || (d.Estado || '').trim() === estadoVal;
            
            const itemAlergia = ['sim', 'si', 's'].includes(cleanStr(d.Possui_alergia_doenca)) ? 'Sim' : 'Não';
            const matchesAlergias = alergiasVal === 'all' || itemAlergia === alergiasVal;
            
            const itemTipo = cleanStr(d.Tipo);
            const filterTipoClean = cleanStr(tipoVal);
            const matchesTipo = tipoVal === 'all' || itemTipo === filterTipoClean;

            return matchesSearch && matchesCapilla && matchesEstado && matchesAlergias && matchesTipo;
        });

        currentPage = 1;
        renderTable(filtered);
    }

    // Asignar listeners directamente para evitar solapamientos
    searchInput.oninput = applyFilters;
    filterCapilla.onchange = applyFilters;
    filterEstado.onchange = applyFilters;
    filterAlergias.onchange = applyFilters;
    filterTipo.onchange = applyFilters;
}

// MODO ADMINISTRADOR: Autenticación mediante Firebase Authentication Email/Password
const btnAdminToggle = document.getElementById('btn-admin-toggle');
const adminLoginModal = document.getElementById('admin-login-modal');
const btnLoginSubmit = document.getElementById('btn-login-submit');
const adminEmailInput = document.getElementById('admin-email-input');
const adminPasswordInput = document.getElementById('admin-password-input');
const loginError = document.getElementById('login-error');

// Función para actualizar UI de administrador según estado isAdmin
function updateAdminUI() {

    const currentRole = getCurrentRole();
    const isRoleAdmin = currentRole === "admin";

    if (isRoleAdmin) {
        document.getElementById('admin-banner').classList.remove('hidden');
        document.getElementById('upload-section').classList.remove('hidden');

        btnAdminToggle.classList.replace('bg-white/10', 'bg-emerald-600');

        document.getElementById('admin-btn-text').textContent =
            "Administrador ativo";

        document.getElementById('admin-icon').textContent = "🔓";

    } else {

        document.getElementById('admin-banner').classList.add('hidden');
        document.getElementById('upload-section').classList.add('hidden');

        btnAdminToggle.classList.replace('bg-emerald-600', 'bg-white/10');

        document.getElementById('admin-btn-text').textContent =
            "Acesso Administrador";

        document.getElementById('admin-icon').textContent = "🔒";
    }

    updateUI(dataset);
}

btnAdminToggle.addEventListener('click', () => {
    if (isAdmin) {
        performLogout();
    } else {
        adminEmailInput.value = '';
        adminPasswordInput.value = '';
        loginError.classList.add('hidden');
        adminLoginModal.classList.remove('hidden');
    }
});

document.getElementById('btn-logout').addEventListener('click', performLogout);

// LOGIN CON FIREBASE AUTHENTICATION (Email/Password)
btnLoginSubmit.addEventListener('click', async () => {
    const email = adminEmailInput.value.trim();
    const password = adminPasswordInput.value.trim();
    if (!email || !password) {
        loginError.textContent = "Introduce o email e a palavra-passe.";
        loginError.classList.remove('hidden');
        return;
    }

    try {
        await loginWithEmailPassword(email, password);
        // Firebase maneja el estado; onAuthStateChanged activará modo admin automáticamente
        adminLoginModal.classList.add('hidden');
        loginError.classList.add('hidden');
    } catch (err) {
        let msg = "Credenciais incorretas.";
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
            msg = "Email ou palavra-passe inválidos. Verifique e tente novamente.";
        } else if (err.code === 'auth/too-many-requests') {
            msg = "Muitas tentativas. Aguarde alguns instantes e tente novamente.";
        }
        loginError.textContent = msg;
        loginError.classList.remove('hidden');
    }
});

// LOGOUT: cerrar sesión en Firebase Authentication
async function performLogout() {
    await performFirebaseLogout((err) => {
        showError("Não foi possível encerrar a sessão: " + err.message);
    });
    isAdmin = false;
    updateAdminUI();
}

// FORMULARIO MANUAL DE AGREGAR / EDITAR
const editServerModal = document.getElementById('edit-server-modal');
const serverForm = document.getElementById('server-form');
const usersManagementModal = document.getElementById('users-management-modal');
const usersTableBody = document.getElementById('users-table-body');
const userEditModal = document.getElementById('user-edit-modal');
const userEditForm = document.getElementById('user-edit-form');
const userIdInput = document.getElementById('form-user-id');
const userDisplayNameInput = document.getElementById('form-user-display-name');
const userEmailInput = document.getElementById('form-user-email');
const userRoleInput = document.getElementById('form-user-role');
const userChapelInput = document.getElementById('form-user-chapel');
const userActiveInput = document.getElementById('form-user-active');
let loadedUsers = [];
const emptyUsersRowMarkup = `
    <tr>
        <td colspan="6" class="px-6 py-10 text-center text-sm text-slate-500">Nenhum usuário cadastrado.</td>
    </tr>
`;

function syncUserChapelFieldState() {
    const isAdminRole = userRoleInput.value === 'admin';

    userChapelInput.disabled = isAdminRole;

    if (isAdminRole) {
        userChapelInput.value = '';
    }
}

async function loadUsersTable() {
    loadedUsers = await getAllUsers();

    usersTableBody.innerHTML = '';

    if (!loadedUsers.length) {
        usersTableBody.innerHTML = emptyUsersRowMarkup;
        return;
    }

    loadedUsers.forEach((userItem) => {
        const row = document.createElement('tr');
        const isActive = userItem.active !== false;

        row.className = "border-b border-slate-100 text-sm text-slate-600";
        row.innerHTML = `
            <td class="py-4 px-6">${userItem.displayName || ''}</td>
            <td class="py-4 px-6">${userItem.email || ''}</td>
            <td class="py-4 px-6">${userItem.role || ''}</td>
            <td class="py-4 px-6">${userItem.chapelId || '—'}</td>
            <td class="py-4 px-6">${isActive ? '🟢 Ativo' : '⚪ Inativo'}</td>
            <td class="py-4 px-6">
                <button type="button" onclick="editUser('${userItem.id}')" class="text-xs font-bold text-liturgical-blue hover:text-liturgical-blue/80 transition-colors">
                    Editar
                </button>
            </td>
        `;

        usersTableBody.appendChild(row);
    });
}

window.editUser = function(userId) {
    const userItem = loadedUsers.find((item) => item.id === userId);

    if (!userItem) {
        return;
    }

    userDisplayNameInput.value = userItem.displayName || '';
    userEmailInput.value = userItem.email || '';
    userIdInput.value = userItem.id || '';
    userRoleInput.value = userItem.role || 'viewer';
    userChapelInput.value = userItem.chapelId || '';
    userActiveInput.value = userItem.active !== false ? 'true' : 'false';
    syncUserChapelFieldState();
    userEditModal.classList.remove('hidden');
};

document.getElementById('btn-add-manual').addEventListener('click', () => {
    document.getElementById('edit-modal-title').textContent = "Adicionar novo servidor";
    serverForm.reset();
    const lastIdNum = dataset.reduce((max, cur) => {
        const curId = cur.id || '';
        const match = curId.toString().match(/\d+/);
        return match ? Math.max(max, parseInt(match[0])) : max;
    }, 0);
    document.getElementById('form-id').value = `SRV-${String(lastIdNum + 1).padStart(4, '0')}`;
    editServerModal.classList.remove('hidden');
});

document.getElementById('btn-manage-users').addEventListener('click', async () => {
    usersManagementModal.classList.remove('hidden');
    await loadUsersTable();
});

document.getElementById('btn-close-users-modal').addEventListener('click', () => {
    usersManagementModal.classList.add('hidden');
});

document.getElementById('btn-cancel-user-edit').addEventListener('click', () => {
    userEditModal.classList.add('hidden');
});

userRoleInput.addEventListener('change', () => {
    syncUserChapelFieldState();
});

userEditForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = userIdInput.value;
    const role = userRoleInput.value;
    const chapelId = userChapelInput.value.trim();

    if ((role === 'coordinator' || role === 'viewer') && !chapelId) {
        showError("Selecione uma capela.");
        return;
    }

    const userData = {
        displayName: userDisplayNameInput.value.trim(),
        role,
        chapelId: role === 'admin' ? null : chapelId,
        active: userActiveInput.value === 'true'
    };

    await updateUser(userId, userData);
    userEditModal.classList.add('hidden');
    await loadUsersTable();
});

// Guardar monaguillo en Firestore (Regla 1 de Firebase de Canvas)
serverForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentRole = getCurrentRole();

    if (currentRole !== "admin") {
        return;
}

    const id = document.getElementById('form-id').value;
    const payload = {
        id: id,
        Nome: document.getElementById('form-nome').value.trim(),
        Data_nascimento: document.getElementById('form-data-nasc').value,
        Idade: parseInt(document.getElementById('form-idade').value) || 0,
        Sexo: document.getElementById('form-sexo').value,
        Capela: document.getElementById('form-capela').value.trim(),
        Tipo: document.getElementById('form-tipo').value,
        Estado: document.getElementById('form-estado').value,
        Horario_estudo: document.getElementById('form-horario-estudo').value,
        Batizado: document.getElementById('form-batizado').checked ? 'Sim' : 'Não',
        Primeira_eucaristia: document.getElementById('form-comunion').checked ? 'Sim' : 'Não',
        Crismado: document.getElementById('form-crisma').checked ? 'Sim' : 'Não',
        Possui_alergia_doenca: document.getElementById('form-tem-alergia').value,
        Descricao_alergia_doenca: document.getElementById('form-desc-alergia').value.trim(),
        Nome_mae: document.getElementById('form-nome-mae').value.trim(),
        Whatsapp_mae: document.getElementById('form-wp-mae').value.trim(),
        Nome_pai: document.getElementById('form-nome-pai').value.trim(),
        Whatsapp_pai: document.getElementById('form-wp-pai').value.trim(),
    };

    try {
        await createServer(payload);
        editServerModal.classList.add('hidden');
    } catch (err) {
        showError("No se pudo guardar el registro: " + err.message);
    }
});

// Funciones expuestas a nivel global para compatibilidad con handlers inline onclick
window.editServer = function(id) {
    const currentRole = getCurrentRole();
    if (currentRole !== "admin") {
        return;
    }

    const server = dataset.find(d => d.id === id);
    if (!server) return;

    document.getElementById('edit-modal-title').textContent = `Editar Servidor: ${server.id}`;
    document.getElementById('form-id').value = server.id;
    document.getElementById('form-nome').value = server.Nome || '';
    document.getElementById('form-data-nasc').value = server.Data_nascimento || '';
    document.getElementById('form-idade').value = server.Idade !== undefined ? server.Idade : 0;
    document.getElementById('form-sexo').value = server.Sexo || 'Masculino';
    document.getElementById('form-capela').value = server.Capela || '';
    document.getElementById('form-tipo').value = server.Tipo || 'Candidato';
    document.getElementById('form-estado').value = server.Estado || 'Ativo';
    document.getElementById('form-horario-estudo').value = server.Horario_estudo || '';
    
    document.getElementById('form-batizado').checked = ['sim', 'si', 's'].includes(cleanStr(server.Batizado));
    document.getElementById('form-comunion').checked = ['sim', 'si', 's'].includes(cleanStr(server.Primeira_eucaristia));
    document.getElementById('form-crisma').checked = ['sim', 'si', 's'].includes(cleanStr(server.Crismado));
    
    document.getElementById('form-tem-alergia').value = ['sim', 'si', 's'].includes(cleanStr(server.Possui_alergia_doenca)) ? 'Sim' : 'Não';
    document.getElementById('form-desc-alergia').value = server.Descricao_alergia_doenca || '';
    
    document.getElementById('form-nome-mae').value = server.Nome_mae || '';
    document.getElementById('form-wp-mae').value = server.Whatsapp_mae || '';
    document.getElementById('form-nome-pai').value = server.Nome_pai || '';
    document.getElementById('form-wp-pai').value = server.Whatsapp_pai || '';

    editServerModal.classList.remove('hidden');
};

window.deleteServer = function(id, name) {
    const currentRole = getCurrentRole();
    if (currentRole !== "admin") {
        return;
    }

    showConfirm(
        "Eliminar Servidor",
        `Tem a certeza absoluta de que deseja eliminar "${name}" (${id}) da base de dados de forma permanente?`,
        async () => {
            try {
                const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'servers', id);
                await deleteDoc(docRef);
            } catch (err) {
                showError("Não foi possível eliminar o registo: " + err.message);
            }
        }
    );
};

// CARGA MASIVA CSV (Conexión directa, única y robusta al input)
const fileInput = document.getElementById('csv-file-input');
fileInput.addEventListener('change', handleCsvUpload);

async function handleCsvUpload(e) {
    const currentRole = getCurrentRole();

    if (currentRole !== "admin") {
        return;
    }
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        const text = evt.target.result;
        const parsed = csvToObjects(text);
        
        if (parsed && parsed.length > 0) {
            showConfirm(
                "Sincronizar a base de datos",
                `Foram detetados ${parsed.length} servidores válidos no seu ficheiro CSV. Isto irá atualizar e importar todos os registos para a base de dados do Firebase. Deseja continuar?`,
                async () => {
                    await uploadBatchToFirestore(parsed);
                }
            );
        } else {
            showError("O formato do ficheiro CSV não foi reconhecido. Verifique se existe uma coluna com o nome «Nome» ou se os outros cabeçalhos estão corretos.");
        }
    };
    reader.readAsText(file, 'UTF-8');
}

async function uploadBatchToFirestore(items) {
    const progressBar = document.getElementById('upload-progress');
    const progressFill = document.getElementById('upload-progress-bar');
    progressBar.classList.remove('hidden');
    progressFill.style.width = '0%';

    let index = 0;
    const chunkSize = 150; // Procesado en lotes seguros
    
    try {
        const cleanYesNo = (val) => {
            const cleanVal = (val || '').toString().trim().toLowerCase();
            return ['sim', 'sí', 'si', 's', 'true', '1', 'yes'].includes(cleanVal) ? 'Sim' : 'Não';
        };

        const cleanEstado = (val) => {
            const cleanVal = (val || '').toString().trim().toLowerCase();
            if (['inativo', 'inactivo', 'false', '0', 'n', 'não', 'nao'].includes(cleanVal)) {
                return 'Inativo';
            }
            return 'Ativo';
        };

        const cleanTipo = (val) => {
            const cleanVal = (val || '').toString().trim().toLowerCase();
            if (cleanVal.includes('cand')) return 'Candidato';
            if (cleanVal.includes('form')) return 'Formando';
            if (cleanVal.includes('inst') || cleanVal.includes('serv')) return 'Instituído';
            return 'Candidato';
        };

        const cleanSexo = (val) => {
            const cleanVal = (val || '').toString().trim().toLowerCase();
            if (['femenino', 'feminino', 'f', 'mulher', 'mujer'].includes(cleanVal)) {
                return 'Femenino';
            }
            return 'Masculino';
        };

        while (index < items.length) {
            const batch = writeBatch(db);
            const chunk = items.slice(index, index + chunkSize);
            
            chunk.forEach((item, innerIdx) => {
                const uniqueSeqNum = index + innerIdx + 1;
                let itemID = item.Id ? item.Id.toString().trim() : '';
                if (!itemID || itemID === '') {
                    itemID = `SRV-${String(uniqueSeqNum).padStart(4, '0')}`;
                }

                const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'servers', itemID);
                
                const parsedAge = parseInt(item.Idade);
                const safeAge = isNaN(parsedAge) ? 0 : parsedAge;

                const payload = {
                    id: itemID,
                    Nome: (item.Nome || 'Sem Nome').trim(),
                    Data_nascimento: item.Data_nascimento || '',
                    Idade: safeAge,
                    Sexo: cleanSexo(item.Sexo),
                    Capela: (item.Capela || 'Sem Capela').trim(),
                    Tipo: cleanTipo(item.Tipo),
                    Estado: cleanEstado(item.Estado),
                    Horario_estudo: item.Horario_estudo || '',
                    Batizado: cleanYesNo(item.Batizado),
                    Primeira_eucaristia: cleanYesNo(item.Primeira_eucaristia),
                    Crismado: cleanYesNo(item.Crismado),
                    Possui_alergia_doenca: cleanYesNo(item.Possui_alergia_doenca),
                    Descricao_alergia_doenca: (item.Descricao_alergia_doenca || '').trim(),
                    Bairro: item.Bairro || '',
                    Nome_mae: (item.Nome_mae || '').trim(),
                    Whatsapp_mae: (item.Whatsapp_mae || '').trim(),
                    Nome_pai: (item.Nome_pai || '').trim(),
                    Whatsapp_pai: (item.Whatsapp_pai || '').trim(),
                    Whatsapp_candidato: (item.Whatsapp_candidato || '').trim(),
                    Nome_tutor_guardiao: (item.Nome_tutor_guardiao || '').trim(),
                    Whatsapp_tutor_guardiao: (item.Whatsapp_tutor_guardiao || '').trim()
                };

                batch.set(docRef, payload, { merge: true });
            });

            await batch.commit();
            index += chunkSize;
            
            const progressVal = Math.min(100, Math.round((index / items.length) * 100));
            progressFill.style.width = `${progressVal}%`;
        }

        setTimeout(() => {
            progressBar.classList.add('hidden');
            const dropzoneText = document.querySelector('#upload-section h3');
            dropzoneText.innerHTML = `✅ Sincronizado com sucesso! ${items.length} servidores estão permanentemente disponíveis na nuvem.`;
            dropzoneText.className = "text-lg font-bold text-emerald-600";
            
            fileInput.value = "";
        }, 1000);

    } catch (err) {
        console.error("Batch upload failed:", err);
        showError("Ocorreu um erro ao carregar os lotes na base de dados: " + err.message);
        progressBar.classList.add('hidden');
        fileInput.value = "";
    }
}

// LECTOR DE CSV ROBUSTO CON ASIGNACIÓN DE CLAVE TOLERANTE (MAPPING DE CAMPOS)
function csvToObjects(text) {
    if (!text || !text.trim()) return null;

    text = text.replace(/^\uFEFF/, '').replace(/^\uFFFE/, '').trim();

    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return null;

    const headerLine = lines[0];
    const commaCount = (headerLine.match(/,/g) || []).length;
    const semicolonCount = (headerLine.match(/;/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ';' : ',';

    const rawHeaders = splitCsvLine(headerLine, delimiter);
    const headers = rawHeaders.map(h => 
        h.trim()
         .replace(/^"|"$/g, '')
         .replace(/[\u200B-\u200D\uFEFF]/g, '') 
         .replace(/\s+/g, ' ')
         .replace(/[^\x20-\x7E]/g, '') 
         .trim()
    );

    function getVal(rowObj, keyAlternatives) {
        for (const alt of keyAlternatives) {
            if (rowObj[alt] !== undefined) return rowObj[alt];
            
            const foundKey = Object.keys(rowObj).find(k => {
                const cleanK = k.toLowerCase().replace(/[^\w]/g, '').trim();
                const cleanAlt = alt.toLowerCase().replace(/[^\w]/g, '').trim();
                return cleanK === cleanAlt;
            });
            
            if (foundKey) return rowObj[foundKey];
        }
        return '';
    }

    const list = [];
    for (let j = 1; j < lines.length; j++) {
        const line = lines[j].trim();
        if (!line) continue; 

        const values = splitCsvLine(line, delimiter);
        
        const nonemptyValues = values.filter(v => v.trim() !== "");
        if (nonemptyValues.length === 0) continue;

        const tempObj = {};
        headers.forEach((header, index) => {
            let val = values[index] !== undefined ? values[index].trim() : '';
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.substring(1, val.length - 1);
            }
            tempObj[header] = val;
        });

        const normalizedObj = {
            Id: getVal(tempObj, ['Id', 'id', 'ID', 'Identificador', 'Código', 'Codigo']).toString().trim(),
            Nome: getVal(tempObj, ['Nome', 'nome', 'NOME', 'Nome Completo', 'Nombre']).toString().trim(),
            Data_nascimento: getVal(tempObj, ['Data_nascimento', 'Data nascimento', 'Nascimento', 'Data_nasc', 'Fecha_nacimiento', 'Nasc']).toString().trim(),
            Idade: getVal(tempObj, ['Idade', 'idade', 'Edad']).toString().trim(),
            Sexo: getVal(tempObj, ['Sexo', 'sexo', 'Gênero', 'Genero']).toString().trim(),
            Capela: getVal(tempObj, ['Capela', 'capela', 'Capilla', 'Origem', 'Comunidade']).toString().trim(),
            Bairro: getVal(tempObj, ['Bairro', 'bairro', 'Barrio']).toString().trim(),
            Tipo: getVal(tempObj, ['Tipo', 'tipo', 'Tipo de Registro', 'Tipo_registro']).toString().trim(),
            Estado: getVal(tempObj, ['Estado', 'estado', 'Status', 'Situação', 'Ativo']).toString().trim(),
            Horario_estudo: getVal(tempObj, ['Horario_estudo', 'Horário de estudo', 'Horário de Estudo', 'Horario de estudio']).toString().trim(),
            Batizado: getVal(tempObj, ['Batizado', 'batizado', 'Bautizado']).toString().trim(),
            Primeira_eucaristia: getVal(tempObj, ['Primeira_eucaristia', 'Primeira eucaristia', '1ª Comunhão', 'Primera Comunión', 'Comunion']).toString().trim(),
            Crismado: getVal(tempObj, ['Crismado', 'crismado', 'Crisma', 'Confirmación']).toString().trim(),
            Possui_alergia_doenca: getVal(tempObj, ['Possui_alergia_doenca', 'Possui alergia', 'Alergia', 'Tem Alergia', 'Alergias', 'Enfermedad', 'Condición']).toString().trim(),
            Descricao_alergia_doenca: getVal(tempObj, ['Descricao_alergia_doenca', 'Descrição alergia', 'Descripción de alergia', 'Observacoes', 'Observações']).toString().trim(),
            Nome_mae: getVal(tempObj, ['Nome_mae', 'Nome da mãe', 'Mãe', 'Madre']).toString().trim(),
            Whatsapp_mae: getVal(tempObj, ['Whatsapp_mae', 'WhatsApp mãe', 'Wp mãe', 'Whatsapp da mãe']).toString().trim(),
            Nome_pai: getVal(tempObj, ['Nome_pai', 'Nome do pai', 'Pai', 'Padre']).toString().trim(),
            Whatsapp_pai: getVal(tempObj, ['Whatsapp_pai', 'WhatsApp pai', 'Wp pai', 'Whatsapp do pai']).toString().trim(),
            Whatsapp_candidato: getVal(tempObj, ['Whatsapp_candidato', 'WhatsApp candidato', 'Wp candidato']).toString().trim(),
            Nome_tutor_guardiao: getVal(tempObj, ['Nome_tutor_guardiao', 'Nome do tutor', 'Tutor']).toString().trim(),
            Whatsapp_tutor_guardiao: getVal(tempObj, ['Whatsapp_tutor_guardiao', 'WhatsApp tutor', 'Wp tutor']).toString().trim()
        };

        if (normalizedObj.Nome && normalizedObj.Nome.trim() !== '') {
            list.push(normalizedObj);
        }
    }
    return list;
}

// Helper para dividir líneas respetando comillas dobles
function splitCsvLine(line, delimiter) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

// Mostrar errores personalizados en la interfaz de usuario en vez de alert()
function showError(message) {
    const alertBox = document.getElementById('error-alert');
    const alertText = document.getElementById('error-alert-text');
    alertText.textContent = message;
    alertBox.classList.remove('hidden');
    alertBox.scrollIntoView({ behavior: 'smooth' });
}
