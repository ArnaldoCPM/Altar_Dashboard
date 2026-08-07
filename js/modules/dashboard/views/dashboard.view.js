import { getActiveChapels } from "../../../data/chapels.js";
import { cleanStr } from "../../../utils.js";
import { getServerAge, updateKPIs } from "./kpis.view.js";
import { applyFilters, destroyCharts, getData as getDashboardData, goToPage, nextPage, previousPage, setChart } from "../controller.js";
function updateUI(data) {
    updateKPIs(data);
    renderCharts(data);
    setupInteractiveEvents();
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
// Funciones de navegación (expuestas globalmente)
window.goToPage = function(pageNum) {
    goToPage(pageNum);
}

window.nextPage = function() {
    nextPage();
}

window.previousPage = function() {
    previousPage();
}

// Configuración de eventos interactivos y filtros
function setupInteractiveEvents() {
    const searchInput = document.getElementById('search-input');
    const filterCapilla = document.getElementById('filter-capilla');
    const filterEstado = document.getElementById('filter-estado');
    const filterAlergias = document.getElementById('filter-alergias');
    const filterTipo = document.getElementById('filter-tipo');

    function notifyFilters() {
        const capillaVal = filterCapilla.value;
        const selectedChapelName =
            capillaVal === 'all'
                ? 'all'
                : filterCapilla.options[filterCapilla.selectedIndex]?.textContent?.trim() || '';

        applyFilters({
            query: searchInput.value.toLowerCase(),
            chapelName: selectedChapelName,
            estado: filterEstado.value,
            alergias: filterAlergias.value,
            tipo: filterTipo.value
        });
    }
    // Asignar listeners directamente para evitar solapamientos
    searchInput.oninput = notifyFilters;
    filterCapilla.onchange = notifyFilters;
    filterEstado.onchange = notifyFilters;
    filterAlergias.onchange = notifyFilters;
    filterTipo.onchange = notifyFilters;
}
export { populateFilters, updateUI };
