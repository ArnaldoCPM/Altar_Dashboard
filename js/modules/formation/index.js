import {
    destroy as destroyController,
    initialize as initializeController,
    refresh as refreshController
} from "./controller.js";

function initialize(options) {
    return initializeController(options);
}

function refresh() {
    return refreshController();
}

function destroy() {
    return destroyController();
}

export {
    destroy,
    initialize,
    refresh
};
