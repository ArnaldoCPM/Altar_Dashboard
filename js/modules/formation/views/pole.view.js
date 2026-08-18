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
    const rows = poles.map((pole) => `<tr class="border-t border-slate-100"><td class="px-4 py-3 font-semibold text-slate-800">${escapeHtml(pole.name)}</td><td class="px-4 py-3 text-slate-600">${escapeHtml(actions.chapelNameById[pole.baseChapelId] || pole.baseChapelId)}</td><td class="px-4 py-3 text-slate-600">${(pole.chapelIds || []).length}</td><td class="px-4 py-3 text-slate-600">${(pole.coordinatorIds || []).length}</td><td class="px-4 py-3"><span class="rounded-full px-2 py-1 text-xs font-semibold ${pole.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}">${pole.active ? "Ativo" : "Inativo"}</span></td><td class="px-4 py-3"><div class="flex flex-wrap gap-2"><button class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700" data-pole-action="encounters" data-pole-id="${pole.id}">Encontros</button>${editablePoleIds.has(pole.id) ? `<button class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700" data-pole-action="edit" data-pole-id="${pole.id}">Editar</button>` : ""}${actions.canTogglePole ? `<button class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700" data-pole-action="toggle" data-pole-id="${pole.id}" data-pole-active="${pole.active}">${pole.active ? "Desativar" : "Ativar"}</button>` : ""}</div></td></tr>`).join("");
    const content = state.ui.loading ? '<p class="p-6 text-sm text-slate-500">Carregando polos...</p>' : poles.length ? `<div class="overflow-x-auto"><table class="min-w-full text-sm"><thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th class="px-4 py-3">Nome</th><th class="px-4 py-3">Capela base</th><th class="px-4 py-3">Capelas</th><th class="px-4 py-3">Coordenadores</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Ações</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="p-6 text-sm text-slate-500">Nenhum polo cadastrado.</p>';
    return `<section class="space-y-6"><div class="flex flex-wrap items-center justify-between gap-3"><div><h2 class="text-2xl font-bold text-slate-800">Polos</h2><p class="mt-1 text-sm text-slate-500">${escapeHtml(currentFormation?.name || "Formação")}</p></div><div class="flex gap-2"><button class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold" data-pole-action="back">Voltar</button>${actions.canCreatePole ? '<button class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white" data-pole-action="create">Novo polo</button>' : ""}</div></div>${renderFeedback(state.ui)}<div class="rounded-2xl border border-slate-200 bg-white shadow-sm">${content}</div></section>`;
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
    return `<section class="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div class="flex items-center justify-between gap-3"><h2 class="text-2xl font-bold text-slate-800">${editing ? "Editar polo" : "Novo polo"}</h2><button class="text-sm font-semibold text-slate-500" data-pole-action="back">Voltar</button></div><div class="mt-4">${renderFeedback(state.ui)}</div><form class="mt-6 space-y-5" data-pole-form data-pole-id="${pole?.id || ""}"><label class="block text-sm font-semibold text-slate-700">Nome<input required name="name" value="${escapeHtml(pole?.name || "")}" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"></label><div class="grid gap-5 sm:grid-cols-2"><label class="block text-sm font-semibold text-slate-700">Capelas atendidas<select required multiple name="chapelIds" size="${Math.min(Math.max(chapels.length, 3), 6)}" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">${renderOptions(chapels, pole?.chapelIds)}</select><span class="mt-1 block text-xs font-normal text-slate-500">Use Ctrl ou Cmd para selecionar mais de uma.</span></label><label class="block text-sm font-semibold text-slate-700">Capela base<select required name="baseChapelId" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="">Selecione</option>${renderOptions(chapels, pole?.baseChapelId ? [pole.baseChapelId] : [])}</select></label></div>${actions.canManageCoordinators ? `<label class="block text-sm font-semibold text-slate-700">Coordenadores<select multiple name="coordinatorIds" size="${Math.min(Math.max(coordinators.length, 3), 6)}" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">${renderOptions(coordinators, pole?.coordinatorIds)}</select><span class="mt-1 block text-xs font-normal text-slate-500">Apenas coordenadores ativos estão disponíveis.</span></label>` : ""}<div class="flex justify-end gap-3"><button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold" data-pole-action="back">Cancelar</button><button type="submit" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Salvar</button></div></form></section>`;
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
}

function renderPoleView(root, state, actions) {
    root.innerHTML = state.navigation.currentView === "pole-form" ? renderPoleForm(state, actions) : renderPoleList(state, actions);
    bindPoleEvents(root, actions);
}

export { renderPoleView };
