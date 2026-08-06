import { cleanStr, calculateAge } from "../../../utils.js";

function getServerAge(server) {
    const calculatedAge = calculateAge(server?.Data_nascimento);
    if (calculatedAge !== null) return calculatedAge;

    const legacyAge = parseInt(server?.Idade);
    return Number.isNaN(legacyAge) ? null : legacyAge;
}

function updateKPIs(data) {
    document.getElementById('kpi-total').textContent = data.length;
    document.getElementById('kpi-instituidos').textContent = data.filter((item) => cleanStr(item.Tipo).includes('instituido') || cleanStr(item.Tipo).includes('serv')).length;
    document.getElementById('kpi-candidatos').textContent = data.filter((item) => cleanStr(item.Tipo).includes('candidato')).length;
    document.getElementById('kpi-formandos').textContent = data.filter((item) => cleanStr(item.Tipo).includes('formando')).length;

    const ages = data.map(getServerAge).filter((age) => !isNaN(age));
    const average = ages.length ? (ages.reduce((sum, age) => sum + age, 0) / ages.length).toFixed(1) : '0';
    document.getElementById('kpi-edad').innerHTML = `${average} <span class="text-xs font-normal text-slate-500">anos</span>`;
    document.getElementById('kpi-alergias').textContent = data.filter((item) => ['sim', 'si', 's'].includes(cleanStr(item.Possui_alergia_doenca))).length;
}

export { getServerAge, updateKPIs };
