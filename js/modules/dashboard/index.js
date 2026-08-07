import {
    applyFilters,
    destroy as destroyController,
    destroyCharts,
    getData,
    getPagination,
    goToPage as goToControllerPage,
    loadData,
    nextPage as nextControllerPage,
    previousPage as previousControllerPage,
    refresh as refreshController,
    setChart,
    updateFilteredItems
} from "./controller.js";

function initialize(options) {
    return loadData(options?.chapels);
}

function refresh() {
    refreshController();
}

function destroy() {
    destroyController();
}

function goToPage(page) {
    return goToControllerPage(page);
}

function nextPage() {
    return nextControllerPage();
}

function previousPage() {
    return previousControllerPage();
}

export {
    applyFilters,
    destroy,
    destroyCharts,
    getData,
    getPagination,
    goToPage,
    initialize,
    nextPage,
    previousPage,
    refresh,
    setChart,
    updateFilteredItems
};
