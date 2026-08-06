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

export { dashboardState, clearSubscription, getData, resetPagination, setData, setUnsubscribe };
