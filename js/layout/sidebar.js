import { NAVIGATION_SECTIONS } from "../navigation/navigation.config.js";

function createNavigationLink(item) {
    const link = document.createElement('a');

    link.href = item.href;
    link.dataset.staticModule = item.id;
    link.textContent = item.label;
    link.className = 'sidebar-link';

    if (item.isActive) {
        link.classList.add('sidebar-link-active');
        link.setAttribute('aria-current', 'page');
    }

    link.addEventListener('click', (event) => {
        event.preventDefault();
    });

    return link;
}

function createNavigationSection(section) {
    const group = document.createElement('section');
    const title = document.createElement('p');
    const links = document.createElement('div');

    title.className = 'px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400';
    title.textContent = section.label;
    links.className = 'grid grid-cols-2 gap-1 sm:grid-cols-4 lg:flex lg:flex-col';

    section.items.forEach((item) => {
        links.append(createNavigationLink(item));
    });

    group.append(title, links);

    return group;
}

export function renderSidebar() {
    const navigation = document.getElementById('sidebar-navigation');

    if (!navigation) return;

    navigation.replaceChildren(
        ...NAVIGATION_SECTIONS.map(createNavigationSection)
    );
}

export function initSidebar() {
    renderSidebar();
}
