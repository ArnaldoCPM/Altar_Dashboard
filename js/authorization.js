import { getCurrentChapelId, getCurrentProfile } from "./session.js";
import { canAccessAdminMode, canView } from "./permissions.js";

function normalizeScopeValue(value) {
  return (value || "").toString().trim().toLowerCase();
}

function getAuthorizedScope() {
  const profile = getCurrentProfile() || {};

  return {
    chapelId: normalizeScopeValue(profile.chapelId || getCurrentChapelId()),
    chapelName: normalizeScopeValue(
      profile.chapelName ||
      profile.capelaName ||
      profile.chapel ||
      profile.capela
    )
  };
}

function getServerScope(server) {
  return {
    chapelId: normalizeScopeValue(
      server?.chapelId ||
      server?.capela_id ||
      server?.capelaId
    ),
    chapelName: normalizeScopeValue(
      server?.Capela ||
      server?.capela ||
      server?.chapelName
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

  if (!authorizedScope.chapelId && !authorizedScope.chapelName) {
    return false;
  }

  const matchesChapelId =
    authorizedScope.chapelId &&
    serverScope.chapelId &&
    authorizedScope.chapelId === serverScope.chapelId;

  const matchesChapelName =
    authorizedScope.chapelName &&
    serverScope.chapelName &&
    authorizedScope.chapelName === serverScope.chapelName;

  return Boolean(matchesChapelId || matchesChapelName);
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
