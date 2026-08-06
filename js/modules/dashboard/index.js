import { configure, destroy as destroyController, getData, loadData, refresh as refreshController } from "./controller.js";

function initialize(options) {
    configure(options);
    return loadData(options?.chapels);
}

function refresh() {
    refreshController();
}

function destroy() {
    destroyController();
}

export { initialize, refresh, destroy, getData };
