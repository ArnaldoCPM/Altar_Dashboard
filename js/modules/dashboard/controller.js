import { db } from "../../firebase.js";
import { getActiveChapels } from "../../data/chapels.js";
import { subscribeToDashboardData } from "./services/dashboard.service.js";
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

let renderDashboard = null;
let populateDashboardFilters = null;
let handleDashboardError = null;

function configure(options = {}) {
    renderDashboard = options.render;
    populateDashboardFilters = options.populateFilters;
    handleDashboardError = options.onError;
}

async function loadData(chapels) {
    const activeChapels = chapels || await getActiveChapels();

    clearSubscription();
    setUnsubscribe(subscribeToDashboardData(db, async (data) => {
        setData(data);
        setFilteredItems(data);
        await populateDashboardFilters?.(activeChapels, getDashboardData());
        renderDashboard?.(getDashboardData());
        document.getElementById('loading-overlay').classList.add('opacity-0');
        setTimeout(() => {
            document.getElementById('loading-overlay').classList.add('hidden');
        }, 300);
    }, (error) => handleDashboardError?.(error)));
}

function refresh() {
    setFilteredItems(getDashboardData());
    renderDashboard?.(getDashboardData());
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
    return getPagination().filteredItems;
}

function goToPage(page) {
    setCurrentPage(page);
    return getPagination().filteredItems;
}

function nextPage() {
    const pagination = getDashboardPagination();
    const totalPages = Math.ceil(pagination.filteredItems.length / pagination.itemsPerPage);

    if (pagination.currentPage < totalPages) {
        setCurrentPage(pagination.currentPage + 1);
    }

    return getPagination().filteredItems;
}

function previousPage() {
    const pagination = getDashboardPagination();

    if (pagination.currentPage > 1) {
        setCurrentPage(pagination.currentPage - 1);
    }

    return getPagination().filteredItems;
}

function setChart(name, instance) {
    setChartInstance(name, instance);
}

function destroyCharts() {
    destroyChartInstances();
}

export {
    configure,
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
