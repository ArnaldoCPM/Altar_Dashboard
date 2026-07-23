const ROLES = {
  GUEST: "guest",
  VIEWER: "viewer",
  COORDINATOR: "coordinator",
  ADMIN: "admin"
};

const ROLE_CAPABILITIES = {
  [ROLES.GUEST]: {
    view: false,
    edit: false,
    delete: false,
    export: false,
    manageUsers: false
  },
  [ROLES.VIEWER]: {
    view: true,
    edit: false,
    delete: false,
    export: false,
    manageUsers: false
  },
  [ROLES.COORDINATOR]: {
    view: true,
    edit: true,
    delete: false,
    export: false,
    manageUsers: false
  },
  [ROLES.ADMIN]: {
    view: true,
    edit: true,
    delete: true,
    export: true,
    manageUsers: true
  }
};

let currentUserRole = ROLES.GUEST;

function normalizeRole(role) {
  if (!role || typeof role !== "string") {
    return ROLES.GUEST;
  }

  return Object.values(ROLES).includes(role) ? role : ROLES.GUEST;
}

function setCurrentUserRole(role) {
  currentUserRole = normalizeRole(role);
  return currentUserRole;
}

function getCurrentUserRole() {
  return currentUserRole;
}

function getRoleCapabilities(role = currentUserRole) {
  const normalizedRole = normalizeRole(role);
  return ROLE_CAPABILITIES[normalizedRole];
}

function hasCapability(capability, role = currentUserRole) {
  return Boolean(getRoleCapabilities(role)?.[capability]);
}

function canView(role = currentUserRole) {
  return hasCapability("view", role);
}

function canEdit(role = currentUserRole) {
  return hasCapability("edit", role);
}

function canDelete(role = currentUserRole) {
  return hasCapability("delete", role);
}

function canExport(role = currentUserRole) {
  return hasCapability("export", role);
}

function canManageUsers(role = currentUserRole) {
  return hasCapability("manageUsers", role);
}

function isAdmin(role = currentUserRole) {
  return normalizeRole(role) === ROLES.ADMIN;
}

function canAccessAdminMode(role = currentUserRole) {
  return isAdmin(role);
}

function isCoordinator(role = currentUserRole) {
  return normalizeRole(role) === ROLES.COORDINATOR;
}

function isViewer(role = currentUserRole) {
  return normalizeRole(role) === ROLES.VIEWER;
}

function resetPermissions() {
  currentUserRole = ROLES.GUEST;
}

export {
  ROLES,
  currentUserRole,
  setCurrentUserRole,
  getCurrentUserRole,
  getRoleCapabilities,
  canView,
  canEdit,
  canDelete,
  canExport,
  canManageUsers,
  canAccessAdminMode,
  isAdmin,
  isCoordinator,
  isViewer,
  resetPermissions
};
