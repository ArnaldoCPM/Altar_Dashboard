const SERVER_TYPES = ["Candidato", "Formando", "Instituído"];

function parseDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    const text = String(value || "").trim();
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/) || text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;
    const [year, month, day] = match[3] ? [Number(match[1]), Number(match[2]), Number(match[3])] : [Number(match[3]), Number(match[2]), Number(match[1])];
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

function ageOn(birthDate, referenceDate) {
    const birth = parseDate(birthDate); const reference = parseDate(referenceDate);
    if (!birth || !reference || birth > reference) return null;
    return reference.getFullYear() - birth.getFullYear() - ((reference.getMonth() < birth.getMonth() || (reference.getMonth() === birth.getMonth() && reference.getDate() < birth.getDate())) ? 1 : 0);
}

function normalizedType(value) {
    const text = String(value || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (text === "candidato") return "Candidato";
    if (text === "formando") return "Formando";
    if (text === "instituido") return "Instituído";
    return null;
}

function isActiveServer(server) { return String(server?.Estado || "Ativo").trim().toLowerCase() === "ativo"; }

function eligibilityFor(server, criteria, chapelIds = []) {
    const age = ageOn(server?.Data_nascimento, criteria?.referenceDate);
    const type = normalizedType(server?.Tipo);
    const reasons = [];
    if (!isActiveServer(server)) reasons.push("Inativo");
    if (age === null) reasons.push("Data de nascimento inválida");
    else if (age < criteria.minAge || age > criteria.maxAge) reasons.push("Fora dos critérios atuais");
    if (!type || !(criteria.serverTypes || []).includes(type)) reasons.push("Tipo não permitido");
    if (!chapelIds.includes(server?.chapelId)) reasons.push("Capela alterada");
    return { eligible: reasons.length === 0, age, type, reasons };
}

export { SERVER_TYPES, ageOn, eligibilityFor, isActiveServer, normalizedType, parseDate };
