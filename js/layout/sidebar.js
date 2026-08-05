function getSidebarLinks() {
    return document.querySelectorAll('[data-static-module]');
}

export function initSidebar() {
    getSidebarLinks().forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
        });
    });
}
