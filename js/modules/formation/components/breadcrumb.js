function escapeHtml(value = "") {
    const element = document.createElement("span");
    element.textContent = value;
    return element.innerHTML;
}

function renderBreadcrumb(items = []) {
    return `<nav aria-label="Navegação contextual" class="mb-4 text-sm text-slate-500"><ol class="flex flex-wrap items-center gap-x-2 gap-y-1">${items.map((item, index) => `${index ? '<li aria-hidden="true" class="text-slate-300">›</li>' : ""}<li>${item.action ? `<button type="button" class="text-left text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline" data-formation-breadcrumb="${escapeHtml(item.action)}">${escapeHtml(item.label)}</button>` : `<span aria-current="page" class="font-semibold text-slate-800">${escapeHtml(item.label)}</span>`}</li>`).join("")}</ol></nav>`;
}

function mountBreadcrumb(root, items, onNavigate) {
    root.querySelector("section")?.insertAdjacentHTML("afterbegin", renderBreadcrumb(items));
    root.querySelectorAll("[data-formation-breadcrumb]").forEach((element) => {
        element.addEventListener("click", () => onNavigate(element.dataset.formationBreadcrumb));
    });
}

export { mountBreadcrumb };
