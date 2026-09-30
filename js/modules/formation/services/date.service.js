function calendarDate(year, month, day) {
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

/**
 * Reads the controlled birth-date formats used by Formação.
 *
 * Numeric slash dates are accepted only when their order is unequivocal:
 * 27/08/2014 is Brazilian DD/MM/YYYY and 08/27/2014 is legacy MM/DD/YYYY.
 * Values such as 03/04/2014 are deliberately rejected because their order
 * cannot be known safely.
 */
function parseFormationDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    if (value?.toDate instanceof Function) return parseFormationDate(value.toDate());

    const text = String(value || "").trim();
    let match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/) || text.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (match) return calendarDate(Number(match[1]), Number(match[2]), Number(match[3]));

    match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;
    const first = Number(match[1]); const second = Number(match[2]); const year = Number(match[3]);
    if (first > 12 && second <= 12) return calendarDate(year, second, first); // DD/MM/YYYY
    if (second > 12 && first <= 12) return calendarDate(year, first, second); // unequivocal legacy MM/DD/YYYY
    return null;
}

function ageOn(birthDate, referenceDate) {
    const birth = parseFormationDate(birthDate); const reference = parseFormationDate(referenceDate);
    if (!birth || !reference || birth > reference) return null;
    return reference.getFullYear() - birth.getFullYear() - ((reference.getMonth() < birth.getMonth() || (reference.getMonth() === birth.getMonth() && reference.getDate() < birth.getDate())) ? 1 : 0);
}

export { ageOn, parseFormationDate };
