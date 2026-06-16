let currentUser = null;
let currentProfile = null;
let currentRole = null;
let currentChapelId = null;

function setCurrentUser(user) {
  currentUser = user;
}

function getCurrentUser() {
  return currentUser;
}

function setCurrentProfile(profile) {
  currentProfile = profile;
}

function getCurrentProfile() {
  return currentProfile;
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
  currentProfile = null;
  currentRole = null;
  currentChapelId = null;
}

export {
  setCurrentUser,
  getCurrentUser,
  setCurrentProfile,
  getCurrentProfile,
  setCurrentRole,
  getCurrentRole,
  setCurrentChapelId,
  getCurrentChapelId,
  clearSession
};
