const dashboardState = {
    data: [],
    charts: {},
    currentPage: 1,
    filteredItems: [],
    unsubscribe: null
};

function setData(data) {
    dashboardState.data = data;
}

function resetPagination() {
    dashboardState.currentPage = 1;
    dashboardState.filteredItems = [];
}

function setUnsubscribe(unsubscribe) {
    dashboardState.unsubscribe = unsubscribe;
}

function clearSubscription() {
    dashboardState.unsubscribe?.();
    dashboardState.unsubscribe = null;
}

export {
    dashboardState,
    setData,
    resetPagination,
    setUnsubscribe,
    clearSubscription
};
