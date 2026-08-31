import { statusBadge } from "../components/status-badge.js";
import { bindBackButton, renderBackButton } from "../components/back-button.js";

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
    if (summary?.status === "loading") return "Carregando...";
    if (summary?.status !== "loaded") return "—";
    if (summary.count === 0) return "Sem grupos";
    return summary.count === 1 ? "1 grupo" : `${summary.count} grupos`;
}

function polesConfiguredLabel(summary) {
    return summary.count === 1 ? "1 grupo configurado" : `${summary.count} grupos configurados`;
}

function renderList(state, actions) {
    const { filteredFormations } = state.data;
    const { filters, permissions, ui } = state;
    const rows = filteredFormations.map((formation) => `<tr class="border-t border-slate-100"><td class="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">${escapeHtml(formation.name)}</td><td class="whitespace-nowrap px-4 py-3 text-slate-600">${STAGE_LABELS[formation.stage]}</td><td class="px-4 py-3 text-slate-600">${(formation.modalities || []).map((modality) => MODALITY_LABELS[modality]).join(", ")}</td><td class="whitespace-nowrap px-4 py-3 text-slate-600">${formatDate(formation.startDate)} — ${formatDate(formation.endDate)}</td><td class="whitespace-nowrap px-4 py-3">${statusBadge("formation", formation.status)}</td><td class="whitespace-nowrap px-4 py-3"><span class="rounded-full bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700">${poleCountLabel(actions.poleSummaryByFormationId[formation.id])}</span></td><td class="whitespace-nowrap px-4 py-3"><div class="flex flex-wrap gap-2"><button class="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2" data-formation-action="details" data-formation-id="${formation.id}">Abrir</button>${permissions.canEdit ? `<button class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2" data-formation-action="edit" data-formation-id="${formation.id}">Editar</button>` : ""}</div></td></tr>`).join("");
    const content = ui.loading ? '<p class="p-6 text-sm text-slate-500">Carregando formações...</p>' : filteredFormations.length ? `<div class="overflow-x-auto"><table class="min-w-[900px] text-sm"><thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th scope="col" class="px-4 py-3">Nome</th><th scope="col" class="px-4 py-3">Etapa</th><th scope="col" class="px-4 py-3">Modalidades</th><th scope="col" class="px-4 py-3">Período</th><th scope="col" class="px-4 py-3">Status</th><th scope="col" class="px-4 py-3">Grupos</th><th scope="col" class="px-4 py-3">Ações</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="p-6 text-sm text-slate-500">Nenhuma formação cadastrada.</p>';
    return `<section class="space-y-6"><div class="flex flex-wrap items-center justify-between gap-3"><div><h2 class="text-2xl font-bold text-slate-800">Formações</h2><p class="mt-1 text-sm text-slate-500">Gerencie os itinerários formativos.</p></div><div class="flex flex-wrap gap-2">${actions.canManageCatalog ? '<button class="min-h-11 rounded-lg border px-4 text-sm font-semibold" data-formation-action="catalog">Administrar grupos de formação</button>' : ""}${permissions.canCreate ? '<button class="min-h-11 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white" data-formation-action="create">Nova formação</button>' : ""}</div></div>${renderFeedback(ui)}<form data-formation-filters class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-4"><input name="query" value="${escapeHtml(filters.query)}" placeholder="Buscar por nome" class="rounded-lg border border-slate-300 px-3 py-2 text-sm"><select name="stage" class="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Todas as etapas</option><option value="first" ${filters.stage === "first" ? "selected" : ""}>${STAGE_LABELS.first}</option><option value="second" ${filters.stage === "second" ? "selected" : ""}>${STAGE_LABELS.second}</option></select><select name="modality" class="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Todas as modalidades</option><option value="initial" ${filters.modality === "initial" ? "selected" : ""}>Inicial</option><option value="permanent" ${filters.modality === "permanent" ? "selected" : ""}>Permanente</option></select><select name="status" class="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Todos os status</option>${Object.entries(STATUS_LABELS).map(([value, label]) => `<option value="${value}" ${filters.status === value ? "selected" : ""}>${label}</option>`).join("")}</select></form><div class="rounded-2xl border border-slate-200 bg-white shadow-sm">${content}</div></section>`;
}

function dateInputValue(value) {
    if (!value) return "";
    const date = typeof value.toDate === "function" ? value.toDate() : value instanceof Date ? value : typeof value.seconds === "number" ? new Date(value.seconds * 1000) : new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function groupChoices(groups, selected = []) {
    const chosen = new Set(selected);
    return groups.map((group) => `<label class="flex min-h-11 gap-3 border-t border-slate-100 py-3"><input type="checkbox" name="groupIds" value="${escapeHtml(group.id)}" ${chosen.has(group.id) ? "checked" : ""}><span><strong>${escapeHtml(group.name)}</strong><small class="block text-slate-500">Capela base: ${escapeHtml(group.baseChapelId)} · ${(group.chapelIds || []).length} capela(s)</small></span></label>`).join("") || '<p class="text-sm text-slate-500">Nenhum grupo ativo cadastrado.</p>';
}

function linkedGroupChoices(poles) {
    return poles.map((pole) => `<label class="flex min-h-11 gap-3 border-t border-slate-100 py-3"><input type="checkbox" name="groupIds" value="${escapeHtml(pole.groupId)}" checked><span><strong>${escapeHtml(pole.name)}</strong><small class="block text-slate-500">Capela base: ${escapeHtml(pole.baseChapelId || "Não informada")} · ${(pole.chapelIds || []).length} capela(s) · ${(pole.coordinatorIds || []).length} coordenador(es)</small><small class="block text-slate-400">Configuração desta formação</small></span></label>`).join("") || '<p class="text-sm text-slate-500">Nenhum grupo reutilizável vinculado.</p>';
}

function groupModal(actions) {
    const options = (items) => items.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("");
    return `<dialog data-group-modal class="w-[min(94vw,42rem)] rounded-2xl border p-0"><form data-group-catalog-form class="space-y-4 p-6"><div class="flex items-center justify-between"><h3 data-group-modal-title class="text-xl font-bold">Criar novo grupo</h3><button type="button" data-group-cancel class="min-h-11 px-3">Fechar</button></div><label class="block">Nome<input required name="name" class="mt-1 w-full rounded border p-2"></label><label class="block">Capela base<select required name="baseChapelId" class="mt-1 w-full rounded border p-2"><option value="">Selecione</option>${options(actions.catalogChapels)}</select></label><label class="block">Capelas atendidas<select required multiple name="chapelIds" class="mt-1 min-h-28 w-full rounded border p-2">${options(actions.catalogChapels)}</select></label><label class="block">Coordenadores habituais<select multiple name="defaultCoordinatorIds" class="mt-1 min-h-28 w-full rounded border p-2">${options(actions.catalogCoordinators)}</select></label><label class="flex gap-2"><input type="checkbox" name="active" checked> Ativo</label><button class="min-h-11 rounded-xl bg-emerald-600 px-4 font-bold text-white">Salvar grupo</button></form></dialog>`;
}

function renderCatalog(state, actions) {
    const cards = actions.groupCatalog.map((group) => `<article class="rounded-xl border bg-white p-4"><div class="flex flex-wrap items-start justify-between gap-3"><div><h3 class="font-bold">${escapeHtml(group.name)}</h3><p class="mt-1 text-sm text-slate-600">Capela base: ${escapeHtml(group.baseChapelId)} · ${(group.chapelIds || []).length} capela(s)</p><p class="mt-1 text-sm text-slate-600">${(group.defaultCoordinatorIds || []).length} coordenador(es) habitual(is)</p></div><span class="rounded-full px-2 py-1 text-xs font-semibold ${group.active === true ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}">${group.active === true ? "Ativo" : "Inativo"}</span></div><div class="mt-4 flex flex-wrap gap-2"><button class="min-h-11 rounded border px-3 text-sm font-semibold" data-catalog-edit="${group.id}">Editar defaults</button><button class="min-h-11 rounded border px-3 text-sm font-semibold" data-formation-action="catalog-active" data-formation-id="${group.id}" data-formation-status="${group.active === true ? "false" : "true"}">${group.active === true ? "Desativar" : "Ativar"}</button></div></article>`).join("") || '<p class="rounded-xl border border-dashed bg-white p-5 text-sm text-slate-500">Nenhum grupo cadastrado.</p>';
    return `<section class="mx-auto max-w-3xl space-y-4"><button class="min-h-11 rounded border px-4 text-sm font-semibold" data-formation-action="back">← Voltar</button><div class="flex flex-wrap items-center justify-between gap-3"><div><h2 class="text-2xl font-bold">Administrar grupos de formação</h2><p class="mt-1 text-sm text-slate-600">Defaults reutilizáveis. Alterações não modificam Formações já criadas.</p></div><button class="min-h-11 rounded-xl bg-emerald-600 px-4 font-bold text-white" data-group-open>+ Criar novo grupo</button></div>${renderFeedback(state.ui)}<div class="grid gap-3">${cards}</div>${groupModal(actions)}</section>`;
}

function renderForm(formation, ui, actions, poles = []) {
    const editing = Boolean(formation);
    const linkedPoles = poles.filter((pole) => pole.active !== false && pole.groupId);
    const selected = linkedPoles.map((pole) => pole.groupId);
    const linkedGroupIds = new Set(selected);
    const availableGroups = actions.groupCatalog.filter((group) => group.active === true && !linkedGroupIds.has(group.id));
    const legacy = poles.filter((pole) => !pole.groupId).length;
    const groupSection = editing
        ? `<section class="space-y-4 rounded-xl border border-sky-100 bg-sky-50 p-4"><div><h3 class="font-bold">Grupos de formação</h3><p class="text-xs text-slate-600">Os grupos vinculados mantêm a configuração desta formação. Os disponíveis usam o catálogo atual.</p></div><section class="rounded-lg border border-sky-200 bg-white p-3"><h4 class="text-sm font-semibold">Grupos já vinculados</h4><div class="mt-2">${linkedGroupChoices(linkedPoles)}</div></section><section class="rounded-lg border border-slate-200 bg-white p-3"><div class="flex flex-wrap items-center justify-between gap-2"><div><h4 class="text-sm font-semibold">Grupos disponíveis para adicionar</h4><p class="text-xs text-slate-500">Grupos ativos do catálogo reutilizável.</p></div><button type="button" class="min-h-11 rounded border px-3" data-group-open>+ Criar novo grupo</button></div><div data-group-choices data-linked-group-ids="${escapeHtml(selected.join(","))}" class="mt-2">${groupChoices(availableGroups)}</div></section>${legacy ? `<p class="text-xs text-slate-600">${legacy} grupo(s) legado(s) continuam preservados.</p>` : ""}</section>`
        : `<section class="rounded-xl border border-sky-100 bg-sky-50 p-4"><div class="flex flex-wrap items-center justify-between gap-2"><div><h3 class="font-bold">Grupos de formação</h3><p class="text-xs text-slate-600">Selecione os grupos que participarão desta formação.</p></div><button type="button" class="min-h-11 rounded border px-3" data-group-open>+ Criar novo grupo</button></div><div data-group-choices class="mt-3">${groupChoices(actions.groupCatalog.filter((group) => group.active === true), selected)}</div></section>`;
    return `<section class="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div class="flex items-center justify-between gap-3"><h2 class="text-2xl font-bold text-slate-800">${editing ? "Editar formação" : "Nova formação"}</h2><button class="text-sm font-semibold text-slate-500" data-formation-action="back">Voltar</button></div><div class="mt-4">${renderFeedback(ui)}</div><form class="mt-6 space-y-5" data-formation-form data-formation-id="${formation?.id || ""}"><label class="block text-sm font-semibold text-slate-700">Nome<input required name="name" value="${escapeHtml(formation?.name || "")}" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"></label><label class="block text-sm font-semibold text-slate-700">Descrição<textarea name="description" rows="3" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">${escapeHtml(formation?.description || "")}</textarea></label><div class="grid gap-5 sm:grid-cols-2"><label class="text-sm font-semibold text-slate-700">Etapa<select required name="stage" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="">Selecione</option><option value="first" ${formation?.stage === "first" ? "selected" : ""}>${STAGE_LABELS.first}</option><option value="second" ${formation?.stage === "second" ? "selected" : ""}>${STAGE_LABELS.second}</option></select></label><fieldset class="text-sm font-semibold text-slate-700"><legend>Modalidades</legend><label class="mr-4 inline-flex items-center gap-2 font-normal"><input type="checkbox" name="modalities" value="initial" ${(formation?.modalities || []).includes("initial") ? "checked" : ""}> Inicial</label><label class="inline-flex items-center gap-2 font-normal"><input type="checkbox" name="modalities" value="permanent" ${(formation?.modalities || []).includes("permanent") ? "checked" : ""}> Permanente</label></fieldset></div><div class="grid gap-5 sm:grid-cols-2"><label class="text-sm font-semibold text-slate-700">Data inicial<input type="date" name="startDate" value="${dateInputValue(formation?.startDate)}" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"></label><label class="text-sm font-semibold text-slate-700">Data final<input type="date" name="endDate" value="${dateInputValue(formation?.endDate)}" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"></label></div>${groupSection}<div class="flex justify-end gap-3"><button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold" data-formation-action="back">Cancelar</button><button type="submit" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Salvar</button></div></form>${groupModal(actions)}</section>`;
}

function renderGroups(poles, summary) {
    if (summary?.status === "loading") return '<section class="mt-6"><h3 class="font-semibold text-slate-800">Grupos de formação</h3><p class="mt-3 rounded-xl border bg-slate-50 p-4 text-sm text-slate-500">Carregando grupos...</p></section>';
    if (summary?.status === "error" || summary?.status !== "loaded") return '<section class="mt-6"><h3 class="font-semibold text-slate-800">Grupos de formação</h3><p class="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Não foi possível carregar os grupos.</p></section>';
    if (!poles.length) return '<section class="mt-6"><h3 class="font-semibold text-slate-800">Grupos de formação</h3><p class="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">Nenhum grupo cadastrado nesta formação.</p></section>';
    const cards = poles.map((pole) => `<article class="rounded-xl border border-slate-200 bg-white p-4"><div class="flex flex-wrap items-start justify-between gap-3"><div><h4 class="font-bold text-slate-800">${escapeHtml(pole.name)}</h4><p class="mt-1 text-sm text-slate-600">Capela base: ${escapeHtml(pole.baseChapelId || "Não informada")}</p><p class="mt-1 text-sm text-slate-600">${(pole.chapelIds || []).length} capela(s) atendida(s)</p><p class="mt-1 text-sm text-slate-600">${(pole.coordinatorIds || []).length} coordenador(es)</p></div>${statusBadge("pole", pole.active ? "active" : "inactive")}</div><button class="mt-4 min-h-11 w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white sm:w-auto" data-formation-action="group" data-formation-id="${pole.id}">Abrir grupo</button></article>`).join("");
    return `<section class="mt-6"><div class="flex flex-wrap items-baseline justify-between gap-2"><h3 class="font-semibold text-slate-800">Grupos de formação</h3><p class="text-sm text-slate-500">${polesConfiguredLabel(summary)}</p></div><div class="mt-3 grid gap-3">${cards}</div></section>`;
}

function renderDetails(formation, permissions, ui, poles, poleSummary) {
    if (!formation) return "";
    const transitions = statusActions(formation, permissions.canEdit);
    return `<section class="mx-auto max-w-3xl space-y-4">${renderBackButton()}<section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div class="flex flex-wrap items-start justify-between gap-4"><div><div class="flex flex-wrap items-center gap-2"><h2 class="text-2xl font-bold text-slate-800">${escapeHtml(formation.name)}</h2>${statusBadge("formation", formation.status)}</div></div><div class="flex flex-wrap gap-2">${permissions.canEdit ? `<button class="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" data-formation-action="edit" data-formation-id="${formation.id}">Editar</button>` : ""}<button class="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" data-formation-action="poles" data-formation-id="${formation.id}">Administrar grupos</button></div></div><div class="mt-4">${renderFeedback(ui)}</div><dl class="mt-6 grid gap-4 text-sm sm:grid-cols-2"><div><dt class="font-semibold text-slate-500">Descrição</dt><dd class="mt-1 text-slate-800">${escapeHtml(formation.description || "Não informada")}</dd></div><div><dt class="font-semibold text-slate-500">Etapa</dt><dd class="mt-1 text-slate-800">${STAGE_LABELS[formation.stage]}</dd></div><div><dt class="font-semibold text-slate-500">Modalidades</dt><dd class="mt-1 text-slate-800">${(formation.modalities || []).map((modality) => MODALITY_LABELS[modality]).join(", ")}</dd></div><div><dt class="font-semibold text-slate-500">Período</dt><dd class="mt-1 text-slate-800">${formatDate(formation.startDate)} — ${formatDate(formation.endDate)}</dd></div></dl>${renderGroups(poles, poleSummary)}${transitions ? `<section class="mt-6 border-t border-slate-200 pt-4"><h3 class="text-sm font-semibold text-slate-700">Ações de status</h3><div class="mt-3 flex flex-wrap gap-2">${transitions}</div></section>` : ""}</section></section>`;
}

function bindEvents(root, actions) {
    root.querySelector("[data-formation-filters]")?.addEventListener("change", (event) => actions.applyFilters(Object.fromEntries(new FormData(event.currentTarget))));
    root.querySelector("[data-formation-form]")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        actions.save({ id: form.dataset.formationId, name: form.elements.name.value, description: form.elements.description.value, stage: form.elements.stage.value, modalities: Array.from(form.querySelectorAll('input[name="modalities"]:checked')).map((input) => input.value), startDate: form.elements.startDate.value, endDate: form.elements.endDate.value, groupIds: Array.from(form.querySelectorAll('input[name="groupIds"]:checked')).map((input) => input.value) });
    });
    const dialog = root.querySelector("[data-group-modal]");
    const groupForm = root.querySelector("[data-group-catalog-form]");
    const openNewGroupModal = () => {
        groupForm.reset();
        delete groupForm.dataset.groupId;
        root.querySelector("[data-group-modal-title]").textContent = "Criar novo grupo";
        dialog.showModal();
    };
    root.querySelector("[data-group-open]")?.addEventListener("click", openNewGroupModal);
    root.querySelector("[data-group-cancel]")?.addEventListener("click", () => dialog.close());
    groupForm?.addEventListener("submit", async (event) => {
        event.preventDefault(); const form = event.currentTarget;
        const group = await actions.createCatalogGroup({ id: form.dataset.groupId || "", name: form.elements.name.value, baseChapelId: form.elements.baseChapelId.value, chapelIds: Array.from(form.elements.chapelIds.selectedOptions).map((option) => option.value), defaultCoordinatorIds: Array.from(form.elements.defaultCoordinatorIds.selectedOptions).map((option) => option.value), active: form.elements.active.checked });
        if (!group) return;
        const choices = root.querySelector("[data-group-choices]");
        dialog.close();
        if (choices) {
            const selected = Array.from(choices.querySelectorAll('input[name="groupIds"]:checked')).map((input) => input.value);
            if (group.active === true && !selected.includes(group.id)) selected.push(group.id);
            const linkedIds = new Set((choices.dataset.linkedGroupIds || "").split(",").filter(Boolean));
            choices.innerHTML = groupChoices(actions.groupCatalog.filter((item) => item.active === true && !linkedIds.has(item.id)), selected);
            return;
        }
        actions.action("catalog-render");
    });
    root.querySelectorAll("[data-catalog-edit]").forEach((button) => button.addEventListener("click", () => { const group = actions.groupCatalog.find((item) => item.id === button.dataset.catalogEdit); if (!group) return; groupForm.dataset.groupId = group.id; groupForm.elements.name.value = group.name; groupForm.elements.baseChapelId.value = group.baseChapelId; Array.from(groupForm.elements.chapelIds.options).forEach((option) => { option.selected = (group.chapelIds || []).includes(option.value); }); Array.from(groupForm.elements.defaultCoordinatorIds.options).forEach((option) => { option.selected = (group.defaultCoordinatorIds || []).includes(option.value); }); groupForm.elements.active.checked = group.active === true; root.querySelector("[data-group-modal-title]").textContent = "Editar grupo"; dialog.showModal(); }));
    root.querySelectorAll("[data-formation-action]").forEach((element) => element.addEventListener("click", () => actions.action(element.dataset.formationAction, element.dataset.formationId, element.dataset.formationStatus)));
    bindBackButton(root, () => actions.action("back"));
}

function renderFormationView(root, state, actions) {
    const formationId = state.data.currentFormation?.id;
    const detailSummary = actions.poleSummaryByFormationId[formationId];
    root.innerHTML = state.navigation.currentView === "catalog" ? renderCatalog(state, actions) : state.navigation.currentView === "form" ? renderForm(state.data.currentFormation, state.ui, actions, state.data.poles) : state.navigation.currentView === "details" ? renderDetails(state.data.currentFormation, state.permissions, state.ui, detailSummary?.status === "loaded" ? state.data.poles : [], detailSummary) : renderList(state, actions);
    bindEvents(root, actions);
}

export { renderFormationView };
