import { getCurrentChapelId } from "./session.js";
import {
  canAccessAdminMode,
  canDelete as canDeleteByRole,
  canEdit as canEditByRole,
  canView
} from "./permissions.js";

function normalizeScopeValue(value) {
  return (value || "").toString().trim().toLowerCase();
}

function getAuthorizedScope() {
  return {
    chapelId: normalizeScopeValue(getCurrentChapelId())
  };
}

function getServerScope(server) {
  return {
    chapelId: normalizeScopeValue(server?.chapelId)
  };
}

function belongsToCurrentChapel(server) {
  const authorizedScope = getAuthorizedScope();
  const serverScope = getServerScope(server);

  return Boolean(
    authorizedScope.chapelId &&
    serverScope.chapelId &&
    authorizedScope.chapelId === serverScope.chapelId
  );
}

/**
 * Todos los perfiles con permiso de lectura pueden consultar cualquier
 * servidor de la parroquia. El ámbito de capilla solo limita escrituras.
 */
function canAccessServer(server) {
  return Boolean(server) && canView();
}

function canEdit(server) {
  if (!server || !canEditByRole()) {
    return false;
  }

  if (canAccessAdminMode()) {
    return true;
  }

  return belongsToCurrentChapel(server);
}

function canDelete(server) {
  return Boolean(server) && canDeleteByRole() && canAccessAdminMode();
}

function canCreateServer(chapelId) {
  if (!canEditByRole()) {
    return false;
  }

  return canAccessAdminMode()
    || normalizeScopeValue(chapelId) === getAuthorizedScope().chapelId;
}

function canChangeChapel(server, nextChapelId) {
  if (!canEdit(server)) {
    return false;
  }

  return canAccessAdminMode()
    || normalizeScopeValue(nextChapelId) === getServerScope(server).chapelId;
}

export {
  canAccessServer,
  canEdit,
  canDelete,
  canCreateServer,
  canChangeChapel
};
