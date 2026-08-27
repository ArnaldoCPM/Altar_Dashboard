import { db } from "../../firebase.js";
import { getActiveChapels } from "../../data/chapels.js";
import { cleanStr } from "../../utils.js";
import { subscribeToDashboardData } from "./services/dashboard.service.js";
import { updateUI } from "./views/dashboard.view.js";
import { getOperationalEncounters } from "../formation/services/operational-encounters.service.js";
import {
    clearSubscription,
    destroyChartInstances,
    getData as getDashboardData,
    getPagination as getDashboardPagination,
    getUiState,
    resetState,
    setChartInstance,
    setCurrentPage,
    setData,
    setFilteredItems,
    setUnsubscribe,
    setUiState
} from "./state.js";

let loadGeneration = 0;

function handleDashboardError(error) {
    setUiState({ status: "error", error });
    const alertBox = document.getElementById('error-alert');
    const alertText = document.getElementById('error-alert-text');

    alertText.textContent = 'Erro ao carregar os dados da base de dados do Firestore: ' + error.message;
    alertBox.classList.remove('hidden');
    alertBox.scrollIntoView({ behavior: 'smooth' });
}

async function loadData(chapels) {
    const generation = ++loadGeneration;

    setData([]);
    setFilteredItems([], true);
    setUiState({ status: "loading", error: null });
    document.getElementById('dashboard-content')?.classList.add('hidden');

    let activeChapels;
    try {
        activeChapels = chapels || await getActiveChapels();
    } catch (error) {
        if (generation === loadGeneration) handleDashboardError(error);
        return;
    }

    if (generation !== loadGeneration) return;

    clearSubscription();
    setUnsubscribe(subscribeToDashboardData(db, async (data) => {
        if (generation !== loadGeneration) return;

        setData(data);
        setFilteredItems(data);

        setUiState({ status: "loaded", error: null });
        let operationalEncounters = [];
        try { operationalEncounters = await getOperationalEncounters(); } catch (error) { console.warn("Operational encounters could not be loaded.", error); }
        if (generation !== loadGeneration) return;
        updateUI(getDashboardData(), operationalEncounters);
        document.getElementById('dashboard-content')?.classList.remove('hidden');
        document.getElementById('loading-overlay').classList.add('opacity-0');
        document.getElementById('loading-overlay').classList.add('hidden');
    }, (error) => {
        if (generation === loadGeneration) handleDashboardError(error);
    }));
}

function refresh() {
    const ui = getUiState();
    if (ui.status === "loading") return;
    if (ui.status === "idle" || ui.status === "error") {
        return loadData();
    }

    setFilteredItems(getDashboardData());
    updateUI(getDashboardData());
}

function destroy() {
    loadGeneration += 1;
    resetState();
    document.getElementById('dashboard-content')?.classList.add('hidden');
}

function getData() {
    return getDashboardData();
}

function getPagination() {
    const pagination = getDashboardPagination();

    return {
        currentPage: pagination.currentPage,
        filteredItems: [...pagination.filteredItems],
        itemsPerPage: pagination.itemsPerPage
    };
}

function updateFilteredItems(items) {
    setFilteredItems(items, true);
}

function applyFilters({ query, chapelName, estado, alergias, tipo }) {
    const filteredItems = getDashboardData().filter((server) => {
        const matchesSearch = server.Nome.toLowerCase().includes(query)
            || server.id.toLowerCase().includes(query);
        const matchesChapel = chapelName === 'all'
            || (server.Capela || '').trim() === chapelName;
        const matchesEstado = estado === 'all' || (server.Estado || '').trim() === estado;
        const itemAlergia = ['sim', 'si', 's'].includes(cleanStr(server.Possui_alergia_doenca)) ? 'Sim' : 'Não';
        const matchesAlergias = alergias === 'all' || itemAlergia === alergias;
        const matchesTipo = tipo === 'all' || cleanStr(server.Tipo) === cleanStr(tipo);

        return matchesSearch && matchesChapel && matchesEstado && matchesAlergias && matchesTipo;
    });

    updateFilteredItems(filteredItems);
}

function goToPage(page) {
    setCurrentPage(page);
}

function nextPage() {
    const pagination = getDashboardPagination();
    const totalPages = Math.ceil(pagination.filteredItems.length / pagination.itemsPerPage);

    if (pagination.currentPage < totalPages) {
        setCurrentPage(pagination.currentPage + 1);
    }

}

function previousPage() {
    const pagination = getDashboardPagination();

    if (pagination.currentPage > 1) {
        setCurrentPage(pagination.currentPage - 1);
    }

}

function setChart(name, instance) {
    setChartInstance(name, instance);
}

function destroyCharts() {
    destroyChartInstances();
}

export {
    applyFilters,
    destroy,
    destroyCharts,
    getData,
    getPagination,
    goToPage,
    loadData,
    nextPage,
    previousPage,
    refresh,
    setChart,
    updateFilteredItems
};
