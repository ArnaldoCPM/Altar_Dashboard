import { db } from "../../firebase.js";
import { getActiveChapels } from "../../data/chapels.js";
import { subscribeToDashboardData } from "./services/dashboard.service.js";
import { clearSubscription, dashboardState, resetPagination, setData, setUnsubscribe } from "./state.js";

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
        await populateDashboardFilters?.(activeChapels, dashboardState.data);
        renderDashboard?.(dashboardState.data);
        document.getElementById('loading-overlay').classList.add('opacity-0');
        setTimeout(() => {
            document.getElementById('loading-overlay').classList.add('hidden');
        }, 300);
    }, (error) => handleDashboardError?.(error)));
}

function refresh() {
    renderDashboard?.(dashboardState.data);
}

function destroy() {
    clearSubscription();
    resetPagination();
}

function getData() {
    return dashboardState.data;
}

export { configure, loadData, refresh, destroy, getData };
