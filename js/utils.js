import { ageOnCalendar } from "./services/birth-date.service.js";
const cleanStr = (s) => (s || '').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function normalizeWpNumber(number) {
    const cleanNum = String(number || '').replace(/\D/g, '');
    if (/^55\d{10,11}$/.test(cleanNum)) return cleanNum;
    if (/^\d{10,11}$/.test(cleanNum)) return `55${cleanNum}`;
    return null;
}

function generateWpLink(number, text) {
    const cleanNum = normalizeWpNumber(number);
    return cleanNum ? `https://api.whatsapp.com/send?phone=${cleanNum}&text=${encodeURIComponent(text || '')}` : null;
}

// The browser's local day is selected only at this boundary, not in calendar arithmetic.
function calculateAge(value, referenceDate) {
    if (referenceDate === undefined) {
        const today = new Date();
        referenceDate = `${String(today.getFullYear()).padStart(4, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }
    return ageOnCalendar(value, referenceDate);
}

export { cleanStr, generateWpLink, normalizeWpNumber, calculateAge };
