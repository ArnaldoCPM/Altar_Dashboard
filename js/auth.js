import { auth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "./firebase.js";

const initAuth = async (onError) => {
    try {
        return auth;
    } catch (err) {
        if (typeof onError === 'function') {
            onError(err);
        } else {
            console.error('Firebase auth initialization failed:', err);
        }
    }
};

const setupAuthStateListener = (callback) => {
    onAuthStateChanged(auth, callback);
};

const loginWithEmailPassword = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
};

async function performLogout(onError) {
    try {
        await signOut(auth);
    } catch (err) {
        if (typeof onError === 'function') {
            onError(err);
        } else {
            console.error('Firebase logout failed:', err);
        }
    }
}

export {
    initAuth,
    setupAuthStateListener,
    loginWithEmailPassword,
    performLogout
};
