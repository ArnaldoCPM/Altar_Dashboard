import { getCurrentChapelId } from "./session.js";
import { canAccessAdminMode, canView } from "./permissions.js";

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
    chapelId: normalizeScopeValue(
      server?.chapelId ||
      server?.capela_id ||
      server?.capelaId
    )
  };
}

function canAccessServer(server) {
  if (!server) {
    return false;
  }

  if (canAccessAdminMode()) {
    return true;
  }

  if (!canView()) {
    return false;
  }

  const authorizedScope = getAuthorizedScope();
  const serverScope = getServerScope(server);

  if (!authorizedScope.chapelId) {
    return false;
  }

  return Boolean(
    authorizedScope.chapelId &&
    serverScope.chapelId &&
    authorizedScope.chapelId === serverScope.chapelId
  );
}

function filterAuthorizedServers(dataset) {
  if (!Array.isArray(dataset)) {
    return [];
  }

  if (canAccessAdminMode()) {
    return dataset;
  }

  if (!canView()) {
    return [];
  }

  return dataset.filter(canAccessServer);
}

export {
  filterAuthorizedServers,
  canAccessServer
};
