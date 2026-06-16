const ROLES = {
  ADMIN: "admin",
  COORDINATOR: "coordinator",
  VIEWER: "viewer"
};

function isAdmin(role) {
  return role === ROLES.ADMIN;
}

function isCoordinator(role) {
  return role === ROLES.COORDINATOR;
}

function isViewer(role) {
  return role === ROLES.VIEWER;
}

function canCreateServer(role) {
  return isAdmin(role) || isCoordinator(role);
}

function canEditServer(role) {
  return isAdmin(role) || isCoordinator(role);
}

function canDeleteServer(role) {
  return isAdmin(role) || isCoordinator(role);
}

function canManageUsers(role) {
  return isAdmin(role);
}

export {
  ROLES,
  isAdmin,
  isCoordinator,
  isViewer,
  canCreateServer,
  canEditServer,
  canDeleteServer,
  canManageUsers
};
