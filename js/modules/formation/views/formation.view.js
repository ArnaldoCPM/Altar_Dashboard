const STAGE_LABELS = { first: "1ª Fase — 6 a 11 anos", second: "2ª Fase — 12 a 24 anos" };
const MODALITY_LABELS = { initial: "Inicial", permanent: "Permanente" };
const STATUS_LABELS = { draft: "Rascunho", active: "Ativa", completed: "Concluída", archived: "Arquivada" };

function escapeHtml(value = "") {
    const element = document.createElement("span");
    element.textContent = value;
    return element.innerHTML;
}

function formatDate(value) {
    if (!value) return "Não informado";
    const date = typeof value.toDate === "function" ? value.toDate() : value instanceof Date ? value : typeof value.seconds === "number" ? new Date(value.seconds * 1000) : new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? "Não informado" : date.toLocaleDateString("pt-BR");
}

function renderFeedback(ui) {
    return `${ui.error ? `<p class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">${escapeHtml(ui.error)}</p>` : ""}${ui.success ? `<p class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">${escapeHtml(ui.success)}</p>` : ""}`;
}

function statusActions(formation, canEdit) {
    if (!canEdit) return "";
    const transitions = { draft: ["active", "archived"], active: ["completed", "archived"], completed: ["archived"], archived: ["archived"] };
    return transitions[formation.status].filter((status) => status !== formation.status).map((status) => `<button class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700" data-formation-action="status" data-formation-id="${formation.id}" data-formation-status="${status}">${STATUS_LABELS[status]}</button>`).join("");
}

function poleCountLabel(summary) {
    if (summary?.status !== "loaded") return "—";
    if (summary.count === 0) return "Sem polos";
    return summary.count === 1 ? "1 polo" : `${summary.count} polos`;
}

function polesConfiguredLabel(summary) {
    return summary.count === 1 ? "1 polo configurado" : `${summary.count} polos configurados`;
}

function renderList(state, actions) {
    const { filteredFormations } = state.data;
    const { filters, permissions, ui } = state;
    const rows = filteredFormations.map((formation) => `<tr class="border-t border-slate-100"><td class="px-4 py-3 font-semibold text-slate-800">${escapeHtml(formation.name)}</td><td class="px-4 py-3 text-slate-600">${STAGE_LABELS[formation.stage]}</td><td class="px-4 py-3 text-slate-600">${(formation.modalities || []).map((modality) => MODALITY_LABELS[modality]).join(", ")}</td><td class="px-4 py-3 text-slate-600">${formatDate(formation.startDate)} — ${formatDate(formation.endDate)}</td><td class="px-4 py-3"><span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">${STATUS_LABELS[formation.status]}</span></td><td class="px-4 py-3"><span class="rounded-full bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700">${poleCountLabel(actions.poleSummaryByFormationId[formation.id])}</span></td><td class="px-4 py-3"><div class="flex flex-wrap gap-2"><button class="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white" data-formation-action="details" data-formation-id="${formation.id}">Abrir</button>${permissions.canEdit ? `<button class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700" data-formation-action="edit" data-formation-id="${formation.id}">Editar</button>` : ""}${statusActions(formation, permissions.canEdit)}</div></td></tr>`).join("");
    const content = ui.loading ? '<p class="p-6 text-sm text-slate-500">Carregando formações...</p>' : filteredFormations.length ? `<div class="overflow-x-auto"><table class="min-w-full text-sm"><thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th class="px-4 py-3">Nome</th><th class="px-4 py-3">Etapa</th><th class="px-4 py-3">Modalidades</th><th class="px-4 py-3">Período</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Polos</th><th class="px-4 py-3">Ações</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="p-6 text-sm text-slate-500">Nenhuma formação cadastrada.</p>';
    return `<section class="space-y-6"><div class="flex flex-wrap items-center justify-between gap-3"><div><h2 class="text-2xl font-bold text-slate-800">Formações</h2><p class="mt-1 text-sm text-slate-500">Gerencie os itinerários formativos.</p></div>${permissions.canCreate ? '<button class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white" data-formation-action="create">Nova formação</button>' : ""}</div>${renderFeedback(ui)}<form data-formation-filters class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-4"><input name="query" value="${escapeHtml(filters.query)}" placeholder="Buscar por nome" class="rounded-lg border border-slate-300 px-3 py-2 text-sm"><select name="stage" class="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Todas as etapas</option><option value="first" ${filters.stage === "first" ? "selected" : ""}>${STAGE_LABELS.first}</option><option value="second" ${filters.stage === "second" ? "selected" : ""}>${STAGE_LABELS.second}</option></select><select name="modality" class="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Todas as modalidades</option><option value="initial" ${filters.modality === "initial" ? "selected" : ""}>Inicial</option><option value="permanent" ${filters.modality === "permanent" ? "selected" : ""}>Permanente</option></select><select name="status" class="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Todos os status</option>${Object.entries(STATUS_LABELS).map(([value, label]) => `<option value="${value}" ${filters.status === value ? "selected" : ""}>${label}</option>`).join("")}</select></form><div class="rounded-2xl border border-slate-200 bg-white shadow-sm">${content}</div></section>`;
}

function dateInputValue(value) {
    if (!value) return "";
    const date = typeof value.toDate === "function" ? value.toDate() : value instanceof Date ? value : typeof value.seconds === "number" ? new Date(value.seconds * 1000) : new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function renderForm(formation, ui) {
    const editing = Boolean(formation);
    return `<section class="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div class="flex items-center justify-between gap-3"><h2 class="text-2xl font-bold text-slate-800">${editing ? "Editar formação" : "Nova formação"}</h2><button class="text-sm font-semibold text-slate-500" data-formation-action="back">Voltar</button></div><div class="mt-4">${renderFeedback(ui)}</div><form class="mt-6 space-y-5" data-formation-form data-formation-id="${formation?.id || ""}"><label class="block text-sm font-semibold text-slate-700">Nome<input required name="name" value="${escapeHtml(formation?.name || "")}" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"></label><label class="block text-sm font-semibold text-slate-700">Descrição<textarea name="description" rows="3" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">${escapeHtml(formation?.description || "")}</textarea></label><div class="grid gap-5 sm:grid-cols-2"><label class="text-sm font-semibold text-slate-700">Etapa<select required name="stage" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="">Selecione</option><option value="first" ${formation?.stage === "first" ? "selected" : ""}>${STAGE_LABELS.first}</option><option value="second" ${formation?.stage === "second" ? "selected" : ""}>${STAGE_LABELS.second}</option></select></label><fieldset class="text-sm font-semibold text-slate-700"><legend>Modalidades</legend><label class="mr-4 inline-flex items-center gap-2 font-normal"><input type="checkbox" name="modalities" value="initial" ${(formation?.modalities || []).includes("initial") ? "checked" : ""}> Inicial</label><label class="inline-flex items-center gap-2 font-normal"><input type="checkbox" name="modalities" value="permanent" ${(formation?.modalities || []).includes("permanent") ? "checked" : ""}> Permanente</label></fieldset></div><div class="grid gap-5 sm:grid-cols-2"><label class="text-sm font-semibold text-slate-700">Data inicial<input type="date" name="startDate" value="${dateInputValue(formation?.startDate)}" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"></label><label class="text-sm font-semibold text-slate-700">Data final<input type="date" name="endDate" value="${dateInputValue(formation?.endDate)}" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"></label></div><div class="flex justify-end gap-3"><button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold" data-formation-action="back">Cancelar</button><button type="submit" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Salvar</button></div></form></section>`;
}

function renderPolesSummary(poles, summary) {
    if (summary?.status === "loading") {
        return '<div class="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4"><h3 class="font-semibold text-slate-800">Polos da formação</h3><p class="mt-2 text-sm text-slate-500">Carregando polos...</p></div>';
    }
    if (summary?.status === "error" || summary?.status !== "loaded") return '<div class="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4"><h3 class="font-semibold text-rose-800">Polos da formação</h3><p class="mt-2 text-sm text-rose-700">Não foi possível carregar os polos.</p></div>';
    if (!poles.length) {
        return '<div class="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4"><h3 class="font-semibold text-slate-800">Polos da formação</h3><p class="mt-2 text-sm font-medium text-slate-700">Nenhum polo configurado.</p><p class="mt-1 text-sm text-slate-500">Configure ao menos um polo para organizar a agenda de encontros.</p></div>';
    }
    const items = poles.map((pole) => `<li class="flex items-center justify-between gap-3"><span>${escapeHtml(pole.name)}</span><span class="rounded-full px-2 py-0.5 text-xs font-semibold ${pole.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}">${pole.active ? "Ativo" : "Inativo"}</span></li>`).join("");
    return `<div class="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4"><h3 class="font-semibold text-slate-800">Polos da formação</h3><p class="mt-1 text-sm text-slate-500">${polesConfiguredLabel(summary)}</p><ul class="mt-3 space-y-2 text-sm text-slate-700">${items}</ul></div>`;
}

function renderDetails(formation, permissions, ui, poles, poleSummary) {
    if (!formation) return "";
    return `<section class="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div class="flex flex-wrap items-center justify-between gap-3"><div><h2 class="text-2xl font-bold text-slate-800">${escapeHtml(formation.name)}</h2><p class="mt-1 text-sm text-slate-500">${STATUS_LABELS[formation.status]}</p></div><div class="flex gap-2"><button class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" data-formation-action="back">Voltar</button>${permissions.canEdit ? `<button class="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white" data-formation-action="edit" data-formation-id="${formation.id}">Editar</button>` : ""}</div></div><div class="mt-4">${renderFeedback(ui)}</div><dl class="mt-6 grid gap-4 text-sm sm:grid-cols-2"><div><dt class="font-semibold text-slate-500">Descrição</dt><dd class="mt-1 text-slate-800">${escapeHtml(formation.description || "Não informada")}</dd></div><div><dt class="font-semibold text-slate-500">Etapa</dt><dd class="mt-1 text-slate-800">${STAGE_LABELS[formation.stage]}</dd></div><div><dt class="font-semibold text-slate-500">Modalidades</dt><dd class="mt-1 text-slate-800">${(formation.modalities || []).map((modality) => MODALITY_LABELS[modality]).join(", ")}</dd></div><div><dt class="font-semibold text-slate-500">Período</dt><dd class="mt-1 text-slate-800">${formatDate(formation.startDate)} — ${formatDate(formation.endDate)}</dd></div><div><dt class="font-semibold text-slate-500">Criado por</dt><dd class="mt-1 text-slate-800">${escapeHtml(formation.createdBy || "Não informado")}</dd></div><div><dt class="font-semibold text-slate-500">Criado em</dt><dd class="mt-1 text-slate-800">${formatDate(formation.createdAt)}</dd></div><div><dt class="font-semibold text-slate-500">Atualizado em</dt><dd class="mt-1 text-slate-800">${formatDate(formation.updatedAt)}</dd></div></dl>${renderPolesSummary(poles, poleSummary)}<div class="mt-4"><button class="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white" data-formation-action="poles" data-formation-id="${formation.id}">${poleSummary?.status === "loaded" && !poles.length ? "Configurar primeiro polo" : "Gerenciar polos"}</button></div></section>`;
}

function bindEvents(root, actions) {
    root.querySelector("[data-formation-filters]")?.addEventListener("change", (event) => actions.applyFilters(Object.fromEntries(new FormData(event.currentTarget))));
    root.querySelector("[data-formation-form]")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        actions.save({ id: form.dataset.formationId, name: form.elements.name.value, description: form.elements.description.value, stage: form.elements.stage.value, modalities: Array.from(form.querySelectorAll('input[name="modalities"]:checked')).map((input) => input.value), startDate: form.elements.startDate.value, endDate: form.elements.endDate.value });
    });
    root.querySelectorAll("[data-formation-action]").forEach((element) => element.addEventListener("click", () => actions.action(element.dataset.formationAction, element.dataset.formationId, element.dataset.formationStatus)));
}

function renderFormationView(root, state, actions) {
    const formationId = state.data.currentFormation?.id;
    const detailSummary = actions.poleSummaryByFormationId[formationId];
    root.innerHTML = state.navigation.currentView === "form" ? renderForm(state.data.currentFormation, state.ui) : state.navigation.currentView === "details" ? renderDetails(state.data.currentFormation, state.permissions, state.ui, detailSummary?.status === "loaded" ? state.data.poles : [], detailSummary) : renderList(state, actions);
    bindEvents(root, actions);
}

export { renderFormationView };
