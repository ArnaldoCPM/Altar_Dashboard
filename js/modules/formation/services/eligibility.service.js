import { ageOn, parseFormationDate } from "./date.service.js";

const SERVER_TYPES = ["Candidato", "Formando", "Instituído"];
const parseDate = parseFormationDate;

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
