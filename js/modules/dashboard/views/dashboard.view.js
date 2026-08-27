import { cleanStr } from "../../../utils.js";
import { getServerAge, updateKPIs } from "./kpis.view.js";
import { destroyCharts, setChart } from "../controller.js";
import { getCurrentProfile } from "../../../session.js";
function encounterTime(value) { const date = value?.toDate ? value.toDate() : new Date(value); return Number.isNaN(date.getTime()) ? "Data não informada" : date.toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" }); }
function nextOperationalEncounter(items) { const now = Date.now(); const eligible = (items) => items.filter((item) => item.encounter.status === "in_progress" || (item.encounter.status === "scheduled" && (item.encounter.startAt?.toDate ? item.encounter.startAt.toDate().getTime() : new Date(item.encounter.startAt).getTime()) >= now)); const sort = (left, right) => (left.encounter.status === "in_progress" ? 0 : 1) - (right.encounter.status === "in_progress" ? 0 : 1) || (left.encounter.startAt?.toDate ? left.encounter.startAt.toDate().getTime() : new Date(left.encounter.startAt).getTime()) - (right.encounter.startAt?.toDate ? right.encounter.startAt.toDate().getTime() : new Date(right.encounter.startAt).getTime()); const actionable = eligible(items).sort(sort); return actionable.find((item) => item.source === "designated") || actionable.find((item) => item.source === "pole") || null; }
function updateOperationalEncounterCard(items = []) { const profile = getCurrentProfile(); const card = document.getElementById("next-encounter-card"); if (profile?.role !== "coordinator") { card?.classList.add("hidden"); return; } const next = nextOperationalEncounter(items); card?.classList.remove("hidden"); const action = document.getElementById("next-encounter-action"); const all = document.getElementById("my-encounters-link"); if (!next) { document.getElementById("next-encounter-title").textContent = "Você não tem encontros próximos"; document.getElementById("next-encounter-context").textContent = ""; document.getElementById("next-encounter-meta").textContent = ""; document.getElementById("next-encounter-source").textContent = ""; action.classList.add("hidden"); all.classList.remove("hidden"); all.onclick = () => document.dispatchEvent(new CustomEvent("shell:navigate", { detail: { moduleId: "training", context: { type: "my-encounters" } } })); return; } const encounter = next.encounter; document.getElementById("next-encounter-title").textContent = encounter.title; document.getElementById("next-encounter-context").textContent = `${next.formation.name} · ${next.pole.name}`; document.getElementById("next-encounter-meta").textContent = `${encounterTime(encounter.startAt)} · ${encounter.location?.name || "Local não informado"}`; document.getElementById("next-encounter-source").textContent = next.source === "designated" ? "Você foi designado para este encontro" : "Encontro do seu polo"; action.textContent = encounter.status === "scheduled" ? "Iniciar encontro" : "Registrar presença"; action.classList.remove("hidden"); const context = { type: "operational-encounter", formationId: next.formation.id, poleId: next.pole.id, encounterId: encounter.id, operation: encounter.status === "scheduled" ? "start" : "participants" }; action.onclick = () => document.dispatchEvent(new CustomEvent("shell:navigate", { detail: { moduleId: "training", context } })); all.onclick = () => document.dispatchEvent(new CustomEvent("shell:navigate", { detail: { moduleId: "training", context: { type: "my-encounters" } } })); }
function updateUI(data, operationalEncounters = []) {
    updateKPIs(data);
    const profile = getCurrentProfile(); const card = document.getElementById('my-chapel-card');
    if (profile?.role === 'coordinator' && profile.chapelId) { const own = data.filter(server => server.chapelId === profile.chapelId); const count = term => own.filter(server => cleanStr(server.Tipo).includes(term)).length; const active = own.filter(server => cleanStr(server.Estado) !== 'inativo').length; card.classList.remove('hidden'); document.getElementById('my-chapel-summary').textContent = `${own.length} no total · ${active} ativos · ${own.length - active} inativos · ${count('candidato')} candidatos · ${count('formando')} formandos · ${count('institu')} instituídos`; document.getElementById('my-chapel-manage').onclick = () => document.dispatchEvent(new CustomEvent('shell:navigate', { detail: { moduleId: 'servers', context: 'my-chapel' } })); document.getElementById('my-chapel-new').onclick = () => document.dispatchEvent(new CustomEvent('shell:navigate', { detail: { moduleId: 'servers', context: 'my-chapel', action: 'new' } })); } else card.classList.add('hidden');
    updateOperationalEncounterCard(operationalEncounters);
    renderCharts(data);
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
export { updateUI };
