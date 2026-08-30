import { statusBadge } from "../components/status-badge.js";
import { bindBackButton, renderBackButton } from "../components/back-button.js";

function escapeHtml(value = "") {
    const element = document.createElement("span");
    element.textContent = value;
    return element.innerHTML;
}

function renderFeedback(ui) {
    return `${ui.error ? `<p class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">${escapeHtml(ui.error)}</p>` : ""}${ui.success ? `<p class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">${escapeHtml(ui.success)}</p>` : ""}`;
}

function selectedIds(ids = []) {
    return new Set(ids);
}

function renderPoleList(state, actions) {
    const { currentFormation, poles } = state.data;
    const editablePoleIds = new Set(actions.editablePoleIds || []);
    const rows = poles.map((pole) => `<tr class="border-t border-slate-100"><td class="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">${escapeHtml(pole.name)}</td><td class="px-4 py-3 text-slate-600">${escapeHtml(actions.chapelNameById[pole.baseChapelId] || pole.baseChapelId)}</td><td class="whitespace-nowrap px-4 py-3 text-slate-600">${(pole.chapelIds || []).length}</td><td class="whitespace-nowrap px-4 py-3 text-slate-600">${(pole.coordinatorIds || []).length}</td><td class="whitespace-nowrap px-4 py-3">${statusBadge("pole", pole.active ? "active" : "inactive")}</td><td class="whitespace-nowrap px-4 py-3"><div class="flex flex-wrap gap-2"><button class="min-h-11 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2" data-pole-action="encounters" data-pole-id="${pole.id}">Abrir grupo</button>${editablePoleIds.has(pole.id) ? `<button class="min-h-11 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2" data-pole-action="edit" data-pole-id="${pole.id}">Editar grupo</button>` : ""}${actions.canTogglePole ? `<button class="min-h-11 rounded-lg border px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${pole.active ? "border-rose-200 text-rose-700 hover:bg-rose-50" : "border-slate-300 text-slate-700 hover:bg-slate-50"}" data-pole-action="toggle" data-pole-id="${pole.id}" data-pole-active="${pole.active}">${pole.active ? "Desativar" : "Ativar"}</button>` : ""}</div></td></tr>`).join("");
    const content = state.ui.loading ? '<p class="p-6 text-sm text-slate-500">Carregando grupos...</p>' : poles.length ? `<div class="overflow-x-auto"><table class="min-w-[820px] text-sm"><thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th scope="col" class="px-4 py-3">Nome</th><th scope="col" class="px-4 py-3">Capela base</th><th scope="col" class="px-4 py-3">Capelas</th><th scope="col" class="px-4 py-3">Coordenadores</th><th scope="col" class="px-4 py-3">Status</th><th scope="col" class="px-4 py-3">Ações</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="p-6 text-sm text-slate-500">Nenhum grupo cadastrado.</p>';
    return `<section class="space-y-4">${renderBackButton()}<div class="flex flex-wrap items-center justify-between gap-3"><div><h2 class="text-2xl font-bold text-slate-800">Grupos de formação</h2><p class="mt-1 text-sm text-slate-500">${escapeHtml(currentFormation?.name || "Formação")}</p></div>${actions.canCreatePole ? '<button class="min-h-11 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white" data-pole-action="create">Novo grupo</button>' : ""}</div>${renderFeedback(state.ui)}<div class="rounded-2xl border border-slate-200 bg-white shadow-sm">${content}</div></section>`;
}

function renderOptions(items, selected = []) {
    const selectedSet = selectedIds(selected);
    return items.map((item) => `<option value="${escapeHtml(item.id)}" ${selectedSet.has(item.id) ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("");
}

function chapelOptions(chapels, pole) {
    const activeIds = new Set(chapels.map((chapel) => chapel.id));
    const historicalChapels = (pole?.chapelIds || [])
        .filter((chapelId) => !activeIds.has(chapelId))
        .map((chapelId) => ({ id: chapelId, name: `${chapelId} (inativa)` }));
    return [...chapels, ...historicalChapels];
}

function renderPoleForm(state, actions) {
    const pole = state.data.currentPole;
    const editing = Boolean(pole);
    const chapels = chapelOptions(actions.chapels || [], pole);
    const coordinators = actions.coordinators || [];
    return `<section class="mx-auto max-w-3xl space-y-4">${renderBackButton()}<section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 class="text-2xl font-bold text-slate-800">${editing ? "Editar grupo de formação" : "Novo grupo de formação"}</h2><div class="mt-4">${renderFeedback(state.ui)}</div><form class="mt-6 space-y-5" data-pole-form data-pole-id="${pole?.id || ""}"><label class="block text-sm font-semibold text-slate-700">Nome<input required name="name" value="${escapeHtml(pole?.name || "")}" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"></label><div class="grid gap-5 sm:grid-cols-2"><label class="block text-sm font-semibold text-slate-700">Capelas atendidas<select required multiple name="chapelIds" size="${Math.min(Math.max(chapels.length, 3), 6)}" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">${renderOptions(chapels, pole?.chapelIds)}</select><span class="mt-1 block text-xs font-normal text-slate-500">Use Ctrl ou Cmd para selecionar mais de uma.</span></label><label class="block text-sm font-semibold text-slate-700">Capela base<select required name="baseChapelId" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="">Selecione</option>${renderOptions(chapels, pole?.baseChapelId ? [pole.baseChapelId] : [])}</select></label></div>${actions.canManageCoordinators ? `<label class="block text-sm font-semibold text-slate-700">Coordenadores<select multiple name="coordinatorIds" size="${Math.min(Math.max(coordinators.length, 3), 6)}" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">${renderOptions(coordinators, pole?.coordinatorIds)}</select><span class="mt-1 block text-xs font-normal text-slate-500">Apenas coordenadores ativos estão disponíveis.</span></label>` : ""}<div class="flex justify-end gap-3"><button type="button" class="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold" data-pole-action="back">Cancelar</button><button type="submit" class="min-h-11 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Salvar</button></div></form></section></section>`;
}

function bindPoleEvents(root, actions) {
    root.querySelector("[data-pole-form]")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        actions.savePole({
            id: form.dataset.poleId,
            name: form.elements.name.value,
            baseChapelId: form.elements.baseChapelId.value,
            chapelIds: Array.from(form.elements.chapelIds.selectedOptions).map((option) => option.value),
            ...(actions.canManageCoordinators ? { coordinatorIds: Array.from(form.elements.coordinatorIds.selectedOptions).map((option) => option.value) } : {})
        });
    });
    root.querySelectorAll("[data-pole-action]").forEach((element) => {
        element.addEventListener("click", () => actions.action(element.dataset.poleAction, element.dataset.poleId, element.dataset.poleActive));
    });
    bindBackButton(root, () => actions.action("back"));
}

function renderPoleView(root, state, actions) {
    root.innerHTML = state.navigation.currentView === "pole-form" ? renderPoleForm(state, actions) : renderPoleList(state, actions);
    bindPoleEvents(root, actions);
}

export { renderPoleView };
