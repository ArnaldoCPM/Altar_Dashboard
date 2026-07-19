import { collection } from "./firebase.js";
import { query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { canAccessAdminMode, getCurrentUserRole, ROLES } from "./permissions.js";
import { getCurrentChapelId } from "./session.js";

const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
const NO_ACCESS_CHAPEL_ID = "__no_authorized_chapel__";

function buildServersCollection(db) {
  return collection(db, "artifacts", appId, "public", "data", "servers");
}

function buildServersQuery(db) {
  const serversCollection = buildServersCollection(db);

  if (canAccessAdminMode()) {
    return serversCollection;
  }

  const currentRole = getCurrentUserRole();
  const currentChapelId = getCurrentChapelId() || NO_ACCESS_CHAPEL_ID;
  const isScopedRole =
    currentRole === ROLES.COORDINATOR ||
    currentRole === ROLES.VIEWER;

  if (isScopedRole) {
    return query(
      serversCollection,
      where("chapelId", "==", currentChapelId)
    );
  }

  return query(
    serversCollection,
    where("chapelId", "==", NO_ACCESS_CHAPEL_ID)
  );
}

export {
  buildServersQuery
};
