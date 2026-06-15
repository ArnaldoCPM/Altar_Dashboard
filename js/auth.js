import { auth, onAuthStateChanged, signInAnonymously, signInWithCustomToken, signInWithEmailAndPassword, signOut } from "./firebase.js";

const initAuth = async (onError) => {
    try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
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
