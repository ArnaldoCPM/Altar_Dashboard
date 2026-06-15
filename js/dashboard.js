import { cleanStr } from "./utils.js";

function updateKPIs(data) {
    document.getElementById('kpi-total').textContent = data.length;

    const countInstituidos = data.filter(d => cleanStr(d.Tipo).includes('instituido') || cleanStr(d.Tipo).includes('serv')).length;
    document.getElementById('kpi-instituidos').textContent = countInstituidos;

    const countCandidatos = data.filter(d => cleanStr(d.Tipo).includes('candidato')).length;
    document.getElementById('kpi-candidatos').textContent = countCandidatos;

    const countFormandos = data.filter(d => cleanStr(d.Tipo).includes('formando')).length;
    document.getElementById('kpi-formandos').textContent = countFormandos;

    const ages = data.map(d => parseInt(d.Idade)).filter(n => !isNaN(n));
    const avgAge = ages.length > 0 ? (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1) : "0";
    document.getElementById('kpi-edad').innerHTML = `${avgAge} <span class="text-xs font-normal text-slate-500">anos</span>`;

    const allergies = data.filter(d => ['sim', 'si', 's'].includes(cleanStr(d.Possui_alergia_doenca))).length;
    document.getElementById('kpi-alergias').textContent = allergies;
}

export { updateKPIs };