let currentUser = null;
let currentProfile = null;
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

function setCurrentChapelId(chapelId) {
  currentChapelId = chapelId;
}

function getCurrentChapelId() {
  return currentChapelId;
}

function clearSession() {
  currentUser = null;
  currentProfile = null;
  currentChapelId = null;
}

export {
  setCurrentUser,
  getCurrentUser,
  setCurrentProfile,
  getCurrentProfile,
  setCurrentChapelId,
  getCurrentChapelId,
  clearSession
};
