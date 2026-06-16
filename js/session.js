let currentUser = null;
let currentRole = null;
let currentChapelId = null;

function setCurrentUser(user) {
  currentUser = user;
}

function getCurrentUser() {
  return currentUser;
}

function setCurrentRole(role) {
  currentRole = role;
}

function getCurrentRole() {
  return currentRole;
}

function setCurrentChapelId(chapelId) {
  currentChapelId = chapelId;
}

function getCurrentChapelId() {
  return currentChapelId;
}

function clearSession() {
  currentUser = null;
  currentRole = null;
  currentChapelId = null;
}

export {
  setCurrentUser,
  getCurrentUser,
  setCurrentRole,
  getCurrentRole,
  setCurrentChapelId,
  getCurrentChapelId,
  clearSession
};
