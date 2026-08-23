import { NAVIGATION_SECTIONS } from "../navigation/navigation.config.js";

let activeModule = 'dashboard';
let currentRole = null;
let lastFocusedElement = null;

const icons = {
    dashboard: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />',
    servers: '<path d="M4 6h16M4 12h16M4 18h10" /><circle cx="18" cy="18" r="2" />',
    training: '<path d="M4 19.5V6.25L12 3l8 3.25V19.5L12 22z" /><path d="M8 8.25 12 10l4-1.75M12 10v8" />',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />'
};

function isDrawerViewport() {
    return window.matchMedia('(max-width: 1023px)').matches;
}

function getSidebarElements() {
    return {
        shell: document.getElementById('app-shell'),
        sidebar: document.getElementById('app-sidebar'),
        overlay: document.getElementById('sidebar-overlay'),
        toggle: document.getElementById('sidebar-toggle'),
        navigation: document.getElementById('sidebar-navigation')
    };
}

function syncSidebarState() {
    const { shell, sidebar, overlay, toggle } = getSidebarElements();
    if (!sidebar || !toggle) return;

    const isDrawer = isDrawerViewport();
    const isOpen = isDrawer ? sidebar.classList.contains('is-drawer-open') : !shell?.classList.contains('sidebar-collapsed');
    if (isDrawer) {
        sidebar.setAttribute('role', 'dialog');
        sidebar.setAttribute('aria-modal', 'true');
        sidebar.setAttribute('aria-label', 'Menu de navegação');
        sidebar.setAttribute('aria-hidden', String(!isOpen));
        sidebar.inert = !isOpen;
    } else {
        sidebar.removeAttribute('role');
        sidebar.removeAttribute('aria-modal');
        sidebar.removeAttribute('aria-label');
        sidebar.removeAttribute('aria-hidden');
        sidebar.inert = false;
    }
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isDrawer
        ? (isOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação')
        : (isOpen ? 'Recolher barra lateral' : 'Expandir barra lateral'));
    overlay?.classList.toggle('hidden', !isDrawer || !isOpen);
}

function focusFirstInDrawer() {
    const { sidebar } = getSidebarElements();
    sidebar?.querySelector('a, button, [tabindex]:not([tabindex="-1"])')?.focus();
}

function getFocusableDrawerElements() {
    const { sidebar } = getSidebarElements();
    return [...(sidebar?.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])') || [])]
        .filter((element) => !element.hidden && element.getClientRects().length);
}

export function closeSidebar({ returnFocus = true } = {}) {
    const { sidebar } = getSidebarElements();
    if (!sidebar?.classList.contains('is-drawer-open')) return;
    sidebar.classList.remove('is-drawer-open');
    syncSidebarState();
    if (returnFocus) lastFocusedElement?.focus?.();
}

function toggleSidebar() {
    const { shell, sidebar } = getSidebarElements();
    if (isDrawerViewport()) {
        if (sidebar.classList.contains('is-drawer-open')) {
            closeSidebar();
        } else {
            lastFocusedElement = document.activeElement;
            sidebar.classList.add('is-drawer-open');
            syncSidebarState();
            requestAnimationFrame(focusFirstInDrawer);
        }
        return;
    }

    shell?.classList.toggle('sidebar-collapsed');
    syncSidebarState();
}

function createNavigationLink(item) {
    const link = document.createElement('a');

    link.href = item.href;
    link.dataset.staticModule = item.id;
    link.innerHTML = `<svg class="sidebar-link-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${icons[item.icon] || ''}</svg><span class="sidebar-link-label">${item.label}</span>`;
    link.className = 'sidebar-link';
    link.title = item.label;

    if (item.id === activeModule) {
        link.classList.add('sidebar-link-active');
        link.setAttribute('aria-current', 'page');
    }

    link.addEventListener('click', (event) => {
        event.preventDefault();
        document.dispatchEvent(new CustomEvent('shell:navigate', {
            detail: { moduleId: item.id, action: item.action || null }
        }));
    });

    return link;
}

function createNavigationSection(section) {
    const group = document.createElement('section');
    const title = document.createElement('p');
    const links = document.createElement('div');

    title.className = 'sidebar-section-label px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400';
    title.textContent = section.label;
    links.className = 'flex flex-col gap-1';

    section.items.filter((item) => !item.roles || item.roles.includes(currentRole)).forEach((item) => {
        links.append(createNavigationLink(item));
    });

    if (!links.childElementCount) return null;

    group.append(title, links);

    return group;
}

export function renderSidebar() {
    const { navigation } = getSidebarElements();

    if (!navigation) return;

    navigation.replaceChildren(
        ...NAVIGATION_SECTIONS.map(createNavigationSection).filter(Boolean)
    );
}

export function initSidebar() {
    renderSidebar();
    const { toggle, overlay } = getSidebarElements();
    toggle?.addEventListener('click', toggleSidebar);
    overlay?.addEventListener('click', () => closeSidebar());
    window.addEventListener('resize', () => {
        const { sidebar } = getSidebarElements();
        if (!isDrawerViewport()) sidebar?.classList.remove('is-drawer-open');
        syncSidebarState();
    });
    document.addEventListener('keydown', (event) => {
        const { sidebar } = getSidebarElements();
        if (!isDrawerViewport() || !sidebar?.classList.contains('is-drawer-open')) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            closeSidebar();
        }
        if (event.key === 'Tab') {
            const focusable = getFocusableDrawerElements();
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
    });
    syncSidebarState();
}

export function updateSidebar({ moduleId = activeModule, role = currentRole } = {}) {
    activeModule = moduleId;
    currentRole = role;
    renderSidebar();
    syncSidebarState();
}
