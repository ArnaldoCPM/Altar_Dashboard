import {
    clearSubscriptions,
    resetState,
    setUiState
} from "./state.js";

let initialized = false;
let placeholder = null;

function renderPlaceholder(mountElement) {
    if (!mountElement || placeholder) return;

    placeholder = document.createElement("section");
    placeholder.id = "formation-module-placeholder";
    placeholder.className = "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";
    placeholder.innerHTML = `
        <h2 class="text-xl font-bold text-slate-800">Formação</h2>
        <p class="mt-2 text-sm text-slate-500">Módulo em preparação.</p>
    `;

    mountElement.append(placeholder);
}

function initialize({ mountElement } = {}) {
    if (initialized) return;

    resetState();
    setUiState({ loading: false, error: null });
    renderPlaceholder(mountElement);
    initialized = true;
}

function refresh() {
    if (!initialized) return;

    setUiState({ loading: false, error: null });
}

function destroy() {
    if (!initialized) return;

    clearSubscriptions();
    placeholder?.remove();
    placeholder = null;
    resetState();
    initialized = false;
}

export {
    destroy,
    initialize,
    refresh
};
