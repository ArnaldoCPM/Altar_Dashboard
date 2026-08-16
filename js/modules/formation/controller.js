import { getCurrentUser } from "../../session.js";
import { isAdmin } from "../../permissions.js";
import {
    createFormation,
    getFormation,
    subscribeToFormations,
    updateFormation,
    updateFormationStatus
} from "./services/formation.service.js";
import {
    clearSubscriptions,
    getState,
    resetState,
    setCurrentFormation,
    setFilteredFormations,
    setFilters,
    setFormations,
    setNavigation,
    setPermissions,
    setSubscription,
    setUiState
} from "./state.js";
import { renderFormationView } from "./views/formation.view.js";

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

    renderFormationView(root, getState(), {
        action: handleViewAction,
        applyFilters,
        save: saveFormation
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
    setCurrentFormation(null);
    setNavigation({ currentView: "list" });
    render();
}

function handleViewAction(action, formationId, status) {
    if (action === "create") showForm();
    if (action === "edit") showForm(formationId);
    if (action === "details") showDetails(formationId);
    if (action === "status") changeStatus(formationId, status);
    if (action === "back") backToList();
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
