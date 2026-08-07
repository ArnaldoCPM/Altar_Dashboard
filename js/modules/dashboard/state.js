const dashboardState = {
    data: { dataset: [] },
    filters: { active: {} },
    pagination: { currentPage: 1, filteredItems: [], itemsPerPage: 12 },
    charts: { instances: {} },
    ui: { loading: true },
    subscriptions: { unsubscribe: null }
};

function setData(data) {
    dashboardState.data.dataset = data;
}

function getData() {
    return dashboardState.data.dataset;
}

function setUnsubscribe(unsubscribe) {
    dashboardState.subscriptions.unsubscribe = unsubscribe;
}

function clearSubscription() {
    dashboardState.subscriptions.unsubscribe?.();
    dashboardState.subscriptions.unsubscribe = null;
}

function resetPagination() {
    dashboardState.pagination.currentPage = 1;
    dashboardState.pagination.filteredItems = [];
}

function setFilteredItems(items, resetCurrentPage = false) {
    dashboardState.pagination.filteredItems = items;
    if (resetCurrentPage) {
        dashboardState.pagination.currentPage = 1;
    }
}

function setCurrentPage(page) {
    dashboardState.pagination.currentPage = page;
}

function getPagination() {
    return dashboardState.pagination;
}

function setChartInstance(name, instance) {
    dashboardState.charts.instances[name] = instance;
}

function destroyChartInstances() {
    Object.values(dashboardState.charts.instances).forEach((instance) => instance?.destroy());
}

export {
    clearSubscription,
    destroyChartInstances,
    getData,
    getPagination,
    resetPagination,
    setChartInstance,
    setCurrentPage,
    setData,
    setFilteredItems,
    setUnsubscribe
};
