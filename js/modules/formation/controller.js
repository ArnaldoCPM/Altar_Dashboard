import { getCurrentUser } from "../../session.js";
import { getAllUsers } from "../../data/users.js";
import { getActiveChapels } from "../../data/chapels.js";
import { isAdmin, isCoordinator } from "../../permissions.js";
import {
    createFormation,
    getFormation,
    subscribeToFormations,
    updateFormation,
    updateFormationStatus
} from "./services/formation.service.js";
import {
    createPole,
    getPole,
    subscribeToPoles,
    updatePole,
    updatePoleActive
} from "./services/pole.service.js";
import {
    clearSubscriptions,
    getState,
    resetState,
    setCurrentFormation,
    setCurrentPole,
    setFilteredFormations,
    setFilters,
    setFormations,
    setNavigation,
    setPoleLoadStatus,
    setPermissions,
    setPoles,
    setSubscription,
    setUiState
} from "./state.js";
import { renderFormationView } from "./views/formation.view.js";
import { renderPoleView } from "./views/pole.view.js";

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
        return;
    }

    renderFormationView(root, state, {
        action: handleViewAction,
        applyFilters,
        save: saveFormation,
        poleSummaryByFormationId: state.data.poleSummaryByFormationId
    });
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
    if (!formationId) throw new Error("Selecione uma formação antes de gerenciar polos.");
    return formationId;
}

function canEditPole(pole) {
    if (isAdmin()) return true;
    const user = getCurrentUser();
    return isCoordinator() && Boolean(user?.uid) && (pole.coordinatorIds || []).includes(user.uid);
}

function requirePoleEditPermission(pole) {
    if (!canEditPole(pole)) throw new Error("Você não possui permissão para editar este polo.");
}

function validatePole(input, existingPole = null) {
    const name = input.name?.trim();
    const chapelIds = Array.from(new Set(input.chapelIds || []));
    const coordinatorIds = input.coordinatorIds === undefined ? [...(existingPole?.coordinatorIds || [])] : Array.from(new Set(input.coordinatorIds));
    if (!name) throw new Error("Informe o nome do polo.");
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
        setUiState({ loading: false, error: "Não foi possível carregar os polos. Tente novamente." });
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
        setUiState({ loading: false, error: error.message || "Não foi possível carregar os polos." });
        render();
    }
}

async function showPoleForm(poleId = null) {
    try {
        const formationId = currentPoleFormationId();
        const pole = poleId ? getState().data.poles.find((item) => item.id === poleId) || await getPole(formationId, poleId) : null;
        if (poleId && !pole) throw new Error("Polo não encontrado.");
        if (pole) requirePoleEditPermission(pole);
        if (!pole && !isAdmin()) throw new Error("Você não possui permissão para criar polos.");
        await loadPoleResources();
        setCurrentPole(pole || null);
        setNavigation({ currentView: "pole-form" });
        setUiState({ error: null, success: null });
        render();
    } catch (error) {
        setUiState({ error: error.message || "Não foi possível abrir o formulário do polo." });
        render();
    }
}

async function savePole(input) {
    try {
        const formationId = currentPoleFormationId();
        const existingPole = input.id ? getState().data.poles.find((pole) => pole.id === input.id) : null;
        if (input.id && !existingPole) throw new Error("Polo não encontrado.");
        if (existingPole) requirePoleEditPermission(existingPole);
        if (!existingPole && !isAdmin()) throw new Error("Você não possui permissão para criar polos.");
        const pole = validatePole(input, existingPole);
        setUiState({ loading: true, error: null, success: null });
        render();
        if (existingPole) {
            await updatePole(formationId, existingPole.id, pole);
            setUiState({ success: "Polo atualizado com sucesso." });
        } else {
            await createPole(formationId, { ...pole, active: true });
            setUiState({ success: "Polo criado com sucesso." });
        }
        setCurrentPole(null);
        setNavigation({ currentView: "poles" });
    } catch (error) {
        setUiState({ error: error.message || "Não foi possível salvar o polo." });
    } finally {
        setUiState({ loading: false });
        render();
    }
}

async function togglePole(poleId, active) {
    try {
        if (!isAdmin()) throw new Error("Você não possui permissão para alterar o status do polo.");
        const formationId = currentPoleFormationId();
        if (!getState().data.poles.some((item) => item.id === poleId)) throw new Error("Polo não encontrado.");
        setUiState({ loading: true, error: null, success: null });
        render();
        await updatePoleActive(formationId, poleId, active !== "true");
        setUiState({ success: active === "true" ? "Polo desativado com sucesso." : "Polo ativado com sucesso." });
    } catch (error) {
        setUiState({ error: error.message || "Não foi possível alterar o status do polo." });
    } finally {
        setUiState({ loading: false });
        render();
    }
}

function backToFormationDetails() {
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

        if (input.id) {
            await updateFormation(input.id, formation);
            setUiState({ success: "Formação atualizada com sucesso." });
        } else {
            const user = getCurrentUser();
            if (!user?.uid) throw new Error("Não foi possível identificar o usuário autenticado.");

            await createFormation({
                ...formation,
                status: "draft",
                createdBy: user.uid
            });
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

function showForm(formationId = null) {
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
    setCurrentFormation(null);
    setCurrentPole(null);
    setNavigation({ currentView: "list" });
    render();
}

function handleViewAction(action, formationId, status) {
    if (action === "create") showForm();
    if (action === "edit") showForm(formationId);
    if (action === "details") showDetails(formationId);
    if (action === "status") changeStatus(formationId, status);
    if (action === "poles") showPoles(formationId);
    if (action === "back") backToList();
}

function handlePoleAction(action, poleId, active) {
    if (action === "create") showPoleForm();
    if (action === "edit") showPoleForm(poleId);
    if (action === "toggle") togglePole(poleId, active);
    if (action === "back") backToFormationDetails();
}

function loadFormations() {
    setSubscription("formations", subscribeToFormations((formations) => {
        setFormations(formations);
        applyFilters(getState().filters);
        setUiState({ loading: false, error: null });
        render();
    }, () => {
        setUiState({ loading: false, error: "Não foi possível carregar as formações. Tente novamente." });
        render();
    }));
}

function initialize({ mountElement } = {}) {
    if (initialized) return;

    resetState();
    root = document.createElement("section");
    root.id = "formation-module-root";
    mountElement?.append(root);
    initialized = true;
    resolvePermissions();
    setUiState({ loading: true });
    render();
    loadFormations();
}

function refresh() {
    if (!initialized) return;

    resolvePermissions();
    loadFormations();
}

function destroy() {
    if (!initialized) return;

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
