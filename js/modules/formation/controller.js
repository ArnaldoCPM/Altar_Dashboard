import { getCurrentUser } from "../../session.js";
import { getAllUsers } from "../../data/users.js";
import { getActiveChapels } from "../../data/chapels.js";
import { getAllServers, getServersByChapelIds } from "../../data/servers.js";
import { cleanStr } from "../../utils.js";
import { isAdmin, isCoordinator } from "../../permissions.js";
import {
    createFormation,
    createFormationWithGroups,
    getFormation,
    subscribeToFormations,
    updateFormation,
    updateFormationStatus
} from "./services/formation.service.js";
import { createGroup, getGroups, setGroupActive, updateGroup } from "./services/group-catalog.service.js";
import {
    createPole,
    countPoles,
    getPole,
    getPoles,
    subscribeToPoles,
    updatePole,
    updatePoleActive
} from "./services/pole.service.js";
import { createEncounter, getEncounter, subscribeToEncounters, updateEncounter, updateEncounterStatus, updateResponsibilities } from "./services/encounter.service.js";
import { addParticipant, countPendingParticipants, createPreparedParticipants, getParticipantExclusions, hasParticipants, removeParticipant, subscribeToParticipants, updateAttendance } from "./services/participant.service.js";
import { getOperationalEncounters } from "./services/operational-encounters.service.js";
import {
    clearSubscriptions,
    getState,
    resetState,
    setCurrentFormation,
    setCurrentEncounter,
    setCurrentPole,
    setEncounters,
    setOperationalEncounters,
    setParticipants,
    setFilteredFormations,
    setFilters,
    setFormations,
    setNavigation,
    setPoleLoadStatus,
    setPoleCount,
    setPermissions,
    setPoles,
    setSubscription,
    setUiState
} from "./state.js";
import { renderFormationView } from "./views/formation.view.js";
import { renderPoleView } from "./views/pole.view.js";
import { renderEncounterView } from "./views/encounter.view.js";
import { renderParticipantsView } from "./views/participants.view.js";
import { renderEncounterReportView } from "./views/report.view.js";
import { renderMyEncountersView } from "./views/my-encounters.view.js";
import { mountBreadcrumb } from "./components/breadcrumb.js";

const VALID_STAGES = new Set(["first", "second"]);
const VALID_MODALITIES = new Set(["initial", "permanent"]);
const VALID_STATUSES = new Set(["draft", "active", "completed", "archived"]);
const STATUS_TRANSITIONS = {
    draft: new Set(["active", "archived"]),
    active: new Set(["completed", "archived"]),
    completed: new Set(["archived"]),
    archived: new Set(["archived"])
};

let initialized = false;
let root = null;
let poleResources = { chapels: [], coordinators: [] };
let groupCatalog = [];
let encounterResources = { chapels: [], designatedCoordinators: [], allCoordinators: [], userNames: {} };
let participantResources = { servers: [] };
let lifecycleVersion = 0;
const POLE_COUNT_CONCURRENCY = 4;

// This array is the sole in-memory source for the reusable group catalog.
// Keep its identity stable so an open Formation form and the catalog UI never
// end up reading different cached arrays.
function replaceGroupCatalog(groups) {
    groupCatalog.splice(0, groupCatalog.length, ...groups);
}

async function refreshGroupCatalog() {
    replaceGroupCatalog(await getGroups());
}

function replaceCatalogGroup(group) {
    const index = groupCatalog.findIndex((item) => item.id === group.id);
    if (index === -1) groupCatalog.push(group);
    else groupCatalog.splice(index, 1, group);
    groupCatalog.sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}

function activeCatalogGroups() {
    return groupCatalog.filter((group) => group.active === true);
}

function resolvePermissions() {
    const canManageFormations = isAdmin();

    setPermissions({
        canCreate: canManageFormations,
        canEdit: canManageFormations,
        canDelete: false,
        canManageAttendance: false,
        canCloseEncounter: false
    });
}

function render() {
    if (!root) return;

    const state = getState();
    if (["participants", "participant-manual"].includes(state.navigation.currentView)) {
        renderParticipantsView(root, state, { action: handleParticipantAction, addManual: addManualParticipant, canManage: canManageParticipants(), canManageAttendance: canManageAttendance(), canClose: availableEncounterStatuses(state.data.currentEncounter).includes("completed"), servers: participantResources.servers });
        mountBreadcrumb(root, breadcrumbItems(state), handleBreadcrumbNavigation);
        return;
    }
    if (state.navigation.currentView === "encounter-report") {
        renderEncounterReportView(root, state, { action: handleEncounterAction, userNames: encounterResources.userNames });
        mountBreadcrumb(root, breadcrumbItems(state), handleBreadcrumbNavigation);
        return;
    }
    if (state.navigation.currentView === "my-encounters") {
        renderMyEncountersView(root, state, { open: openOperationalEncounter });
        mountBreadcrumb(root, breadcrumbItems(state), handleBreadcrumbNavigation);
        return;
    }
    if (["encounter-list", "encounter-form", "encounter-details", "encounter-substitute"].includes(state.navigation.currentView)) {
        renderEncounterView(root, state, {
            action: handleEncounterAction,
            save: saveEncounter,
            addSubstitute,
            canManage: canManageCurrentPole(),
            canEdit: canEditCurrentEncounter(),
            canManageResponsibilities: isAdmin(),
            canAddSubstitute: isAdmin() && state.navigation.currentView !== "encounter-substitute",
            statusActions: availableEncounterStatuses(state.data.currentEncounter),
            ...encounterResources
        });
        mountBreadcrumb(root, breadcrumbItems(state), handleBreadcrumbNavigation);
        return;
    }
    if (state.navigation.currentView === "poles" || state.navigation.currentView === "pole-form") {
        renderPoleView(root, state, {
            action: handlePoleAction,
            savePole,
            canCreatePole: isAdmin(),
            canTogglePole: isAdmin(),
            canManageCoordinators: isAdmin(),
            editablePoleIds: state.data.poles.filter(canEditPole).map((pole) => pole.id),
            chapelNameById: Object.fromEntries(poleResources.chapels.map((chapel) => [chapel.id, chapel.name])),
            chapels: poleResources.chapels,
            coordinators: poleResources.coordinators
        });
        mountBreadcrumb(root, breadcrumbItems(state), handleBreadcrumbNavigation);
        return;
    }

    renderFormationView(root, state, {
        action: handleViewAction,
        applyFilters,
        save: saveFormation,
        poleSummaryByFormationId: state.data.poleSummaryByFormationId,
        groupCatalog,
        catalogChapels: poleResources.chapels,
        catalogCoordinators: poleResources.coordinators,
        createCatalogGroup,
        canManageCatalog: isAdmin()
    });
    mountBreadcrumb(root, breadcrumbItems(state), handleBreadcrumbNavigation);
}

function breadcrumbItems(state) {
    const { currentFormation, currentPole, currentEncounter } = state.data;
    const { currentView } = state.navigation;
    const items = [{ label: "Formações", action: currentView === "list" ? null : "formations" }];

    if (currentFormation && currentView !== "list") items.push({ label: currentFormation.name, action: ["details", "form"].includes(currentView) ? null : "formation" });
    if (["poles", "pole-form"].includes(currentView)) {
        items.push({ label: currentPole?.name || "Grupos de formação", action: null });
    }
    if (currentPole && ["encounter-list", "encounter-form", "encounter-details", "encounter-substitute", "encounter-report", "participants", "participant-manual"].includes(currentView)) {
        items.push({ label: currentPole.name, action: "pole" });
    }
    if (currentView === "my-encounters") items.push({ label: "Meus encontros", action: null });
    if (currentView === "encounter-list") items.push({ label: "Encontros", action: null });
    if (["encounter-form", "encounter-details", "encounter-substitute", "encounter-report", "participants", "participant-manual"].includes(currentView) && (currentEncounter || currentView === "encounter-form")) {
        items.push({ label: currentEncounter?.title || "Novo encontro", action: ["encounter-details", "encounter-substitute", "encounter-form"].includes(currentView) ? null : "encounter" });
    }
    if (["participants", "participant-manual"].includes(currentView)) items.push({ label: "Participantes", action: null });
    if (currentView === "encounter-report") items.push({ label: "Relatório", action: null });
    return items;
}

function applyFilters(filters = {}) {
    setFilters({
        query: filters.query ?? "",
        status: filters.status || null,
        stage: filters.stage || null,
        modality: filters.modality || null
    });

    const { data, filters: currentFilters } = getState();
    const query = currentFilters.query.trim().toLocaleLowerCase();
    const filtered = data.formations.filter((formation) => {
        const matchesQuery = !query || formation.name.toLocaleLowerCase().includes(query);
        const matchesStatus = !currentFilters.status || formation.status === currentFilters.status;
        const matchesStage = !currentFilters.stage || formation.stage === currentFilters.stage;
        const matchesModality = !currentFilters.modality || formation.modalities.includes(currentFilters.modality);

        return matchesQuery && matchesStatus && matchesStage && matchesModality;
    });

    setFilteredFormations(filtered);
    render();
}

function loadInitialPoleCounts(formations) {
    const state = getState();
    const formationIds = formations
        .map((formation) => formation.id)
        .filter((formationId) => !state.data.poleSummaryByFormationId[formationId]);
    if (!formationIds.length) return;

    formationIds.forEach((formationId) => setPoleLoadStatus(formationId, "loading"));
    render();

    const version = lifecycleVersion;
    let nextIndex = 0;
    const loadNext = async () => {
        while (nextIndex < formationIds.length) {
            const formationId = formationIds[nextIndex++];
            try {
                const count = await countPoles(formationId);
                if (!initialized || version !== lifecycleVersion) return;
                if (getState().data.poleSummaryByFormationId[formationId]?.source !== "poles") setPoleCount(formationId, count);
            } catch {
                if (!initialized || version !== lifecycleVersion) return;
                if (getState().data.poleSummaryByFormationId[formationId]?.source !== "poles") setPoleLoadStatus(formationId, "error");
            }
            render();
        }
    };

    Array.from({ length: Math.min(POLE_COUNT_CONCURRENCY, formationIds.length) }, loadNext);
}

function validateFormation(input) {
    const name = input.name?.trim();
    const description = input.description?.trim() || "";
    const rawModalities = input.modalities || [];
    const modalities = Array.from(new Set(rawModalities));

    if (!name) throw new Error("Informe o nome da formação.");
    if (!VALID_STAGES.has(input.stage)) throw new Error("Selecione uma etapa válida.");
    if (modalities.length === 0 || modalities.length !== rawModalities.length || modalities.some((modality) => !VALID_MODALITIES.has(modality))) {
        throw new Error("Selecione ao menos uma modalidade válida.");
    }
    if ((input.startDate && !isValidDateInput(input.startDate)) || (input.endDate && !isValidDateInput(input.endDate))) {
        throw new Error("Informe datas válidas.");
    }
    if (input.startDate && input.endDate && input.endDate < input.startDate) {
        throw new Error("A data final não pode ser anterior à data inicial.");
    }

    return {
        name,
        description,
        stage: input.stage,
        modalities,
        ...(input.startDate ? { startDate: input.startDate } : {}),
        ...(input.endDate ? { endDate: input.endDate } : {})
    };
}

function isValidDateInput(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    return date.getFullYear() === year
        && date.getMonth() === month - 1
        && date.getDate() === day;
}

function requirePermission(permission) {
    if (!getState().permissions[permission]) {
        throw new Error("Você não possui permissão para esta operação.");
    }
}

function currentPoleFormationId() {
    const formationId = getState().data.currentFormation?.id;
    if (!formationId) throw new Error("Selecione uma formação antes de gerenciar grupos.");
    return formationId;
}

function canEditPole(pole) {
    if (isAdmin()) return true;
    const user = getCurrentUser();
    return isCoordinator() && Boolean(user?.uid) && (pole.coordinatorIds || []).includes(user.uid);
}

function canManageCurrentPole() {
    const pole = getState().data.currentPole;
    return Boolean(pole) && (isAdmin() || canEditPole(pole));
}

function canEditCurrentEncounter() {
    const encounter = getState().data.currentEncounter;
    return Boolean(encounter) && canManageCurrentPole() && (isAdmin() || encounter.status === "scheduled");
}

function canManageParticipants() {
    const encounter = getState().data.currentEncounter;
    return Boolean(encounter) && encounter.status === "scheduled" && canManageCurrentPole();
}

function canManageAttendance() {
    const { currentEncounter, currentPole } = getState().data;
    const user = getCurrentUser();
    if (!currentEncounter || !user?.uid) return false;
    if (currentEncounter.status === "completed") return isAdmin();
    if (currentEncounter.status !== "in_progress") return false;
    return isAdmin()
        || (isCoordinator() && (currentPole?.coordinatorIds || []).includes(user.uid))
        || (isCoordinator() && (currentEncounter.coordinatorIds || []).includes(user.uid));
}

function participantSnapshot(server, participationType, userId) {
    const chapel = encounterResources.chapels.find((item) => item.id === server.chapelId);
    return { serverId: server.id, serverName: server.Nome || server.id, chapelId: server.chapelId || "", chapelName: chapel?.name || server.Capela || server.chapelId || "", participationType, attendanceStatus: "pending", addedManually: participationType === "manual", addedBy: userId };
}

function ageAt(value, reference) {
    const text = String(value || "").trim(); const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/) || text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null; const [year, month, day] = match[3] ? [Number(match[3]), Number(match[2]), Number(match[1])] : [Number(match[1]), Number(match[2]), Number(match[3])]; const birth = new Date(year, month - 1, day); if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day || birth > reference) return null; let age = reference.getFullYear() - year; if (reference.getMonth() < month - 1 || (reference.getMonth() === month - 1 && reference.getDate() < day)) age -= 1; return age;
}

function isEligibleServer(server) {
    const { currentFormation, currentPole, currentEncounter } = getState().data;
    const age = ageAt(server.Data_nascimento, currentEncounter.startAt?.toDate ? currentEncounter.startAt.toDate() : new Date(currentEncounter.startAt));
    const stageOk = currentFormation.stage === "first" ? age >= 6 && age <= 11 : age >= 12 && age <= 24;
    const type = cleanStr(server.Tipo); const modality = type.includes("instit") ? "permanent" : type.includes("candidato") || type.includes("formando") ? "initial" : null;
    return stageOk && modality && currentFormation.modalities.includes(modality) && currentPole.chapelIds.includes(server.chapelId);
}

function manualInclusionWarnings(server) {
    const { currentFormation, currentPole, currentEncounter } = getState().data;
    const warnings = [];
    const reference = currentEncounter.startAt?.toDate ? currentEncounter.startAt.toDate() : new Date(currentEncounter.startAt);
    const age = ageAt(server.Data_nascimento, reference);
    if (age === null) warnings.push("Data de nascimento inválida ou ausente");
    else if (!(currentFormation.stage === "first" ? age >= 6 && age <= 11 : age >= 12 && age <= 24)) warnings.push("Fora da faixa etária");
    const type = cleanStr(server.Tipo);
    const modality = type.includes("instit") ? "permanent" : type.includes("candidato") || type.includes("formando") ? "initial" : null;
    if (!modality) warnings.push("Tipo não classificável");
    else if (!currentFormation.modalities.includes(modality)) warnings.push("Modalidade não contemplada");
    if (!currentPole.chapelIds.includes(server.chapelId)) warnings.push("Capela fora do grupo");
    return warnings;
}

function availableEncounterStatuses(encounter) {
    if (!encounter) return [];
    const user = getCurrentUser();
    const operational = isCoordinator() && (encounter.coordinatorIds || []).includes(user?.uid);
    if (encounter.status === "scheduled" && (canManageCurrentPole() || operational)) return ["in_progress", ...(canManageCurrentPole() ? ["cancelled"] : [])];
    if (encounter.status === "in_progress" && (canManageCurrentPole() || operational)) return ["completed"];
    return [];
}

async function loadEncounterResources() {
    const pole = getState().data.currentPole;
    if (!pole) throw new Error("Selecione um grupo antes de gerenciar encontros.");
    const chapels = (await getActiveChapels()).filter((chapel) => (pole.chapelIds || []).includes(chapel.id));
    const users = isAdmin() ? await getAllUsers() : [];
    const allCoordinators = users.filter((user) => user.documentId === user.uid && user.role === "coordinator" && user.active === true).map((user) => ({ id: user.uid, name: user.displayName || user.email || user.uid }));
    const currentUser = getCurrentUser();
    const visibleDesignatedIds = new Set((getState().data.currentEncounter?.responsibilities || [])
        .filter((item) => item.type === "designated")
        .map((item) => item.userId));
    if (!isAdmin() && currentUser?.uid && (pole.coordinatorIds || []).includes(currentUser.uid)) visibleDesignatedIds.add(currentUser.uid);
    const designatedCoordinators = isAdmin()
        ? allCoordinators.filter((user) => (pole.coordinatorIds || []).includes(user.id))
        : [...visibleDesignatedIds].map((id) => ({ id, name: id === currentUser?.uid ? (currentUser.displayName || currentUser.email || id) : id }));
    const userNames = Object.fromEntries(allCoordinators.map((user) => [user.id, user.name]));
    if (currentUser?.uid && (currentUser.displayName || currentUser.email)) userNames[currentUser.uid] = currentUser.displayName || currentUser.email;
    encounterResources = { chapels, designatedCoordinators, allCoordinators, userNames };
}

function loadEncounters() {
    const { currentFormation, currentPole } = getState().data;
    if (!currentFormation?.id || !currentPole?.id) return;
    setSubscription("encounters", subscribeToEncounters(currentFormation.id, currentPole.id, (encounters) => {
        setEncounters(encounters);
        const currentEncounter = getState().data.currentEncounter;
        if (currentEncounter) setCurrentEncounter(encounters.find((item) => item.id === currentEncounter.id) || null);
        setUiState({ loading: false, error: null });
        render();
    }, () => {
        setUiState({ loading: false, error: "Não foi possível carregar os encontros. Tente novamente." });
        render();
    }));
}

function loadParticipants() {
    const { currentFormation, currentPole, currentEncounter } = getState().data;
    if (!currentFormation?.id || !currentPole?.id || !currentEncounter?.id) return;
    setSubscription("participants", subscribeToParticipants(currentFormation.id, currentPole.id, currentEncounter.id, (participants) => { setParticipants(participants); setUiState({ loading: false, error: null }); render(); }, () => { setUiState({ loading: false, error: "Não foi possível carregar os participantes. Tente novamente." }); render(); }));
}

async function showParticipants() {
    try { const encounter = getState().data.currentEncounter; if (!encounter) throw new Error("Selecione um encontro."); setNavigation({ currentView: "participants" }); setUiState({ loading: true, error: null, success: null }); participantResources = { servers: [] }; loadParticipants(); render(); } catch (error) { setUiState({ error: error.message }); render(); }
}

async function showEncounterReport() {
    try {
        const encounter = getState().data.currentEncounter;
        if (!encounter) throw new Error("Selecione um encontro.");
        setNavigation({ currentView: "encounter-report" });
        setUiState({ loading: true, error: null, success: null });
        loadParticipants();
        render();
    } catch (error) {
        setUiState({ error: error.message || "Não foi possível abrir o relatório." });
        render();
    }
}

async function generateParticipants() {
    try {
        if (!canManageParticipants()) throw new Error("Você não possui permissão para gerar participantes.");
        const { currentFormation, currentPole, currentEncounter, participants } = getState().data;
        setUiState({ loading: true, error: null }); render();
        const [servers, exclusions] = await Promise.all([getServersByChapelIds(currentPole.chapelIds), getParticipantExclusions(currentFormation.id, currentPole.id, currentEncounter.id)]);
        const existing = new Set(participants.map((item) => item.serverId));
        const prepared = servers.filter(isEligibleServer).filter((server) => !existing.has(server.id) && !exclusions.has(server.id)).map((server) => participantSnapshot(server, "regular", getCurrentUser().uid));
        await createPreparedParticipants(currentFormation.id, currentPole.id, currentEncounter.id, prepared);
        setUiState({ success: prepared.length ? `${prepared.length} participante(s) adicionado(s).` : "Nenhum novo participante elegível." });
    } catch (error) { setUiState({ error: error.message || "Não foi possível gerar participantes." }); } finally { setUiState({ loading: false }); render(); }
}

async function showManualParticipantForm() {
    try { if (!canManageParticipants()) throw new Error("Você não possui permissão para adicionar participantes."); const servers = await getAllServers(); participantResources = { servers: servers.map((server) => ({ ...server, eligible: isEligibleServer(server), manualWarnings: manualInclusionWarnings(server) })) }; setNavigation({ currentView: "participant-manual" }); setUiState({ error: null, success: null }); render(); } catch (error) { setUiState({ error: error.message }); render(); }
}

async function addManualParticipant(serverId) {
    try { if (!canManageParticipants()) throw new Error("Você não possui permissão para adicionar participantes."); const { currentFormation, currentPole, currentEncounter, participants } = getState().data; const server = participantResources.servers.find((item) => item.id === serverId); if (!server) throw new Error("Servidor não encontrado."); if (participants.some((item) => item.serverId === serverId)) throw new Error("Este servidor já é participante."); await addParticipant(currentFormation.id, currentPole.id, currentEncounter.id, participantSnapshot(server, "manual", getCurrentUser().uid)); setNavigation({ currentView: "participants" }); setUiState({ success: "Participante adicionado manualmente." }); } catch (error) { setUiState({ error: error.message }); } finally { render(); }
}

async function removeParticipantFromEncounter(serverId) {
    try { if (!canManageParticipants()) throw new Error("Você não possui permissão para remover participantes."); const { currentFormation, currentPole, currentEncounter } = getState().data; await removeParticipant(currentFormation.id, currentPole.id, currentEncounter.id, serverId, getCurrentUser().uid); setUiState({ success: "Participante removido e excluído de futuras gerações." }); } catch (error) { setUiState({ error: error.message }); } finally { render(); }
}

async function saveAttendance(serverId, input) {
    try {
        const { currentFormation, currentPole, currentEncounter, participants } = getState().data;
        const user = getCurrentUser();
        if (!canManageAttendance()) throw new Error("Você não possui permissão para registrar presença neste encontro.");
        if (!participants.some((participant) => participant.serverId === serverId)) throw new Error("Participante não encontrado.");
        if ((getState().ui.savingAttendanceIds || []).includes(serverId)) return;
        const attendanceStatus = input?.attendanceStatus;
        if (!["pending", "present", "absent", "justified"].includes(attendanceStatus)) throw new Error("Status de presença inválido.");
        const attendanceNote = String(input?.attendanceNote || "").trim();
        if (attendanceNote.length > 500) throw new Error("A observação pode ter no máximo 500 caracteres.");
        if (attendanceStatus === "justified" && !attendanceNote) throw new Error("Informe a justificativa da ausência.");
        setUiState({ savingAttendanceIds: [...new Set([...(getState().ui.savingAttendanceIds || []), serverId])], error: null, success: null });
        render();
        await updateAttendance(currentFormation.id, currentPole.id, currentEncounter.id, serverId, { attendanceStatus, attendanceNote, recordedBy: user.uid });
        setUiState({ success: "Presença atualizada." });
    } catch (error) {
        setUiState({ error: error.message || "Não foi possível atualizar a presença." });
    } finally {
        setUiState({ savingAttendanceIds: (getState().ui.savingAttendanceIds || []).filter((id) => id !== serverId) });
        render();
    }
}

function normalizedResponsibilities(designatedIds, existing = []) {
    const selected = new Set(designatedIds);
    const oldDesignated = existing.filter((item) => item.type === "designated");
    const updatedDesignated = oldDesignated.map((item) => ({ ...item, status: selected.has(item.userId) ? "confirmed" : "cancelled" }));
    const known = new Set(oldDesignated.map((item) => item.userId));
    for (const userId of selected) if (!known.has(userId)) updatedDesignated.push({ userId, type: "designated", status: "confirmed" });
    return [...updatedDesignated, ...existing.filter((item) => item.type === "substitute")];
}

function coordinatorIdsFrom(responsibilities) {
    return [...new Set(responsibilities.filter((item) => item.status === "confirmed").map((item) => item.userId))];
}

function validateEncounter(input, existing = null) {
    const pole = getState().data.currentPole;
    const title = input.title?.trim();
    const startAt = new Date(input.startAt);
    const endAt = input.endAt ? new Date(input.endAt) : null;
    const chapel = encounterResources.chapels.find((item) => item.id === input.chapelId);
    // Rules allow a non-admin Polo Coordinator to create only an encounter
    // assigned to themself. The field is intentionally read-only in that form.
    const designatedIds = !existing && isCoordinator() && !isAdmin()
        ? [getCurrentUser().uid]
        : [...new Set(input.designatedIds || [])];
    if (!title) throw new Error("Informe o título do encontro.");
    if (Number.isNaN(startAt.getTime()) || (endAt && Number.isNaN(endAt.getTime()))) throw new Error("Informe data e horário válidos.");
    if (endAt && endAt < startAt) throw new Error("O horário final não pode ser anterior ao inicial.");
    if (!chapel || !(pole.chapelIds || []).includes(chapel.id)) throw new Error("Selecione uma capela ativa atendida pelo grupo.");
    if (designatedIds.some((id) => !encounterResources.designatedCoordinators.some((user) => user.id === id))) throw new Error("Selecione apenas coordenadores ativos do grupo.");
    const responsibilities = normalizedResponsibilities(designatedIds, existing?.responsibilities || []);
    return { title, description: input.description?.trim() || "", startAt, ...(endAt ? { endAt } : {}), location: { chapelId: chapel.id, name: chapel.name }, responsibilities, coordinatorIds: coordinatorIdsFrom(responsibilities) };
}

async function showEncounters(poleId) {
    try {
        const pole = getState().data.poles.find((item) => item.id === poleId);
        if (!pole) throw new Error("Grupo de formação não encontrado.");
        setCurrentPole(pole); setCurrentEncounter(null); setNavigation({ currentView: "encounter-list" }); setUiState({ loading: true, error: null, success: null });
        await loadEncounterResources(); loadEncounters(); render();
    } catch (error) { setUiState({ loading: false, error: error.message || "Não foi possível carregar os encontros." }); render(); }
}

async function showEncounterDetails(encounterId) {
    try { const { currentFormation, currentPole, encounters } = getState().data; const encounter = encounters.find((item) => item.id === encounterId) || await getEncounter(currentFormation.id, currentPole.id, encounterId); if (!encounter) throw new Error("Encontro não encontrado."); setCurrentEncounter(encounter); setNavigation({ currentView: "encounter-details" }); await loadEncounterResources(); setUiState({ error: null, success: null }); render(); } catch (error) { setUiState({ error: error.message }); render(); }
}

async function showMyEncounters() {
    try {
        setNavigation({ currentView: "my-encounters" });
        setUiState({ loading: true, error: null, success: null }); render();
        setOperationalEncounters(await getOperationalEncounters());
        setUiState({ loading: false });
    } catch (error) { setUiState({ loading: false, error: error.message || "Não foi possível carregar seus encontros." }); }
    render();
}

async function openOperationalEncounter(context) {
    try {
        if (!context?.formationId || !context?.poleId || !context?.encounterId) throw new Error("Encontro não informado.");
        setUiState({ loading: true, error: null, success: null }); render();
        const formation = await getFormation(context.formationId);
        const pole = formation && await getPole(context.formationId, context.poleId);
        const encounter = pole && await getEncounter(context.formationId, context.poleId, context.encounterId);
        if (!formation || !pole || !encounter) throw new Error("Encontro não encontrado.");
        setCurrentFormation(formation); setCurrentPole(pole); setCurrentEncounter(encounter); setEncounters([encounter]);
        setNavigation({ currentView: "encounter-details" }); await loadEncounterResources(); loadEncounters();
        setUiState({ loading: false });
    } catch (error) { setUiState({ loading: false, error: error.message || "Não foi possível abrir o encontro." }); }
    render();
    if (context?.operation === "start") changeEncounterStatus("in_progress");
    if (context?.operation === "participants") showParticipants();
}

async function showEncounterForm(encounterId = null) {
    try { if (!canManageCurrentPole()) throw new Error("Você não possui permissão para administrar encontros."); const encounter = encounterId ? getState().data.encounters.find((item) => item.id === encounterId) : null; if (encounter && !canEditCurrentEncounter()) throw new Error("Este encontro não pode mais ter sua agenda editada."); await loadEncounterResources(); setCurrentEncounter(encounter || null); setNavigation({ currentView: "encounter-form" }); setUiState({ error: null, success: null }); render(); } catch (error) { setUiState({ error: error.message }); render(); }
}

async function saveEncounter(input) {
    try { const { currentFormation, currentPole, currentEncounter } = getState().data; if (!canManageCurrentPole()) throw new Error("Você não possui permissão para administrar encontros."); if (currentEncounter && !canEditCurrentEncounter()) throw new Error("Este encontro não pode mais ter sua agenda editada."); const encounter = validateEncounter(input, currentEncounter); setUiState({ loading: true, error: null }); render(); if (currentEncounter) await updateEncounter(currentFormation.id, currentPole.id, currentEncounter.id, encounter); else await createEncounter(currentFormation.id, currentPole.id, { ...encounter, status: "scheduled", createdBy: getCurrentUser().uid }); setNavigation({ currentView: "encounter-list" }); setCurrentEncounter(null); } catch (error) { setUiState({ error: error.message || "Não foi possível salvar o encontro." }); } finally { setUiState({ loading: false }); render(); }
}

function statusConfirmationCopy(status) {
    if (status === "in_progress") return { title: "Iniciar encontro?", message: "Após iniciar, não será possível adicionar ou remover participantes.", cancelLabel: "Cancelar", confirmLabel: "Iniciar encontro" };
    if (status === "completed") return { title: "Concluir encontro?", message: "Após concluir, somente um administrador poderá corrigir as presenças.", cancelLabel: "Cancelar", confirmLabel: "Concluir encontro" };
    return { title: "Cancelar encontro?", message: "O encontro cancelado não aceitará registros de presença.", cancelLabel: "Voltar", confirmLabel: "Cancelar encontro" };
}

function clearStatusConfirmation() {
    setUiState({ pendingStatusConfirmation: null });
    render();
}

function openStatusConfirmation(confirmation) {
    const copy = statusConfirmationCopy(confirmation.status);
    if (confirmation.status === "completed" && confirmation.pendingCount > 0) {
        copy.message = `Ainda há ${confirmation.pendingCount} participante${confirmation.pendingCount === 1 ? "" : "s"} sem presença. Deseja concluir mesmo assim?`;
    }
    document.dispatchEvent(new CustomEvent("shell:confirm", {
        detail: {
            ...copy,
            onConfirm: () => confirmEncounterStatusChange(confirmation),
            onCancel: clearStatusConfirmation
        }
    }));
}

async function changeEncounterStatus(status) {
    const state = getState();
    const { currentFormation, currentPole, currentEncounter } = state.data;
    if (state.ui.pendingStatusConfirmation || state.ui.statusTransitioning) return;

    try {
        if (!currentFormation?.id || !currentPole?.id || !currentEncounter?.id) throw new Error("Selecione um encontro.");
        if (!availableEncounterStatuses(currentEncounter).includes(status)) throw new Error("Transição de status não permitida.");
        if (status === "in_progress") {
            if (!(currentEncounter.coordinatorIds || []).length) throw new Error("Defina ao menos um responsável confirmado antes de iniciar.");
            if (!await hasParticipants(currentFormation.id, currentPole.id, currentEncounter.id)) {
                throw new Error("Não é possível iniciar o encontro sem participantes. Adicione ou gere os participantes antes de iniciar.");
            }
        }

        const pendingCount = status === "completed"
            ? await countPendingParticipants(currentFormation.id, currentPole.id, currentEncounter.id)
            : 0;
        const confirmation = { formationId: currentFormation.id, poleId: currentPole.id, encounterId: currentEncounter.id, status, pendingCount };
        setUiState({ pendingStatusConfirmation: confirmation, error: null, success: null });
        render();
        openStatusConfirmation(confirmation);
    } catch (error) {
        setUiState({ error: error.message });
        render();
    }
}

async function confirmEncounterStatusChange(confirmation) {
    const state = getState();
    const { currentFormation, currentPole, currentEncounter } = state.data;
    const pending = state.ui.pendingStatusConfirmation;

    if (state.ui.statusTransitioning || !pending
        || pending.encounterId !== confirmation.encounterId
        || currentFormation?.id !== confirmation.formationId
        || currentPole?.id !== confirmation.poleId
        || currentEncounter?.id !== confirmation.encounterId
        || !availableEncounterStatuses(currentEncounter).includes(confirmation.status)) {
        clearStatusConfirmation();
        return;
    }

    setUiState({ pendingStatusConfirmation: null, statusTransitioning: true, loading: true, error: null });
    render();

    try {
        if (confirmation.status === "in_progress" && !await hasParticipants(confirmation.formationId, confirmation.poleId, confirmation.encounterId)) {
            throw new Error("Não é possível iniciar o encontro sem participantes. Adicione ou gere os participantes antes de iniciar.");
        }
        await updateEncounterStatus(confirmation.formationId, confirmation.poleId, confirmation.encounterId, confirmation.status);
        if (confirmation.status === "in_progress") {
            setUiState({ success: "Encontro iniciado." });
            await showParticipants();
            return;
        }
        setUiState({ success: confirmation.status === "completed" ? "Encontro concluído." : "Encontro cancelado." });
    } catch (error) {
        setUiState({ error: error.message });
    } finally {
        setUiState({ loading: false, statusTransitioning: false });
        render();
    }
}

async function addSubstitute(replacesUserId, substituteId) {
    try { if (!isAdmin()) throw new Error("A atribuição de substitutos é temporariamente exclusiva do administrador."); const { currentFormation, currentPole, currentEncounter } = getState().data; const designated = (currentEncounter.responsibilities || []).find((item) => item.type === "designated" && item.userId === replacesUserId && item.status === "confirmed"); if (!designated || !encounterResources.allCoordinators.some((user) => user.id === substituteId) || substituteId === replacesUserId || (currentEncounter.responsibilities || []).some((item) => item.type === "substitute" && item.status === "confirmed" && item.userId === substituteId)) throw new Error("Substituição inválida."); const responsibilities = [...currentEncounter.responsibilities, { userId: substituteId, type: "substitute", replacesUserId, status: "confirmed" }]; await updateResponsibilities(currentFormation.id, currentPole.id, currentEncounter.id, responsibilities, coordinatorIdsFrom(responsibilities)); setNavigation({ currentView: "encounter-details" }); } catch (error) { setUiState({ error: error.message }); } finally { render(); }
}

function requirePoleEditPermission(pole) {
    if (!canEditPole(pole)) throw new Error("Você não possui permissão para editar este grupo.");
}

function validatePole(input, existingPole = null) {
    const name = input.name?.trim();
    const chapelIds = Array.from(new Set(input.chapelIds || []));
    const coordinatorIds = input.coordinatorIds === undefined ? [...(existingPole?.coordinatorIds || [])] : Array.from(new Set(input.coordinatorIds));
    if (!name) throw new Error("Informe o nome do grupo.");
    if (!input.baseChapelId) throw new Error("Selecione a capela base.");
    if (!chapelIds.length) throw new Error("Selecione ao menos uma capela atendida.");
    if (chapelIds.length !== (input.chapelIds || []).length) throw new Error("Não repita capelas atendidas.");
    if (!chapelIds.includes(input.baseChapelId)) throw new Error("A capela base deve pertencer às capelas atendidas.");
    const activeChapelIds = new Set(poleResources.chapels.map((chapel) => chapel.id));
    const historicalChapelIds = new Set(existingPole?.chapelIds || []);
    if (chapelIds.some((chapelId) => !activeChapelIds.has(chapelId) && !historicalChapelIds.has(chapelId))) throw new Error("Selecione apenas capelas ativas.");
    if (isAdmin()) {
        if (coordinatorIds.length !== (input.coordinatorIds || []).length) throw new Error("Não repita coordenadores.");
        const validCoordinatorIds = new Set(poleResources.coordinators.map((coordinator) => coordinator.id));
        if (coordinatorIds.some((coordinatorId) => !validCoordinatorIds.has(coordinatorId))) throw new Error("Selecione apenas coordenadores ativos.");
    }
    return { name, baseChapelId: input.baseChapelId, chapelIds, coordinatorIds };
}

async function loadPoleResources() {
    const chapels = await getActiveChapels();
    const coordinators = isAdmin()
        ? (await getAllUsers()).filter((user) => user.documentId === user.uid && user.role === "coordinator" && user.active === true).map((user) => ({ id: user.uid, name: user.displayName || user.email || user.uid }))
        : [];
    poleResources = { chapels, coordinators };
}

function loadPoles(formationId) {
    setPoleLoadStatus(formationId, "loading");
    setSubscription("poles", subscribeToPoles(formationId, (poles) => {
        setPoles(formationId, poles);
        setUiState({ loading: false, error: null });
        render();
    }, () => {
        setPoleLoadStatus(formationId, "error");
        setUiState({ loading: false, error: "Não foi possível carregar os grupos. Tente novamente." });
        render();
    }));
}

async function showPoles(formationId) {
    try {
        const formation = getState().data.formations.find((item) => item.id === formationId) || await getFormation(formationId);
        if (!formation) throw new Error("Formação não encontrada.");
        setCurrentFormation(formation);
        setCurrentPole(null);
        setNavigation({ currentView: "poles" });
        setUiState({ loading: true, error: null, success: null });
        await loadPoleResources();
        loadPoles(formation.id);
        render();
    } catch (error) {
        setUiState({ loading: false, error: error.message || "Não foi possível carregar os grupos." });
        render();
    }
}

async function showPoleForm(poleId = null) {
    try {
        const formationId = currentPoleFormationId();
        const pole = poleId ? getState().data.poles.find((item) => item.id === poleId) || await getPole(formationId, poleId) : null;
        if (poleId && !pole) throw new Error("Grupo de formação não encontrado.");
        if (pole) requirePoleEditPermission(pole);
        if (!pole && !isAdmin()) throw new Error("Você não possui permissão para criar grupos.");
        await loadPoleResources();
        setCurrentPole(pole || null);
        setNavigation({ currentView: "pole-form" });
        setUiState({ error: null, success: null });
        render();
    } catch (error) {
        setUiState({ error: error.message || "Não foi possível abrir o formulário do grupo." });
        render();
    }
}

async function savePole(input) {
    try {
        const formationId = currentPoleFormationId();
        const existingPole = input.id ? getState().data.poles.find((pole) => pole.id === input.id) : null;
        if (input.id && !existingPole) throw new Error("Grupo de formação não encontrado.");
        if (existingPole) requirePoleEditPermission(existingPole);
        if (!existingPole && !isAdmin()) throw new Error("Você não possui permissão para criar grupos.");
        const pole = validatePole(input, existingPole);
        setUiState({ loading: true, error: null, success: null });
        render();
        if (existingPole) {
            await updatePole(formationId, existingPole.id, pole);
            setUiState({ success: "Grupo atualizado com sucesso." });
        } else {
            await createPole(formationId, { ...pole, active: true });
            setUiState({ success: "Grupo criado com sucesso." });
        }
        setCurrentPole(null);
        setNavigation({ currentView: "poles" });
    } catch (error) {
        setUiState({ error: error.message || "Não foi possível salvar o grupo." });
    } finally {
        setUiState({ loading: false });
        render();
    }
}

async function togglePole(poleId, active) {
    try {
        if (!isAdmin()) throw new Error("Você não possui permissão para alterar o status do grupo.");
        const formationId = currentPoleFormationId();
        if (!getState().data.poles.some((item) => item.id === poleId)) throw new Error("Grupo de formação não encontrado.");
        setUiState({ loading: true, error: null, success: null });
        render();
        await updatePoleActive(formationId, poleId, active !== "true");
        setUiState({ success: active === "true" ? "Grupo desativado com sucesso." : "Grupo ativado com sucesso." });
    } catch (error) {
        setUiState({ error: error.message || "Não foi possível alterar o status do grupo." });
    } finally {
        setUiState({ loading: false });
        render();
    }
}

function backToFormationDetails() {
    setSubscription("encounters", null);
    setSubscription("participants", null);
    setCurrentEncounter(null);
    setEncounters([]);
    setParticipants([]);
    setCurrentPole(null);
    setNavigation({ currentView: "details" });
    setUiState({ loading: false, error: null, success: null });
    loadPoles(currentPoleFormationId());
    render();
}

async function saveFormation(input) {
    try {
        const formation = validateFormation(input);
        requirePermission(input.id ? "canEdit" : "canCreate");
        setUiState({ loading: true, error: null, success: null });
        render();

        const selectedGroups = activeCatalogGroups().filter((group) => (input.groupIds || []).includes(group.id));
        if (input.id) {
            await updateFormation(input.id, formation);
            const existing = getState().data.poles.filter((pole) => pole.groupId && pole.active !== false);
            const selectedIds = new Set(selectedGroups.map((group) => group.id));
            await Promise.all(existing.filter((pole) => !selectedIds.has(pole.groupId)).map((pole) => updatePoleActive(input.id, pole.id, false)));
            await Promise.all(selectedGroups.filter((group) => !existing.some((pole) => pole.groupId === group.id)).map((group) => createPole(input.id, { groupId: group.id, name: group.name, baseChapelId: group.baseChapelId, chapelIds: group.chapelIds, coordinatorIds: group.defaultCoordinatorIds || [], active: true, catalogSnapshotAt: new Date() })));
            setUiState({ success: "Formação atualizada com sucesso." });
        } else {
            const user = getCurrentUser();
            if (!user?.uid) throw new Error("Não foi possível identificar o usuário autenticado.");

            await createFormationWithGroups({
                ...formation,
                status: "draft",
                createdBy: user.uid
            }, selectedGroups);
            setUiState({ success: "Formação criada com sucesso." });
        }

        setNavigation({ currentView: "list" });
        setCurrentFormation(null);
    } catch (error) {
        setUiState({ error: error.message || "Não foi possível salvar a formação." });
    } finally {
        setUiState({ loading: false });
        render();
    }
}

async function showDetails(formationId) {
    try {
        setUiState({ loading: true, error: null, success: null });
        render();
        const formation = await getFormation(formationId);

        if (!formation) throw new Error("Formação não encontrada.");

        setSubscription("encounters", null);
        setSubscription("participants", null);
        setCurrentEncounter(null);
        setEncounters([]);
        setParticipants([]);
        setCurrentPole(null);
        setCurrentFormation(formation);
        setNavigation({ currentView: "details" });
        loadPoles(formation.id);
    } catch (error) {
        setUiState({ error: error.message || "Não foi possível carregar a formação." });
    } finally {
        setUiState({ loading: false });
        render();
    }
}

async function showForm(formationId = null) {
    const formation = formationId
        ? getState().data.formations.find((item) => item.id === formationId)
        : null;

    if (formationId && !formation) {
        setUiState({ error: "Formação não encontrada." });
        render();
        return;
    }

    try {
        requirePermission(formationId ? "canEdit" : "canCreate");
        await loadPoleResources();
        await refreshGroupCatalog();
        if (formation) loadPoles(formation.id);
        setCurrentFormation(formation || null);
        setNavigation({ currentView: "form" });
        setUiState({ error: null, success: null });
        render();
    } catch (error) {
        setUiState({ error: error.message });
        render();
    }
}

async function changeStatus(formationId, status) {
    try {
        requirePermission("canEdit");
        if (!VALID_STATUSES.has(status)) throw new Error("Status inválido.");

        const formation = getState().data.formations.find((item) => item.id === formationId);
        if (!formation) throw new Error("Formação não encontrada.");
        if (!STATUS_TRANSITIONS[formation.status].has(status)) {
            throw new Error("Esta transição de status não é permitida.");
        }

        setUiState({ loading: true, error: null, success: null });
        render();
        await updateFormationStatus(formationId, status);
        setUiState({ success: "Status atualizado com sucesso." });
    } catch (error) {
        setUiState({ error: error.message || "Não foi possível atualizar o status." });
    } finally {
        setUiState({ loading: false });
        render();
    }
}

function backToList() {
    setSubscription("poles", null);
    setSubscription("encounters", null);
    setSubscription("participants", null);
    setCurrentFormation(null);
    setCurrentPole(null);
    setCurrentEncounter(null);
    setEncounters([]);
    setParticipants([]);
    setNavigation({ currentView: "list" });
    render();
}

async function createCatalogGroup(input) {
    try {
        if (!isAdmin()) throw new Error("Você não possui permissão para criar grupos de formação.");
        const group = validatePole({ ...input, coordinatorIds: input.defaultCoordinatorIds || [] });
        const catalogGroup = { ...group, defaultCoordinatorIds: group.coordinatorIds, active: input.active === true };
        const id = input.id || await createGroup(catalogGroup);
        if (input.id) await updateGroup(input.id, catalogGroup);
        const savedGroup = { id, ...catalogGroup };
        replaceCatalogGroup(savedGroup);
        setUiState({ error: null, success: input.id ? "Grupo atualizado." : "Grupo criado." });
        return savedGroup;
    } catch (error) {
        setUiState({ error: error.message || "Não foi possível criar o grupo." });
        render();
        return null;
    }
}

async function showGroupCatalog() {
    try {
        if (!isAdmin()) throw new Error("Você não possui permissão para administrar o catálogo de grupos.");
        await loadPoleResources();
        await refreshGroupCatalog();
        setNavigation({ currentView: "catalog" });
        setUiState({ error: null });
    } catch (error) {
        setUiState({ error: error.message || "Não foi possível carregar o catálogo de grupos." });
    }
    render();
}

async function changeCatalogGroupActive(groupId, active) {
    try {
        if (!isAdmin()) throw new Error("Você não possui permissão para alterar o catálogo de grupos.");
        await setGroupActive(groupId, active);
        const group = groupCatalog.find((item) => item.id === groupId);
        if (!group) throw new Error("Grupo de formação não encontrado no catálogo.");
        replaceCatalogGroup({ ...group, active });
        setUiState({ success: active ? "Grupo ativado no catálogo." : "Grupo desativado no catálogo." });
    } catch (error) {
        setUiState({ error: error.message || "Não foi possível atualizar o grupo." });
    }
    render();
}

function handleBreadcrumbNavigation(level) {
    const { currentFormation, currentPole, currentEncounter } = getState().data;

    if (level === "formations") {
        backToList();
        return;
    }
    if (level === "formation" && currentFormation?.id) {
        setSubscription("participants", null);
        setSubscription("encounters", null);
        setCurrentEncounter(null);
        setCurrentPole(null);
        showDetails(currentFormation.id);
        return;
    }
    if (level === "pole" && currentPole?.id) {
        showEncounters(currentPole.id);
        return;
    }
    if (level === "encounter" && currentEncounter?.id) {
        setSubscription("participants", null);
        setParticipants([]);
        setNavigation({ currentView: "encounter-details" });
        render();
    }
}

function handleViewAction(action, formationId, status) {
    if (action === "create") showForm();
    if (action === "edit") showForm(formationId);
    if (action === "details") showDetails(formationId);
    if (action === "status") changeStatus(formationId, status);
    if (action === "poles") showPoles(formationId);
    if (action === "group") showEncounters(formationId);
    if (action === "catalog") showGroupCatalog();
    if (action === "catalog-render") render();
    if (action === "catalog-active") changeCatalogGroupActive(formationId, status === "true");
    if (action === "back") backToList();
}

function handlePoleAction(action, poleId, active) {
    if (action === "encounters") showEncounters(poleId);
    if (action === "create") showPoleForm();
    if (action === "edit") showPoleForm(poleId);
    if (action === "toggle") togglePole(poleId, active);
    if (action === "back") backToFormationDetails();
}

function handleEncounterAction(action, encounterId, status) {
    if (action === "my-encounters") showMyEncounters();
    if (action === "participants") showParticipants();
    if (action === "report") showEncounterReport();
    if (action === "create") showEncounterForm();
    if (action === "details") showEncounterDetails(encounterId);
    if (action === "edit") showEncounterForm(encounterId);
    if (action === "status") changeEncounterStatus(status);
    if (action === "substitute") { setNavigation({ currentView: "encounter-substitute" }); loadEncounterResources().then(render).catch((error) => { setUiState({ error: error.message }); render(); }); }
    if (action === "back") {
        const currentView = getState().navigation.currentView;
        if (currentView === "encounter-list") {
            backToFormationDetails();
            return;
        } else if (currentView === "encounter-details") {
            setCurrentEncounter(null);
            setNavigation({ currentView: "encounter-list" });
        } else if (currentView === "encounter-report") {
            setSubscription("participants", null);
            setParticipants([]);
            setNavigation({ currentView: "encounter-details" });
        } else {
            setNavigation({ currentView: getState().data.currentEncounter ? "encounter-details" : "encounter-list" });
        }
        render();
    }
}

function handleParticipantAction(action, serverId, input) {
    if (action === "generate") generateParticipants();
    if (action === "manual") showManualParticipantForm();
    if (action === "remove") removeParticipantFromEncounter(serverId);
    if (action === "attendance") saveAttendance(serverId, input);
    if (action === "conclude") changeEncounterStatus("completed");
    if (action === "back") {
        if (getState().navigation.currentView === "participant-manual") setNavigation({ currentView: "participants" });
        else { setSubscription("participants", null); setParticipants([]); setNavigation({ currentView: "encounter-details" }); }
        render();
    }
}

function loadFormations() {
    setSubscription("formations", subscribeToFormations((formations) => {
        setFormations(formations);
        applyFilters(getState().filters);
        loadInitialPoleCounts(formations);
        setUiState({ loading: false, error: null });
        render();
    }, () => {
        setUiState({ loading: false, error: "Não foi possível carregar as formações. Tente novamente." });
        render();
    }));
}

function initialize({ mountElement, context } = {}) {
    if (initialized) return;

    lifecycleVersion += 1;
    resetState();
    root = document.createElement("section");
    root.id = "formation-module-root";
    mountElement?.append(root);
    initialized = true;
    resolvePermissions();
    setUiState({ loading: true });
    render();
    loadFormations();
    if (context?.type === "my-encounters") showMyEncounters();
    if (context?.type === "operational-encounter") openOperationalEncounter(context);
}

function refresh() {
    if (!initialized) return;

    resolvePermissions();
    loadFormations();
}

function destroy() {
    if (!initialized) return;

    lifecycleVersion += 1;
    clearSubscriptions();
    root?.remove();
    root = null;
    resetState();
    initialized = false;
}

export {
    destroy,
    initialize,
    refresh
};
