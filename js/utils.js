const cleanStr = (s) => (s || '').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function generateWpLink(number, text) {
    let cleanNum = number.toString().replace(/\D/g, '');
    if (!cleanNum.startsWith('55') && cleanNum.length <= 11) {
        cleanNum = '55' + cleanNum;
    }
    return `https://api.whatsapp.com/send?phone=${cleanNum}&text=${encodeURIComponent(text)}`;
}

function parseStoredDate(value) {
    if (!value) return null;
    if (typeof value.toDate === 'function') return parseStoredDate(value.toDate());
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === 'object' && typeof value.seconds === 'number') {
        return parseStoredDate(new Date(value.seconds * 1000));
    }

    const dateValue = String(value).trim();
    const brazilianDate = dateValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const isoDate = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const parts = brazilianDate
        ? [brazilianDate[3], brazilianDate[2], brazilianDate[1]]
        : isoDate ? [isoDate[1], isoDate[2], isoDate[3]] : null;

    if (!parts) return null;

    const [year, month, day] = parts.map(Number);
    const parsedDate = new Date(year, month - 1, day);
    return parsedDate.getFullYear() === year
        && parsedDate.getMonth() === month - 1
        && parsedDate.getDate() === day
        ? parsedDate : null;
}

function calculateAge(date) {
    const birthDate = parseStoredDate(date);
    if (!birthDate) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const birthdayHasNotOccurred = today.getMonth() < birthDate.getMonth()
        || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());

    if (birthdayHasNotOccurred) age -= 1;
    return age >= 0 ? age : null;
}

export { cleanStr, generateWpLink, calculateAge };
