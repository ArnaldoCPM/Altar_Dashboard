import { db } from "../../firebase.js";
import { getActiveChapels } from "../../data/chapels.js";
import { canDelete, canEdit } from "../../authorization.js";
import { subscribeToDashboardData } from "./services/dashboard.service.js";
import { populateFilters, updateUI } from "./views/dashboard.view.js";
import { renderTable } from "./views/table.view.js";
import {
    clearSubscription,
    destroyChartInstances,
    getData as getDashboardData,
    getPagination as getDashboardPagination,
    resetPagination,
    setChartInstance,
    setCurrentPage,
    setData,
    setFilteredItems,
    setUnsubscribe
} from "./state.js";

function handleDashboardError(error) {
    const alertBox = document.getElementById('error-alert');
    const alertText = document.getElementById('error-alert-text');

    alertText.textContent = 'Erro ao carregar os dados da base de dados do Firestore: ' + error.message;
    alertBox.classList.remove('hidden');
    alertBox.scrollIntoView({ behavior: 'smooth' });
}

function getTableActions(server) {
    return {
        mayEditServer: canEdit(server),
        mayDeleteServer: canDelete(server)
    };
}

function renderDashboardTable(data = getPagination().filteredItems) {
    const pagination = getPagination();
    renderTable(data, pagination, getTableActions);
}

async function loadData(chapels) {
    const activeChapels = chapels || await getActiveChapels();

    clearSubscription();
    setUnsubscribe(subscribeToDashboardData(db, async (data) => {
        setData(data);
        setFilteredItems(data);
        await populateFilters(activeChapels, getDashboardData());
        updateUI(getDashboardData());
        renderDashboardTable();
        document.getElementById('loading-overlay').classList.add('opacity-0');
        setTimeout(() => {
            document.getElementById('loading-overlay').classList.add('hidden');
        }, 300);
    }, handleDashboardError));
}

function refresh() {
    setFilteredItems(getDashboardData());
    updateUI(getDashboardData());
    renderDashboardTable();
}

function destroy() {
    clearSubscription();
    resetPagination();
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
    renderDashboardTable();
}

function goToPage(page) {
    setCurrentPage(page);
    renderDashboardTable();
}

function nextPage() {
    const pagination = getDashboardPagination();
    const totalPages = Math.ceil(pagination.filteredItems.length / pagination.itemsPerPage);

    if (pagination.currentPage < totalPages) {
        setCurrentPage(pagination.currentPage + 1);
    }

    renderDashboardTable();
}

function previousPage() {
    const pagination = getDashboardPagination();

    if (pagination.currentPage > 1) {
        setCurrentPage(pagination.currentPage - 1);
    }

    renderDashboardTable();
}

function setChart(name, instance) {
    setChartInstance(name, instance);
}

function destroyCharts() {
    destroyChartInstances();
}

export {
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
