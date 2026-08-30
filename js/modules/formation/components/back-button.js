function renderBackButton(action = "back") {
    return `<button type="button" class="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2" data-formation-back="${action}">← Voltar</button>`;
}

function bindBackButton(root, onBack) {
    root.querySelectorAll("[data-formation-back]").forEach((element) => {
        element.addEventListener("click", () => onBack(element.dataset.formationBack));
    });
}

export { bindBackButton, renderBackButton };
