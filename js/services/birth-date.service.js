// Calendar-only contract: no Date, timezone or locale inference.
function isEmptyBirthDate(value) {
    return value == null || (typeof value === "string" && value.trim() === "");
}
function isValidBirthDateIso(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    if (year < 1 || month < 1 || month > 12 || day < 1) return false;
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}
function classifyStoredBirthDate(value) {
    if (isEmptyBirthDate(value)) return { category: "empty", candidates: [] };
    if (isValidBirthDateIso(value)) return { category: "iso", candidates: [value] };
    if (typeof value !== "string") return { category: "invalid", candidates: [] };
    const ymd = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(value);
    const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
    const iso = (y, m, d) => `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    const possible = ymd ? [iso(ymd[1], ymd[2], ymd[3])] : slash
        ? [iso(slash[3], slash[2], slash[1]), iso(slash[3], slash[1], slash[2])] : [];
    const candidates = [...new Set(possible.filter(isValidBirthDateIso))];
    return { category: candidates.length === 2 ? "ambiguous" : candidates.length === 1 ? "legacy" : "invalid", candidates };
}
function formatBirthDate(value) {
    return isValidBirthDateIso(value) ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : "";
}
// Historical null/undefined/whitespace can be empty; new writes use only "".
function assertBirthDateWrite(value, { allowEmpty = false } = {}) {
    if (allowEmpty && value === "") return value;
    if (!isValidBirthDateIso(value)) throw new Error("Informe uma data de nascimento válida (ano, mês e dia).");
    return value;
}
function validateBirthDatePayload(payload) {
    if (Object.hasOwn(payload, "Data_nascimento")) assertBirthDateWrite(payload.Data_nascimento, { allowEmpty: true });
    return payload;
}
function createBirthDateEditState(original) {
    return { original, inputValue: isValidBirthDateIso(original) ? original : "", classification: classifyStoredBirthDate(original) };
}
function birthDateEditPatch(state, value, { changed = false, clear = false } = {}) {
    if (clear) return { Data_nascimento: "" };
    if (!changed) return {};
    if (value === "") throw new Error("Para apagar a data, marque ‘Remover data de nascimento’. Para preservá-la, reabra o formulário.");
    assertBirthDateWrite(value);
    return value === state.original ? {} : { Data_nascimento: value };
}
export { isEmptyBirthDate, isValidBirthDateIso, classifyStoredBirthDate, formatBirthDate, assertBirthDateWrite, validateBirthDatePayload, createBirthDateEditState, birthDateEditPatch };
