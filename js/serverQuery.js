import { collection } from "./firebase.js";

const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";

function buildServersQuery(db) {
  return collection(
    db,
    "artifacts",
    appId,
    "public",
    "data",
    "servers"
  );
}

export {
  buildServersQuery
};
