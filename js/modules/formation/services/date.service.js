import { resolveBirthDate, ageOnCalendar } from "../../../services/birth-date.service.js";

// Only domain references may arrive as Date/Timestamp. Birth values stay calendar-only.
function referenceCalendar(value) {
    if (typeof value?.toDate === "function") return referenceCalendar(value.toDate());
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null;
        return `${String(value.getFullYear()).padStart(4, "0")}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
    }
    return resolveBirthDate(typeof value === "string" ? value.trim() : value);
}

function parseFormationDate(value) {
    const iso = referenceCalendar(value);
    if (!iso) return null;
    const [year, month, day] = iso.split("-").map(Number);
    const date = new Date(0);
    date.setFullYear(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date;
}

function ageOn(birthDate, referenceDate) {
    return ageOnCalendar(birthDate, referenceCalendar(referenceDate));
}

export { ageOn, parseFormationDate };
