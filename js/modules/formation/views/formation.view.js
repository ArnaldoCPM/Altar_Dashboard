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
        actions.save({ id: form.dataset.formationId, name: form.elements.name.value, description: form.elements.description.value, stage: form.elements.stage.value, modalities: Array.from(form.querySelectorAll('input[name="modalities"]:checked')).map((input) => input.value), startDate: form.elements.startDate.value, endDate: form.elements.endDate.value });
    });
    root.querySelectorAll("[data-formation-action]").forEach((element) => element.addEventListener("click", () => actions.action(element.dataset.formationAction, element.dataset.formationId, element.dataset.formationStatus)));
    bindBackButton(root, () => actions.action("back"));
}

function renderFormationView(root, state, actions) {
    const formationId = state.data.currentFormation?.id;
    const detailSummary = actions.poleSummaryByFormationId[formationId];
    root.innerHTML = state.navigation.currentView === "form" ? renderForm(state.data.currentFormation, state.ui) : state.navigation.currentView === "details" ? renderDetails(state.data.currentFormation, state.permissions, state.ui, detailSummary?.status === "loaded" ? state.data.poles : [], detailSummary) : renderList(state, actions);
    bindEvents(root, actions);
}

export { renderFormationView };
