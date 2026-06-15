const cleanStr = (s) => (s || '').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function generateWpLink(number, text) {
    let cleanNum = number.toString().replace(/\D/g, '');
    if (!cleanNum.startsWith('55') && cleanNum.length <= 11) {
        cleanNum = '55' + cleanNum;
    }
    return `https://api.whatsapp.com/send?phone=${cleanNum}&text=${encodeURIComponent(text)}`;
}

export { cleanStr, generateWpLink };
